import { Router, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../db.js';
import {
  AppError,
  asyncHandler,
  authGuard,
  AuthenticatedRequest,
  sendResponse,
  validate,
} from '../middleware.js';

export const inventoryRouter = Router();

// Restrict all inventory management endpoints to Staff/Admin
inventoryRouter.use(authGuard([Role.ADMIN, Role.MANAGER]));

const adjustStockSchema = z.object({
  changeAmount: z.number().int().refine((val) => val !== 0, 'Change amount cannot be zero'),
  reason: z.string().min(3, 'A valid reason for inventory adjustment is required'),
});

// 1. GET /api/v1/inventory (List inventory levels across all products)
inventoryRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        price: true,
        isActive: true,
        category: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });

    const formatted = products.map((p) => ({
      ...p,
      price: Number(p.price),
      isLowStock: p.stock <= p.lowStockThreshold,
    }));

    return sendResponse(res, 200, 'Inventory levels retrieved', formatted);
  })
);

// 2. GET /api/v1/inventory/low-stock (Low Stock Alert Monitor)
inventoryRouter.get(
  '/low-stock',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        price: true,
        category: { select: { name: true } },
      },
    });

    const lowStockItems = products
      .filter((p) => p.stock <= p.lowStockThreshold)
      .map((p) => ({
        ...p,
        price: Number(p.price),
        deficit: p.lowStockThreshold - p.stock,
      }));

    return sendResponse(res, 200, 'Low-stock alerts retrieved', {
      count: lowStockItems.length,
      items: lowStockItems,
    });
  })
);

// 3. PATCH /api/v1/inventory/:productId/adjust (Manual Stock Adjustment & Logging)
inventoryRouter.patch(
  '/:productId/adjust',
  validate(adjustStockSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const { changeAmount, reason } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const previousStock = product.stock;
    const newStock = previousStock + changeAmount;

    if (newStock < 0) {
      throw new AppError(
        400,
        `Cannot reduce stock by ${Math.abs(changeAmount)}. Current stock is only ${previousStock}.`,
        'INSUFFICIENT_STOCK'
      );
    }

    const [updatedProduct, log] = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      const invLog = await tx.inventoryLog.create({
        data: {
          productId,
          changeAmount,
          previousStock,
          newStock,
          reason,
          performedByRole: req.user!.role,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'STOCK_ADJUST',
          resource: 'INVENTORY',
          resourceId: productId,
          details: `Stock changed from ${previousStock} to ${newStock} (${changeAmount > 0 ? '+' : ''}${changeAmount}). Reason: ${reason}`,
        },
      });

      return [prod, invLog];
    });

    return sendResponse(res, 200, 'Inventory adjusted successfully', {
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        previousStock,
        newStock: updatedProduct.stock,
        isLowStock: updatedProduct.stock <= updatedProduct.lowStockThreshold,
      },
      log,
    });
  })
);

// 4. GET /api/v1/inventory/:productId/logs (Audit history of stock movements)
inventoryRouter.get(
  '/:productId/logs',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const logs = await prisma.inventoryLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, 'Inventory logs retrieved', {
      product,
      logs,
    });
  })
);
