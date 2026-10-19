import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError, ZodSchema } from 'zod';
import { Role } from '@prisma/client';

// 1. Custom Application Error Class
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(statusCode: number, message: string, errorCode: string = 'ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 2. Standardized JSON Response Helper
export function sendResponse<T>(res: Response, statusCode: number, message: string, data?: T) {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    ...(data !== undefined ? { data } : {}),
  });
}

// 3. Async Handler Wrapper to eliminate try/catch boilerplate in routes
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// 4. Extended Express Request Interface with User info
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  customerId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// 5. JWT Auth Guard Middleware (Optional Role Authorization)
export const authGuard = (allowedRoles?: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'Authentication token missing or invalid', 'UNAUTHORIZED');
      }

      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_ACCESS_SECRET || 'neocart_super_secret_access_key_2026';

      const decoded = jwt.verify(token, secret) as AuthUser;
      req.user = decoded;

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        throw new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN');
      }

      next();
    } catch (error: any) {
      if (error instanceof AppError) {
        return next(error);
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError(401, 'Access token has expired', 'TOKEN_EXPIRED'));
      }
      return next(new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN'));
    }
  };
};

// 6. Request Body / Query Validation Middleware using Zod
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new AppError(400, 'Validation failed for request data', 'VALIDATION_ERROR', errorMessages));
      }
      next(error);
    }
  };
};

// 7. Global Centralized Error Handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred';

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('[Unhandled Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
};
