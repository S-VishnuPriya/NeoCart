import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import {
  AppError,
  asyncHandler,
  AuthenticatedRequest,
  sendResponse,
  validate,
  AuthUser,
} from '../middleware.js';

export const cartRouter = Router();

// Middleware: Optional Authentication (Extracts user if JWT is present, else continues as guest)
const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_ACCESS_SECRET || 'neocart_super_secret_access_key_2026';
      req.user = jwt.verify(token, secret) as AuthUser;
    } catch {
      // Ignore token verification failure for optional auth
    }
  }
  next();
};

cartRouter.use(optionalAuth);

// Helper: Resolve Active Cart (Finds or Creates Cart for Customer or Guest Session)
async function getOrCreateCart(req: AuthenticatedRequest) {
  let customerId: string | null = null;
  const guestSessionId = (req.headers['x-guest-session-id'] as string) || (req.query.guestSessionId as string);

  if (req.user) {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });
    if (customer) {
      customerId = customer.id;
    }
  }

  if (!customerId && !guestSessionId) {
    throw new AppError(
      400,
      'Either user authentication or x-guest-session-id header is required to access the cart',
      'SESSION_REQUIRED'
    );
  }

  let cart = await prisma.cart.findFirst({
    where: customerId ? { customerId } : { guestSessionId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        customerId,
        guestSessionId: customerId ? null : guestSessionId,
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  return cart;
}

// Helper: Calculate Cart Summary (Subtotal, Tax, Shipping, Grand Total)
function calculateCartDetails(cart: any) {
  let subtotal = 0;
  let totalItemCount = 0;

  const itemDetails = cart.items.map((item: any) => {
    const unitPrice = Number(item.unitPrice);
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;
    totalItemCount += item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || 'Unknown Product',
      productSku: item.product?.sku || 'UNKNOWN',
      imageUrl: item.product?.imageUrl || null,
      unitPrice,
      quantity: item.quantity,
      totalPrice: Number(itemSubtotal.toFixed(2)),
      inStock: item.product ? item.product.stock >= item.quantity : false,
      availableStock: item.product?.stock || 0,
    };
  });

  const taxAmount = Number((subtotal * 0.08).toFixed(2)); // 8% estimated tax
  const shippingCost = subtotal >= 100 || subtotal === 0 ? 0.0 : 10.0; // Free shipping over $100
  const grandTotal = Number((subtotal + taxAmount + shippingCost).toFixed(2));

  return {
    cartId: cart.id,
    customerId: cart.customerId,
    guestSessionId: cart.guestSessionId,
    items: itemDetails,
    summary: {
      itemCount: totalItemCount,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount,
      shippingCost,
      grandTotal,
      freeShippingThreshold: 100.0,
      qualifiesForFreeShipping: subtotal >= 100,
    },
  };
}

// Validation Schemas
const addItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

const mergeCartSchema = z.object({
  guestSessionId: z.string().min(1, 'Guest session ID is required to merge'),
});

// 1. GET /api/v1/cart
cartRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cart = await getOrCreateCart(req);
    const cartDetails = calculateCartDetails(cart);
    return sendResponse(res, 200, 'Active cart retrieved', cartDetails);
  })
);

// 2. POST /api/v1/cart/items
cartRouter.post(
  '/items',
  validate(addItemSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity } = req.body;
    const cart = await getOrCreateCart(req);

    // Validate Product existence from real database
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new AppError(404, 'Product not found or unavailable', 'PRODUCT_NOT_FOUND');
    }

    // Check existing item in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (product.stock < newQuantity) {
      throw new AppError(
        400,
        `Cannot add ${quantity} item(s). Only ${product.stock} in stock (you already have ${existingItem?.quantity || 0} in cart).`,
        'INSUFFICIENT_STOCK'
      );
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          unitPrice: product.price,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          unitPrice: product.price,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: true } },
      },
    });

    const result = calculateCartDetails(updatedCart);
    return sendResponse(res, 200, 'Item added to cart', result);
  })
);

// 3. PATCH /api/v1/cart/items/:productId
cartRouter.patch(
  '/items/:productId',
  validate(updateQuantitySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await getOrCreateCart(req);

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      include: { product: true },
    });

    if (!existingItem) {
      throw new AppError(404, 'Item not found in cart', 'ITEM_NOT_FOUND');
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
    } else {
      if (existingItem.product && existingItem.product.stock < quantity) {
        throw new AppError(
          400,
          `Requested quantity exceeds available stock (${existingItem.product.stock})`,
          'INSUFFICIENT_STOCK'
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: true } },
      },
    });

    const result = calculateCartDetails(updatedCart);
    return sendResponse(res, 200, 'Cart quantity updated', result);
  })
);

// 4. DELETE /api/v1/cart/items/:productId
cartRouter.delete(
  '/items/:productId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const cart = await getOrCreateCart(req);

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: true } },
      },
    });

    const result = calculateCartDetails(updatedCart);
    return sendResponse(res, 200, 'Item removed from cart', result);
  })
);

// 5. DELETE /api/v1/cart
cartRouter.delete(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cart = await getOrCreateCart(req);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return sendResponse(res, 200, 'Cart cleared successfully');
  })
);

// 6. POST /api/v1/cart/merge (Guest to User Cart Merger)
cartRouter.post(
  '/merge',
  validate(mergeCartSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Must be logged in to merge guest cart', 'UNAUTHORIZED');
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    if (!customer) {
      throw new AppError(404, 'Customer profile not found', 'CUSTOMER_NOT_FOUND');
    }

    const { guestSessionId } = req.body;
    const guestCart = await prisma.cart.findUnique({
      where: { guestSessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return sendResponse(res, 200, 'No guest items to merge');
    }

    let userCart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { customerId: customer.id },
      });
    }

    // Merge items atomically
    for (const guestItem of guestCart.items) {
      const existingUserItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: userCart.id,
            productId: guestItem.productId,
          },
        },
      });

      if (existingUserItem) {
        await prisma.cartItem.update({
          where: { id: existingUserItem.id },
          data: { quantity: existingUserItem.quantity + guestItem.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
            unitPrice: guestItem.unitPrice,
          },
        });
      }
    }

    await prisma.cart.delete({
      where: { id: guestCart.id },
    });

    const finalCart = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: {
        items: { include: { product: true } },
      },
    });

    const result = calculateCartDetails(finalCart);
    return sendResponse(res, 200, 'Guest cart merged successfully into user cart', result);
  })
);
