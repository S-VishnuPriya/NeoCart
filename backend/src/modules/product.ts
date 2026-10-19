import { Router, Request, Response } from 'express';
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

export const productRouter = Router();

// Validation Schemas
const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  price: z.number().positive('Price must be greater than 0'),
  sku: z.string().min(2, 'SKU is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(1).default(5),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
  isActive: z.boolean().optional().default(true),
});

const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
});

// Helper: Slugify string
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// 1. GET /api/v1/products/categories (List all categories)
productRouter.get(
  '/categories',
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return sendResponse(res, 200, 'Categories retrieved', categories);
  })
);

// 2. POST /api/v1/products/categories (Create category - Staff only)
productRouter.post(
  '/categories',
  authGuard([Role.ADMIN, Role.MANAGER]),
  validate(categorySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description } = req.body;
    const slug = slugify(name);

    const existing = await prisma.category.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new AppError(409, 'Category with this name already exists', 'CATEGORY_EXISTS');
    }

    const category = await prisma.category.create({
      data: { name, slug, description },
    });

    return sendResponse(res, 201, 'Category created successfully', category);
  })
);

// 3. GET /api/v1/products (List products with search, category, min/max price, sorting, pagination)
productRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const categorySlug = req.query.category as string | undefined;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          reviews: {
            select: { rating: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map((p) => {
      const avgRating =
        p.reviews.length > 0
          ? Number((p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length).toFixed(1))
          : 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        sku: p.sku,
        stock: p.stock,
        isLowStock: p.stock <= p.lowStockThreshold,
        imageUrl: p.imageUrl,
        category: p.category,
        rating: {
          average: avgRating,
          reviewCount: p.reviews.length,
        },
        createdAt: p.createdAt,
      };
    });

    return sendResponse(res, 200, 'Products retrieved successfully', {
      products: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// 4. GET /api/v1/products/:id (Get single product by ID or Slug)
productRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: true,
        reviews: {
          include: {
            customer: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const avgRating =
      product.reviews.length > 0
        ? Number((product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1))
        : 0;

    return sendResponse(res, 200, 'Product details retrieved', {
      ...product,
      price: Number(product.price),
      isLowStock: product.stock <= product.lowStockThreshold,
      rating: {
        average: avgRating,
        reviewCount: product.reviews.length,
      },
    });
  })
);

// 5. POST /api/v1/products (Create product - Staff only)
productRouter.post(
  '/',
  authGuard([Role.ADMIN, Role.MANAGER]),
  validate(productSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = req.body;
    const slug = slugify(data.name) + '-' + Math.floor(1000 + Math.random() * 9000);

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new AppError(409, 'A product with this SKU already exists', 'SKU_EXISTS');
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          price: data.price,
          sku: data.sku,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          imageUrl: data.imageUrl,
          categoryId: data.categoryId,
          isActive: data.isActive,
        },
      });

      if (data.stock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: created.id,
            changeAmount: data.stock,
            previousStock: 0,
            newStock: data.stock,
            reason: 'INITIAL_STOCK',
            performedByRole: req.user!.role,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'PRODUCT_CREATE',
          resource: 'PRODUCT',
          resourceId: created.id,
          details: `Created product "${created.name}" (SKU: ${created.sku})`,
        },
      });

      return created;
    });

    return sendResponse(res, 201, 'Product created successfully', product);
  })
);

// 6. PUT /api/v1/products/:id (Update product - Staff only)
productRouter.put(
  '/:id',
  authGuard([Role.ADMIN, Role.MANAGER]),
  validate(productSchema.partial()),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCT_UPDATE',
        resource: 'PRODUCT',
        resourceId: id,
        details: `Updated product "${updated.name}"`,
      },
    });

    return sendResponse(res, 200, 'Product updated successfully', updated);
  })
);

// 7. DELETE /api/v1/products/:id (Soft-delete / Deactivate - Staff only)
productRouter.delete(
  '/:id',
  authGuard([Role.ADMIN, Role.MANAGER]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCT_DEACTIVATE',
        resource: 'PRODUCT',
        resourceId: id,
        details: `Deactivated product "${existing.name}"`,
      },
    });

    return sendResponse(res, 200, 'Product deactivated successfully');
  })
);
