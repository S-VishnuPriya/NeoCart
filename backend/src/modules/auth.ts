import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  AppError,
  asyncHandler,
  authGuard,
  AuthenticatedRequest,
  sendResponse,
  validate,
} from '../middleware.js';

export const authRouter = Router();

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Helper: Hash a string using SHA-256 (for refresh tokens stored in DB)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: Generate Access and Refresh Tokens
function generateTokens(payload: { id: string; email: string; role: any }) {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'neocart_super_secret_access_key_2026';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'neocart_super_secret_refresh_key_2026';

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
  });

  const refreshToken = jwt.sign({ id: payload.id }, refreshSecret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });

  return { accessToken, refreshToken };
}

// Helper: Set Refresh Token Cookie
function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

// 1. POST /api/v1/auth/register
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User and Customer profile atomically
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        customer: {
          create: {
            firstName,
            lastName,
            phone,
          },
        },
      },
      include: {
        customer: true,
      },
    });

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store hashed refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshTokenCookie(res, refreshToken);

    return sendResponse(res, 201, 'Customer registered successfully', {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customer: user.customer,
      },
    });
  })
);

// 2. POST /api/v1/auth/login
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { customer: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store hashed refresh token in DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshTokenCookie(res, refreshToken);

    return sendResponse(res, 200, 'Login successful', {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customer: user.customer,
      },
    });
  })
);

// 3. POST /api/v1/auth/refresh (Token Rotation)
authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      throw new AppError(401, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'neocart_super_secret_refresh_key_2026';
    let decoded: any;
    try {
      decoded = jwt.verify(rawToken, refreshSecret);
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token has been revoked or expired', 'TOKEN_REVOKED');
    }

    // Revoke old token (Token Rotation Security)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const user = tokenRecord.user;
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store newly rotated refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshTokenCookie(res, newRefreshToken);

    return sendResponse(res, 200, 'Token refreshed successfully', {
      accessToken,
    });
  })
);

// 4. POST /api/v1/auth/logout
authRouter.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(rawToken) },
        data: { isRevoked: true },
      });
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return sendResponse(res, 200, 'Logged out successfully');
  })
);

// 5. GET /api/v1/auth/me
authRouter.get(
  '/me',
  authGuard(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        customer: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return sendResponse(res, 200, 'Authenticated user details retrieved', {
      id: user.id,
      email: user.email,
      role: user.role,
      customer: user.customer,
    });
  })
);
