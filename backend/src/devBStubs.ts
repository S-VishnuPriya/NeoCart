/**
 * Developer B Integration Contracts & Stubs
 * 
 * NOTE: These TypeScript interfaces define the exact contracts that Developer B's
 * modules (Product, Inventory, Payment) will implement upon future integration.
 * For now, in-memory mock providers fulfill Developer A's dependencies seamlessly.
 */

// 1. Contracts / Interfaces
export interface IProductContract {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface IInventoryContract {
  checkStock(productId: string, quantity: number): Promise<boolean>;
  reserveStock(items: { productId: string; quantity: number }[]): Promise<boolean>;
  releaseStock(items: { productId: string; quantity: number }[]): Promise<boolean>;
}

export interface IPaymentContract {
  processPayment(
    orderId: string,
    amount: number,
    paymentMethod?: string
  ): Promise<{ success: boolean; transactionId: string; status: 'PAID' | 'FAILED' }>;
}

// 2. Mock Product Data Store (Simulates Developer B's Product Catalog)
const MOCK_PRODUCTS: Record<string, IProductContract> = {
  'prod-101': {
    id: 'prod-101',
    name: 'Wireless Noise-Cancelling Headphones',
    sku: 'WNC-HD-001',
    price: 299.99,
    stock: 25,
    isActive: true,
  },
  'prod-102': {
    id: 'prod-102',
    name: 'Ergonomic Mechanical Keyboard',
    sku: 'EMK-RGB-002',
    price: 149.99,
    stock: 40,
    isActive: true,
  },
  'prod-103': {
    id: 'prod-103',
    name: '4K Ultra-HD Pro Webcam',
    sku: 'UHD-CAM-003',
    price: 49.99,
    stock: 60,
    isActive: true,
  },
  'prod-104': {
    id: 'prod-104',
    name: 'USB-C Aluminum Multiport Dock',
    sku: 'USBC-DK-004',
    price: 89.99,
    stock: 15,
    isActive: true,
  },
  'prod-105': {
    id: 'prod-105',
    name: 'Precision Wireless Gaming Mouse',
    sku: 'PWG-MS-005',
    price: 59.99,
    stock: 30,
    isActive: true,
  },
};

// 3. Mock Implementations
export const productStub = {
  async getProductById(productId: string): Promise<IProductContract | null> {
    return MOCK_PRODUCTS[productId] || null;
  },

  async getProductsByIds(productIds: string[]): Promise<IProductContract[]> {
    return productIds
      .map((id) => MOCK_PRODUCTS[id])
      .filter((p): p is IProductContract => Boolean(p));
  },
};

export const inventoryStub: IInventoryContract = {
  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = MOCK_PRODUCTS[productId];
    if (!product || !product.isActive) return false;
    return product.stock >= quantity;
  },

  async reserveStock(items: { productId: string; quantity: number }[]): Promise<boolean> {
    for (const item of items) {
      const product = MOCK_PRODUCTS[item.productId];
      if (!product || product.stock < item.quantity) {
        return false;
      }
    }
    // Simulate stock reservation
    items.forEach((item) => {
      MOCK_PRODUCTS[item.productId].stock -= item.quantity;
    });
    return true;
  },

  async releaseStock(items: { productId: string; quantity: number }[]): Promise<boolean> {
    // Restore reserved stock upon order cancellation
    items.forEach((item) => {
      if (MOCK_PRODUCTS[item.productId]) {
        MOCK_PRODUCTS[item.productId].stock += item.quantity;
      }
    });
    return true;
  },
};

export const paymentStub: IPaymentContract = {
  async processPayment(orderId: string, amount: number) {
    // Simulates payment gateway response
    return {
      success: true,
      transactionId: `txn_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: 'PAID',
    };
  },
};
