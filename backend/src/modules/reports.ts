import { Router, Response } from 'express';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';
import {
  asyncHandler,
  authGuard,
  AuthenticatedRequest,
  sendResponse,
} from '../middleware.js';

export const reportsRouter = Router();

// Protect all report routes — Staff/Admin only
reportsRouter.use(authGuard([Role.ADMIN, Role.MANAGER]));

// 1. GET /api/v1/reports/sales-summary
reportsRouter.get(
  '/sales-summary',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orders = await prisma.order.findMany({
      select: {
        totalAmount: true,
        status: true,
        placedAt: true,
      },
    });

    const nonCancelledOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);

    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrderCount = orders.length;
    const averageOrderValue = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;

    return sendResponse(res, 200, 'Sales summary report generated', {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      deliveredRevenue: Number(deliveredRevenue.toFixed(2)),
      totalOrders: totalOrderCount,
      activeOrders: nonCancelledOrders.length,
      cancelledOrders: totalOrderCount - nonCancelledOrders.length,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      generatedAt: new Date().toISOString(),
    });
  })
);

// 2. GET /api/v1/reports/orders-by-status
reportsRouter.get(
  '/orders-by-status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    const formatted = statusCounts.map((item) => ({
      status: item.status,
      orderCount: item._count.id,
      totalAmount: Number((item._sum.totalAmount || 0).toFixed(2)),
    }));

    return sendResponse(res, 200, 'Orders by status distribution', formatted);
  })
);

// 3. GET /api/v1/reports/customer-metrics
reportsRouter.get(
  '/customer-metrics',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const totalCustomers = await prisma.customer.count();

    // Customers with placed orders
    const customersWithOrders = await prisma.customer.findMany({
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    const activeCustomers = customersWithOrders.filter((c) => c.orders.length > 0);
    const repeatCustomers = customersWithOrders.filter((c) => c.orders.length >= 2);

    // Top 5 Customers by Total Spend
    const customerSpendList = activeCustomers.map((c) => {
      const validOrders = c.orders.filter((o) => o.status !== OrderStatus.CANCELLED);
      const totalSpend = validOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      return {
        customerId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        ordersCount: validOrders.length,
        totalSpend: Number(totalSpend.toFixed(2)),
      };
    });

    customerSpendList.sort((a, b) => b.totalSpend - a.totalSpend);

    return sendResponse(res, 200, 'Customer purchasing metrics generated', {
      totalRegisteredCustomers: totalCustomers,
      activePurchasers: activeCustomers.length,
      repeatPurchasers: repeatCustomers.length,
      repeatRatePercentage:
        activeCustomers.length > 0
          ? Number(((repeatCustomers.length / activeCustomers.length) * 100).toFixed(1))
          : 0,
      topCustomers: customerSpendList.slice(0, 5),
    });
  })
);

// 4. GET /api/v1/reports/export-csv
reportsRouter.get(
  '/export-csv',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: true,
      },
      orderBy: { placedAt: 'desc' },
    });

    // Generate CSV Header & Rows
    const headers = [
      'Order Number',
      'Placed Date',
      'Customer Name',
      'Status',
      'Payment Status',
      'Total Items',
      'Subtotal',
      'Tax',
      'Shipping',
      'Total Amount',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      o.placedAt.toISOString().split('T')[0],
      `"${o.customer.firstName} ${o.customer.lastName}"`,
      o.status,
      o.paymentStatus,
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      Number(o.subtotal).toFixed(2),
      Number(o.taxAmount).toFixed(2),
      Number(o.shippingCost).toFixed(2),
      Number(o.totalAmount).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="neocart_sales_report_${new Date().toISOString().split('T')[0]}.csv"`
    );

    return res.status(200).send(csvContent);
  })
);
