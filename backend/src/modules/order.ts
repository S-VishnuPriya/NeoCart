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

export const orderRouter = Router();

// Protect all order routes
orderRouter.use(authGuard());

// Helper: Get Customer ID
async function getCustomerId(userId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { userId },
  });
  if (!customer) {
    throw new AppError(404, 'Customer profile not found', 'CUSTOMER_NOT_FOUND');
  }
  return customer.id;
}

// Order Finite State Machine (FSM) Transition Map
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // Terminal State
  [OrderStatus.CANCELLED]: [], // Terminal State
};

function canTransition(current: OrderStatus, target: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

// Helper: Generate Order Number
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${year}-${randomDigits}`;
}

// Validation Schemas
const createOrderSchema = z.object({
  shippingAddressId: z.string().min(1, 'Shipping address ID is required'),
  billingAddressId: z.string().min(1, 'Billing address ID is required'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CREDIT_CARD),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(3, 'A valid cancellation reason is required'),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

// 1. POST /api/v1/orders (Place Order from Active Cart)
orderRouter.post(
  '/',
  validate(createOrderSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const { shippingAddressId, billingAddressId, paymentMethod } = req.body;

    // Verify Addresses
    const shippingAddress = await prisma.address.findFirst({
      where: { id: shippingAddressId, customerId },
    });
    const billingAddress = await prisma.address.findFirst({
      where: { id: billingAddressId, customerId },
    });

    if (!shippingAddress || !billingAddress) {
      throw new AppError(400, 'Invalid shipping or billing address selected', 'INVALID_ADDRESS');
    }

    // Get Active Cart with items
    const cart = await prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError(400, 'Your cart is empty. Cannot place an order.', 'EMPTY_CART');
    }

    // Validate Stock & Snapshot data from real Product catalog
    const snapshotItems: {
      productId: string;
      productName: string;
      productSku: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }[] = [];

    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        throw new AppError(400, `Product "${item.product?.name || item.productId}" is no longer available`, 'PRODUCT_UNAVAILABLE');
      }

      if (product.stock < item.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for "${product.name}". Available: ${product.stock}, in your cart: ${item.quantity}`,
          'INSUFFICIENT_STOCK'
        );
      }

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      snapshotItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice: Number(product.price),
        quantity: item.quantity,
        totalPrice: Number(itemTotal.toFixed(2)),
      });
    }

    const taxAmount = Number((subtotal * 0.08).toFixed(2));
    const shippingCost = subtotal >= 100 ? 0.0 : 10.0;
    const totalAmount = Number((subtotal + taxAmount + shippingCost).toFixed(2));

    // Place Order, deduct inventory, log inventory changes, create status history, and clear cart in a single ACID Transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Deduct Stock & Create Inventory Logs
      for (const item of cart.items) {
        const previousStock = item.product.stock;
        const newStock = previousStock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            changeAmount: -item.quantity,
            previousStock,
            newStock,
            reason: 'ORDER_RESERVE',
            performedByRole: req.user!.role,
          },
        });
      }

      // 2. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId,
          shippingAddressId,
          billingAddressId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          taxAmount,
          shippingCost,
          totalAmount,
          items: {
            create: snapshotItems,
          },
          statusHistory: {
            create: {
              previousStatus: OrderStatus.PENDING,
              newStatus: OrderStatus.PENDING,
              changedByRole: 'USER',
              notes: 'Order placed by customer',
            },
          },
        },
        include: {
          items: { include: { product: true } },
          shippingAddress: true,
          billingAddress: true,
          statusHistory: true,
        },
      });

      // 3. Clear user cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return sendResponse(res, 201, 'Order placed successfully', order);
  })
);

// 2. GET /api/v1/orders (List Orders)
orderRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.MANAGER;
    const statusFilter = req.query.status as OrderStatus | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    let customerId: string | undefined;
    if (!isStaff) {
      customerId = await getCustomerId(req.user!.id);
    }

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (statusFilter && Object.values(OrderStatus).includes(statusFilter)) {
      where.status = statusFilter;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          customer: {
            select: { firstName: true, lastName: true },
          },
          payments: {
            select: { transactionId: true, method: true, status: true },
          },
        },
        orderBy: { placedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return sendResponse(res, 200, 'Orders retrieved successfully', {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// 3. GET /api/v1/orders/:id (Get Order Details)
orderRouter.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.id;
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.MANAGER;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        shippingAddress: true,
        billingAddress: true,
        items: { include: { product: true } },
        payments: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!isStaff) {
      const customerId = await getCustomerId(req.user!.id);
      if (order.customerId !== customerId) {
        throw new AppError(403, 'You do not have permission to view this order', 'FORBIDDEN');
      }
    }

    return sendResponse(res, 200, 'Order details retrieved', order);
  })
);

// 4. POST /api/v1/orders/:id/cancel (Cancel Order with FSM Validation & Stock Restoration)
orderRouter.post(
  '/:id/cancel',
  validate(cancelOrderSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.id;
    const { reason } = req.body;
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.MANAGER;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!isStaff) {
      const customerId = await getCustomerId(req.user!.id);
      if (order.customerId !== customerId) {
        throw new AppError(403, 'You do not have permission to cancel this order', 'FORBIDDEN');
      }
    }

    // FSM Rule Check
    if (!canTransition(order.status, OrderStatus.CANCELLED)) {
      throw new AppError(
        400,
        `Cannot cancel an order in "${order.status}" status. Cancellations are only allowed during PENDING, CONFIRMED, or PROCESSING.`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Restore Inventory and update Order Status atomically
    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const previousStock = prod.stock;
          const newStock = previousStock + item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              changeAmount: item.quantity,
              previousStock,
              newStock,
              reason: 'ORDER_CANCEL_RESTORE',
              performedByRole: req.user!.role,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
          statusHistory: {
            create: {
              previousStatus: order.status,
              newStatus: OrderStatus.CANCELLED,
              changedByRole: req.user!.role,
              notes: `Cancelled. Reason: ${reason}`,
            },
          },
        },
        include: {
          statusHistory: true,
        },
      });
    });

    return sendResponse(res, 200, 'Order cancelled and stock restored successfully', updatedOrder);
  })
);

// 5. PATCH /api/v1/orders/:id/status (Advance Order Status — Staff only)
orderRouter.patch(
  '/:id/status',
  authGuard([Role.ADMIN, Role.MANAGER]),
  validate(updateStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.id;
    const { status: targetStatus, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!canTransition(order.status, targetStatus)) {
      throw new AppError(
        400,
        `Illegal status transition from "${order.status}" to "${targetStatus}".`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: targetStatus,
            changedByRole: req.user!.role,
            notes: notes || `Advanced status to ${targetStatus}`,
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return sendResponse(res, 200, `Order status advanced to ${targetStatus}`, updatedOrder);
  })
);

// 6. GET /api/v1/orders/:id/timeline (Order Status Audit History)
orderRouter.get(
  '/:id/timeline',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.id;
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.MANAGER;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        status: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!isStaff) {
      const customerId = await getCustomerId(req.user!.id);
      if (order.customerId !== customerId) {
        throw new AppError(403, 'Unauthorized to view this timeline', 'FORBIDDEN');
      }
    }

    return sendResponse(res, 200, 'Order timeline retrieved', order);
  })
);
