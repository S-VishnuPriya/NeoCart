import { Router, Response } from 'express';
import { z } from 'zod';
import { OrderStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import {
  AppError,
  asyncHandler,
  authGuard,
  AuthenticatedRequest,
  sendResponse,
  validate,
} from '../middleware.js';

export const paymentRouter = Router();

const checkoutSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CREDIT_CARD),
  cardDetails: z
    .object({
      cardNumber: z.string().min(16).max(19).optional(),
      expiry: z.string().optional(),
      cvv: z.string().min(3).max(4).optional(),
    })
    .optional(),
  upiId: z.string().optional(),
});

// 1. POST /api/v1/payments/checkout (Initiate & Process Payment for an Order)
paymentRouter.post(
  '/checkout',
  authGuard(),
  validate(checkoutSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId, paymentMethod } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError(400, 'Cannot pay for a cancelled order', 'ORDER_CANCELLED');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppError(400, 'This order has already been paid for', 'ALREADY_PAID');
    }

    // Verify ownership if not staff
    if (req.user!.role === Role.CUSTOMER && order.customer.userId !== req.user!.id) {
      throw new AppError(403, 'Unauthorized to pay for this order', 'FORBIDDEN');
    }

    // Generate unique transaction reference
    const transactionId = `TXN-NC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Process Payment Transaction atomically
    const [payment, updatedOrder] = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          transactionId,
          amount: order.totalAmount,
          currency: 'USD',
          method: paymentMethod,
          status: PaymentStatus.PAID,
          gatewayResponse: JSON.stringify({
            status: 'COMPLETED',
            processor: 'NeoCart Simulated Gateway',
            capturedAt: new Date().toISOString(),
            method: paymentMethod,
          }),
        },
      });

      const updOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
          statusHistory: {
            create: {
              previousStatus: order.status,
              newStatus: order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
              changedByRole: 'SYSTEM',
              notes: `Payment verified (${paymentMethod}) — Transaction: ${transactionId}`,
            },
          },
        },
        include: {
          payments: true,
          statusHistory: true,
        },
      });

      return [createdPayment, updOrder];
    });

    return sendResponse(res, 200, 'Payment processed successfully', {
      transactionId: payment.transactionId,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });
  })
);

// 2. GET /api/v1/payments/order/:orderId (Get payment info for an order)
paymentRouter.get(
  '/order/:orderId',
  authGuard(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (req.user!.role === Role.CUSTOMER && order.customer.userId !== req.user!.id) {
      throw new AppError(403, 'Unauthorized to view payment details', 'FORBIDDEN');
    }

    return sendResponse(res, 200, 'Payment records retrieved', order.payments);
  })
);
