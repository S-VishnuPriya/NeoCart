import { Router, Request, Response } from 'express';
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

export const reviewRouter = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5 stars'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  comment: z.string().min(5, 'Comment must be at least 5 characters'),
});

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

// 1. GET /api/v1/reviews/product/:productId (List reviews & rating stats)
reviewRouter.get(
  '/product/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const [reviews, product] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
      }),
    ]);

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return sendResponse(res, 200, 'Product reviews retrieved', {
      product,
      stats: {
        totalReviews,
        averageRating,
        distribution,
      },
      reviews,
    });
  })
);

// 2. POST /api/v1/reviews/product/:productId (Submit Review with Verified Buyer Check)
reviewRouter.post(
  '/product/:productId',
  authGuard(),
  validate(createReviewSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const customerId = await getCustomerId(req.user!.id);
    const { rating, title, comment } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    // Check existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_customerId: {
          productId,
          customerId,
        },
      },
    });

    if (existingReview) {
      throw new AppError(400, 'You have already reviewed this product', 'DUPLICATE_REVIEW');
    }

    // Verified Buyer Check: Has the customer purchased this product in a DELIVERED order?
    const deliveredOrderWithProduct = await prisma.order.findFirst({
      where: {
        customerId,
        status: OrderStatus.DELIVERED,
        items: {
          some: {
            productId,
          },
        },
      },
    });

    const isVerifiedPurchase = Boolean(deliveredOrderWithProduct);

    const review = await prisma.review.create({
      data: {
        productId,
        customerId,
        rating,
        title,
        comment,
        isVerifiedPurchase,
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    return sendResponse(res, 201, 'Review submitted successfully', review);
  })
);

// 3. DELETE /api/v1/reviews/:id (Delete review - Author or Admin)
reviewRouter.delete(
  '/:id',
  authGuard(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!review) {
      throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.MANAGER;
    const isAuthor = review.customer.userId === req.user!.id;

    if (!isStaff && !isAuthor) {
      throw new AppError(403, 'Unauthorized to delete this review', 'FORBIDDEN');
    }

    await prisma.review.delete({ where: { id } });

    return sendResponse(res, 200, 'Review deleted successfully');
  })
);
