import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth.js';
import { customerRouter } from './modules/customer.js';
import { cartRouter } from './modules/cart.js';
import { orderRouter } from './modules/order.js';
import { reportsRouter } from './modules/reports.js';
import { productRouter } from './modules/product.js';
import { inventoryRouter } from './modules/inventory.js';
import { paymentRouter } from './modules/payment.js';
import { adminRouter } from './modules/admin.js';
import { reviewRouter } from './modules/review.js';
import { errorHandler, sendResponse, AppError } from './middleware.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Core Security & Parsing Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-session-id'],
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // 2. Health Check Endpoint
  app.get('/health', (req: Request, res: Response) => {
    return sendResponse(res, 200, 'NeoCart Unified Backend (Dev A + Dev B) is healthy', {
      service: 'NeoCart Full-Stack REST API',
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      activeModules: [
        'Auth & JWT',
        'Customer Management',
        'Cart Management',
        'Orders & Workflow',
        'Reports & Analytics',
        'Product Catalog & Categories',
        'Inventory & Stock Tracking',
        'Payment & Checkout',
        'Admin RBAC & Audit Logging',
        'Feedback & Reviews',
      ],
    });
  });

  // 3. Mount Integrated Feature Modules
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/customers', customerRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/reviews', reviewRouter);

  // 4. Catch Unmatched Routes (404)
  app.use((req: Request, res: Response, next) => {
    next(new AppError(404, `Endpoint ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
  });

  // 5. Global Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
