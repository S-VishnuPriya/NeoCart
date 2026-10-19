import { PrismaClient, Role, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting complete database seed for NeoCart (Dev A + Dev B)...');

  // 1. Clean up existing tables in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create Categories
  const catElectronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'High-tech gadgets, displays, and devices for modern living.',
    },
  });

  const catAudio = await prisma.category.create({
    data: {
      name: 'Audio & Sound',
      slug: 'audio-sound',
      description: 'Premium headphones, studio monitors, and portable speakers.',
    },
  });

  const catAccessories = await prisma.category.create({
    data: {
      name: 'Computer Accessories',
      slug: 'computer-accessories',
      description: 'Ergonomic keyboards, mice, docking stations, and cables.',
    },
  });

  const catWearables = await prisma.category.create({
    data: {
      name: 'Wearables & Smart Devices',
      slug: 'wearables',
      description: 'Smartwatches, fitness bands, and connected lifestyle gear.',
    },
  });

  // 3. Create Products with Inventory
  const p1 = await prisma.product.create({
    data: {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5-wireless-headphones',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones for unparalleled clarity and call quality.',
      price: 349.99,
      sku: 'SONY-WH5-BLK',
      stock: 45,
      lowStockThreshold: 10,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
      categoryId: catAudio.id,
      isActive: true,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
      slug: 'keychron-q1-pro-wireless-keyboard',
      description: 'CNC aluminum body, QMK/VIA programmable, double-gasket design with hot-swappable tactile switches.',
      price: 199.99,
      sku: 'KEYCH-Q1P-RGB',
      stock: 30,
      lowStockThreshold: 8,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60',
      categoryId: catAccessories.id,
      isActive: true,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: 'Logitech MX Master 3S Performance Wireless Mouse',
      slug: 'logitech-mx-master-3s-mouse',
      description: 'Quiet clicks and 8K DPI any-surface tracking with electromagnetic MagSpeed scrolling for ultimate speed and precision.',
      price: 99.99,
      sku: 'LOGI-MX3S-GRY',
      stock: 65,
      lowStockThreshold: 15,
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60',
      categoryId: catAccessories.id,
      isActive: true,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: 'Dell UltraSharp 27 4K USB-C Hub Monitor (U2723QE)',
      slug: 'dell-ultrasharp-27-4k-monitor',
      description: 'Brilliant IPS Black technology with 2000:1 contrast ratio, 98% DCI-P3 color coverage, and 90W Power Delivery.',
      price: 579.99,
      sku: 'DELL-U2723-4K',
      stock: 18,
      lowStockThreshold: 5,
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=60',
      categoryId: catElectronics.id,
      isActive: true,
    },
  });

  const p5 = await prisma.product.create({
    data: {
      name: 'Anker 778 Thunderbolt 4 Docking Station (12-in-1)',
      slug: 'anker-778-thunderbolt-4-dock',
      description: 'Up to 40Gbps data transfer, 100W max laptop charging, and support for dual 4K or single 8K external display setups.',
      price: 279.99,
      sku: 'ANK-TB4-DOCK',
      stock: 22,
      lowStockThreshold: 5,
      imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=60',
      categoryId: catAccessories.id,
      isActive: true,
    },
  });

  const p6 = await prisma.product.create({
    data: {
      name: 'Garmin Fenix 7 Pro Solar Multisport GPS Smartwatch',
      slug: 'garmin-fenix-7-pro-solar',
      description: 'Solar powered rugged GPS watch with built-in LED flashlight, endurance score, wrist-based heart rate, and topo maps.',
      price: 799.99,
      sku: 'GAR-FNX7P-SLR',
      stock: 8,
      lowStockThreshold: 3,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60',
      categoryId: catWearables.id,
      isActive: true,
    },
  });

  const p7 = await prisma.product.create({
    data: {
      name: 'Elgato Stream Deck MK.2 – 15 LCD Keys',
      slug: 'elgato-stream-deck-mk2',
      description: '15 customizable LCD keys to control apps, trigger actions, launch media, adjust audio, and streamline creative workflows.',
      price: 149.99,
      sku: 'ELG-STRM-MK2',
      stock: 4, // LOW STOCK to demonstrate alert!
      lowStockThreshold: 5,
      imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=60',
      categoryId: catElectronics.id,
      isActive: true,
    },
  });

  // Create initial inventory logs
  await prisma.inventoryLog.createMany({
    data: [
      { productId: p1.id, changeAmount: 45, previousStock: 0, newStock: 45, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p2.id, changeAmount: 30, previousStock: 0, newStock: 30, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p3.id, changeAmount: 65, previousStock: 0, newStock: 65, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p4.id, changeAmount: 18, previousStock: 0, newStock: 18, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p5.id, changeAmount: 22, previousStock: 0, newStock: 22, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p6.id, changeAmount: 8, previousStock: 0, newStock: 8, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
      { productId: p7.id, changeAmount: 4, previousStock: 0, newStock: 4, reason: 'INITIAL_STOCK', performedByRole: 'ADMIN' },
    ],
  });

  // 4. Create Users (Admin, Manager, Customers)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@neocart.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@neocart.com',
      passwordHash,
      role: Role.MANAGER,
    },
  });

  const customerUser1 = await prisma.user.create({
    data: {
      email: 'customer@neocart.com',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      email: 'sarah.smith@example.com',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  // 5. Create Customer Profiles
  const customer1 = await prisma.customer.create({
    data: {
      userId: customerUser1.id,
      firstName: 'Alex',
      lastName: 'Johnson',
      phone: '+1-555-0199',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      userId: customerUser2.id,
      firstName: 'Sarah',
      lastName: 'Smith',
      phone: '+1-555-0288',
    },
  });

  // 6. Create Addresses
  const address1 = await prisma.address.create({
    data: {
      customerId: customer1.id,
      streetAddress: '742 Evergreen Terrace',
      apartment: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      country: 'US',
      isDefaultShipping: true,
      isDefaultBilling: true,
    },
  });

  const address2 = await prisma.address.create({
    data: {
      customerId: customer2.id,
      streetAddress: '123 Market Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      isDefaultShipping: true,
      isDefaultBilling: true,
    },
  });

  // 7. Active Cart with CartItems
  const cart1 = await prisma.cart.create({
    data: {
      customerId: customer1.id,
    },
  });

  await prisma.cartItem.createMany({
    data: [
      { cartId: cart1.id, productId: p1.id, quantity: 1, unitPrice: p1.price },
      { cartId: cart1.id, productId: p3.id, quantity: 1, unitPrice: p3.price },
    ],
  });

  // 8. Completed & Active Orders with Payments and Status Histories
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-1001',
      customerId: customer1.id,
      shippingAddressId: address1.id,
      billingAddressId: address1.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 349.99,
      taxAmount: 28.00,
      shippingCost: 0.00,
      totalAmount: 377.99,
      placedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: p1.id,
            productName: p1.name,
            productSku: p1.sku,
            unitPrice: p1.price,
            quantity: 1,
            totalPrice: p1.price,
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: OrderStatus.PENDING, newStatus: OrderStatus.CONFIRMED, changedByRole: 'SYSTEM', notes: 'Payment verified successfully' },
          { previousStatus: OrderStatus.CONFIRMED, newStatus: OrderStatus.PROCESSING, changedByRole: 'MANAGER', notes: 'Item packed in warehouse' },
          { previousStatus: OrderStatus.PROCESSING, newStatus: OrderStatus.SHIPPED, changedByRole: 'SYSTEM', notes: 'Handed over to FedEx' },
          { previousStatus: OrderStatus.SHIPPED, newStatus: OrderStatus.DELIVERED, changedByRole: 'SYSTEM', notes: 'Package signed and delivered' },
        ],
      },
      payments: {
        create: {
          transactionId: 'TXN-NC-9821734-A',
          amount: 377.99,
          currency: 'USD',
          method: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.PAID,
          gatewayResponse: JSON.stringify({ status: 'succeeded', chargeId: 'ch_mock_123' }),
        },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-1002',
      customerId: customer1.id,
      shippingAddressId: address1.id,
      billingAddressId: address1.id,
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 299.98,
      taxAmount: 24.00,
      shippingCost: 0.00,
      totalAmount: 323.98,
      placedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: p2.id,
            productName: p2.name,
            productSku: p2.sku,
            unitPrice: p2.price,
            quantity: 1,
            totalPrice: p2.price,
          },
          {
            productId: p3.id,
            productName: p3.name,
            productSku: p3.sku,
            unitPrice: p3.price,
            quantity: 1,
            totalPrice: p3.price,
          },
        ],
      },
      statusHistory: {
        create: [
          { previousStatus: OrderStatus.PENDING, newStatus: OrderStatus.CONFIRMED, changedByRole: 'SYSTEM', notes: 'Payment verified via Stripe mock' },
          { previousStatus: OrderStatus.CONFIRMED, newStatus: OrderStatus.PROCESSING, changedByRole: 'MANAGER', notes: 'Warehouse picking in progress' },
        ],
      },
      payments: {
        create: {
          transactionId: 'TXN-NC-9821735-B',
          amount: 323.98,
          currency: 'USD',
          method: PaymentMethod.UPI,
          status: PaymentStatus.PAID,
          gatewayResponse: JSON.stringify({ status: 'succeeded', vpa: 'alex@okaxis' }),
        },
      },
    },
  });

  // 9. Verified Reviews
  await prisma.review.create({
    data: {
      productId: p1.id,
      customerId: customer1.id,
      rating: 5,
      title: 'Best Noise Cancelling Ever',
      comment: 'The sound stage is wide, battery life easily lasts over 30 hours, and active noise cancellation blocks everything out during flights!',
      isVerifiedPurchase: true,
    },
  });

  await prisma.review.create({
    data: {
      productId: p2.id,
      customerId: customer2.id,
      rating: 5,
      title: 'Flawless Mechanical Keyboard',
      comment: 'Super solid aluminum construction and the wireless connection has zero latency. VIA remapping works like magic.',
      isVerifiedPurchase: false,
    },
  });

  // 10. System Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'SYSTEM_BOOT', resource: 'SYSTEM', details: 'Initial system seed executed' },
      { userId: adminUser.id, action: 'PRODUCT_CREATE', resource: 'PRODUCT', resourceId: p1.id, details: 'Created product: Sony WH-1000XM5' },
      { userId: managerUser.id, action: 'ORDER_FULFILL', resource: 'ORDER', resourceId: order1.id, details: 'Advanced order status to DELIVERED' },
    ],
  });

  console.log('[Seed] Database successfully seeded with full Dev A + Dev B models:');
  console.log(` - Admin:    ${adminUser.email} (password123)`);
  console.log(` - Manager:  ${managerUser.email} (password123)`);
  console.log(` - Customer: ${customerUser1.email} (password123)`);
  console.log(` - Products: 7 items created with live categories & inventory`);
  console.log(` - Orders:   ${order1.orderNumber} (DELIVERED), ${order2.orderNumber} (PROCESSING)`);
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
