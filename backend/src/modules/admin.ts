import { Router, Response } from 'express';
import { z } from 'zod';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import {
  AppError,
  asyncHandler,
  authGuard,
  AuthenticatedRequest,
  sendResponse,
  validate,
} from '../middleware.js';

export const adminRouter = Router();

// Protect all admin endpoints with strict ADMIN / MANAGER guard
adminRouter.use(authGuard([Role.ADMIN, Role.MANAGER]));

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

// 1. GET /api/v1/admin/overview (High-Level Store KPI Dashboard)
adminRouter.get(
  '/overview',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const [
      totalUsers,
      totalCustomers,
      totalProducts,
      orders,
      lowStockProducts,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.findMany({
        select: {
          totalAmount: true,
          status: true,
          placedAt: true,
        },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, lowStockThreshold: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, role: true } } },
      }),
    ]);

    const lowStockCount = lowStockProducts.filter((p) => p.stock <= p.lowStockThreshold).length;
    const nonCancelled = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const totalRevenue = nonCancelled.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const pendingOrdersCount = orders.filter((o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.CONFIRMED).length;

    return sendResponse(res, 200, 'Admin overview metrics retrieved', {
      kpis: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders: orders.length,
        pendingOrders: pendingOrdersCount,
        totalCustomers,
        totalProducts,
        lowStockAlerts: lowStockCount,
      },
      recentActivity: recentAuditLogs,
    });
  })
);

// 2. GET /api/v1/admin/users (List users and assigned roles)
adminRouter.get(
  '/users',
  authGuard([Role.ADMIN]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const roleFilter = req.query.role as Role | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (roleFilter && Object.values(Role).includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            _count: { select: { orders: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, 'User directory retrieved', users);
  })
);

// 3. PATCH /api/v1/admin/users/:id/role (RBAC: Change User Role - Super Admin only)
adminRouter.patch(
  '/users/:id/role',
  authGuard([Role.ADMIN]),
  validate(updateRoleSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (targetUser.id === req.user!.id && role !== Role.ADMIN) {
      throw new AppError(400, 'You cannot remove your own Administrator role', 'CANNOT_DEMOTE_SELF');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ROLE_CHANGE',
        resource: 'USER',
        resourceId: id,
        details: `Changed role of user ${targetUser.email} from ${targetUser.role} to ${role}`,
      },
    });

    return sendResponse(res, 200, `User role updated to ${role}`, updated);
  })
);

// 4. PATCH /api/v1/admin/users/:id/status (Deactivate or Activate User Account)
adminRouter.patch(
  '/users/:id/status',
  authGuard([Role.ADMIN]),
  validate(updateStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user!.id) {
      throw new AppError(400, 'You cannot deactivate your own account', 'CANNOT_DEACTIVATE_SELF');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_STATUS_CHANGE',
        resource: 'USER',
        resourceId: id,
        details: `${isActive ? 'Activated' : 'Deactivated'} account for ${updated.email}`,
      },
    });

    return sendResponse(res, 200, `User account ${isActive ? 'activated' : 'deactivated'}`, updated);
  })
);

// 5. GET /api/v1/admin/audit-logs (View System Audit Trail)
adminRouter.get(
  '/audit-logs',
  authGuard([Role.ADMIN]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const action = req.query.action as string | undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

    const where: any = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return sendResponse(res, 200, 'Audit logs retrieved', logs);
  })
);
