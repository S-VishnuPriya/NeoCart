import { Router, Response } from 'express';
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

export const customerRouter = Router();

// Protect all customer routes with Auth Guard
customerRouter.use(authGuard());

// Helper: Get Customer ID from Authenticated User
async function getCustomerId(userId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { userId },
  });
  if (!customer) {
    throw new AppError(404, 'Customer profile not found for this user', 'CUSTOMER_NOT_FOUND');
  }
  return customer.id;
}

// Schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').optional(),
  phone: z.string().optional(),
});

const addressSchema = z.object({
  streetAddress: z.string().min(1, 'Street address is required'),
  apartment: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('US'),
  isDefaultShipping: z.boolean().optional().default(false),
  isDefaultBilling: z.boolean().optional().default(false),
});

const setDefaultAddressSchema = z.object({
  type: z.enum(['shipping', 'billing', 'both']),
});

// 1. GET /api/v1/customers/profile
customerRouter.get(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.id },
      include: {
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'Customer profile not found', 'CUSTOMER_NOT_FOUND');
    }

    return sendResponse(res, 200, 'Customer profile retrieved', customer);
  })
);

// 2. PUT /api/v1/customers/profile
customerRouter.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const { firstName, lastName, phone } = req.body;

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    });

    return sendResponse(res, 200, 'Customer profile updated successfully', updatedCustomer);
  })
);

// 3. GET /api/v1/customers/addresses
customerRouter.get(
  '/addresses',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, 'Customer addresses retrieved', addresses);
  })
);

// 4. POST /api/v1/customers/addresses
customerRouter.post(
  '/addresses',
  validate(addressSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const data = req.body;

    // If marked as default, clear existing defaults atomically
    if (data.isDefaultShipping) {
      await prisma.address.updateMany({
        where: { customerId, isDefaultShipping: true },
        data: { isDefaultShipping: false },
      });
    }

    if (data.isDefaultBilling) {
      await prisma.address.updateMany({
        where: { customerId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        ...data,
        customerId,
      },
    });

    return sendResponse(res, 201, 'Address added successfully', newAddress);
  })
);

// 5. PUT /api/v1/customers/addresses/:id
customerRouter.put(
  '/addresses/:id',
  validate(addressSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const addressId = req.params.id;

    const existing = await prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Address not found in your address book', 'ADDRESS_NOT_FOUND');
    }

    const data = req.body;

    if (data.isDefaultShipping) {
      await prisma.address.updateMany({
        where: { customerId, isDefaultShipping: true, id: { not: addressId } },
        data: { isDefaultShipping: false },
      });
    }

    if (data.isDefaultBilling) {
      await prisma.address.updateMany({
        where: { customerId, isDefaultBilling: true, id: { not: addressId } },
        data: { isDefaultBilling: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data,
    });

    return sendResponse(res, 200, 'Address updated successfully', updated);
  })
);

// 6. DELETE /api/v1/customers/addresses/:id
customerRouter.delete(
  '/addresses/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const addressId = req.params.id;

    const existing = await prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Address not found in your address book', 'ADDRESS_NOT_FOUND');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return sendResponse(res, 200, 'Address deleted successfully');
  })
);

// 7. PATCH /api/v1/customers/addresses/:id/default
customerRouter.patch(
  '/addresses/:id/default',
  validate(setDefaultAddressSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const customerId = await getCustomerId(req.user!.id);
    const addressId = req.params.id;
    const { type } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
    }

    if (type === 'shipping' || type === 'both') {
      await prisma.address.updateMany({
        where: { customerId, isDefaultShipping: true },
        data: { isDefaultShipping: false },
      });
    }

    if (type === 'billing' || type === 'both') {
      await prisma.address.updateMany({
        where: { customerId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        isDefaultShipping: type === 'shipping' || type === 'both' ? true : existing.isDefaultShipping,
        isDefaultBilling: type === 'billing' || type === 'both' ? true : existing.isDefaultBilling,
      },
    });

    return sendResponse(res, 200, 'Default address updated successfully', updated);
  })
);
