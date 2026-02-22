import { SimplePasswordHasher } from '../user/infrastructure/persistence/bcrypt-password-hasher.js';
import { SimpleTokenIssuer } from '../user/infrastructure/persistence/jwt-token-issuer.js';
import { ConsoleEventPublisher } from '../shared/infrastructure/event-publisher.js';
import { UserCommandHandlers } from '../user/application/command/user-command-handlers.js';
import { UserQueryHandlers } from '../user/application/query/user-query-handlers.js';
import { userRoutes } from '../user/interface/http/user-routes.js';

import { OrderCommandHandlers } from '../order/application/command/order-command-handlers.js';
import { OrderQueryHandlers } from '../order/application/query/order-query-handlers.js';
import { orderRoutes } from '../order/interface/http/order-routes.js';

import { ProductCommandHandlers } from '../product/application/command/product-command-handlers.js';
import { ProductQueryHandlers } from '../product/application/query/product-query-handlers.js';
import { productRoutes } from '../product/interface/http/product-routes.js';

import { CartCommandHandlers } from '../cart/application/command/cart-command-handlers.js';
import { CartQueryHandlers } from '../cart/application/query/cart-query-handlers.js';
import { cartRoutes } from '../cart/interface/http/cart-routes.js';

import { PaymentCommandHandlers } from '../payment/application/command/payment-command-handlers.js';
import { PaymentQueryHandlers } from '../payment/application/query/payment-query-handlers.js';
import { paymentRoutes } from '../payment/interface/http/payment-routes.js';

import { InventoryCommandHandlers } from '../inventory/application/command/inventory-command-handlers.js';
import { InventoryQueryHandlers } from '../inventory/application/query/inventory-query-handlers.js';
import { inventoryRoutes } from '../inventory/interface/http/inventory-routes.js';

import { ShippingCommandHandlers } from '../shipping/application/command/shipping-command-handlers.js';
import { ShippingQueryHandlers } from '../shipping/application/query/shipping-query-handlers.js';
import { shippingRoutes } from '../shipping/interface/http/shipping-routes.js';

import { CatalogCommandHandlers } from '../catalog/application/command/catalog-command-handlers.js';
import { CatalogQueryHandlers } from '../catalog/application/query/catalog-query-handlers.js';
import { catalogRoutes } from '../catalog/interface/http/catalog-routes.js';
import { adminRoutes } from '../shared/interface/http/admin-routes.js';

// Repository implementations
import { InMemoryUserRepository } from '../user/infrastructure/persistence/in-memory-user-repository.js';
import { InMemoryOrderRepository } from '../order/infrastructure/persistence/in-memory-order-repository.js';
import { InMemoryProductRepository } from '../product/infrastructure/persistence/in-memory-product-repository.js';
import { PrismaUserRepository } from '../user/infrastructure/persistence/prisma-user-repository.js';
import { PrismaOrderRepository } from '../order/infrastructure/persistence/prisma-order-repository.js';
import { InMemoryCartRepository } from '../cart/infrastructure/persistence/in-memory-cart-repository.js';
import { PrismaCartRepository } from '../cart/infrastructure/persistence/prisma-cart-repository.js';
import { InMemoryPaymentRepository } from '../payment/infrastructure/persistence/in-memory-payment-repository.js';
import { PrismaPaymentRepository } from '../payment/infrastructure/persistence/prisma-payment-repository.js';
import { InMemoryInventoryRepository } from '../inventory/infrastructure/persistence/in-memory-inventory-repository.js';
import { PrismaInventoryRepository } from '../inventory/infrastructure/persistence/prisma-inventory-repository.js';
import { InMemoryShippingRepository } from '../shipping/infrastructure/persistence/in-memory-shipping-repository.js';
import { PrismaShippingRepository } from '../shipping/infrastructure/persistence/prisma-shipping-repository.js';
import { InMemoryCategoryRepository } from '../catalog/infrastructure/persistence/in-memory-category-repository.js';
import { PrismaCategoryRepository } from '../catalog/infrastructure/persistence/prisma-category-repository.js';
import { prisma } from '../shared/infrastructure/prisma-client.js';

const usePrisma = !!process.env['DATABASE_URL'];

// Composition Root - wire up all dependencies
export function createContainer() {
  const eventPublisher = new ConsoleEventPublisher();
  const passwordHasher = new SimplePasswordHasher();
  const tokenIssuer = new SimpleTokenIssuer(
    process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  );

  // User Context
  const userRepo = usePrisma
    ? new PrismaUserRepository(prisma)
    : new InMemoryUserRepository();
  const userCommandHandlers = new UserCommandHandlers(
    userRepo, eventPublisher, passwordHasher, tokenIssuer,
  );
  const userQueryHandlers = new UserQueryHandlers(userRepo);

  // Order Context
  const orderRepo = usePrisma
    ? new PrismaOrderRepository(prisma)
    : new InMemoryOrderRepository();
  const orderCommandHandlers = new OrderCommandHandlers(orderRepo, eventPublisher);
  const orderQueryHandlers = new OrderQueryHandlers(orderRepo);

  // Product Context (InMemory - Prisma schema diverges from domain model)
  const productRepo = new InMemoryProductRepository();
  const productCommandHandlers = new ProductCommandHandlers(productRepo, eventPublisher);
  const productQueryHandlers = new ProductQueryHandlers(productRepo);

  // Cart Context
  const cartRepo = usePrisma
    ? new PrismaCartRepository(prisma)
    : new InMemoryCartRepository();
  const cartCommandHandlers = new CartCommandHandlers(cartRepo);
  const cartQueryHandlers = new CartQueryHandlers(cartRepo);

  // Payment Context
  const paymentRepo = usePrisma
    ? new PrismaPaymentRepository(prisma)
    : new InMemoryPaymentRepository();
  const paymentCommandHandlers = new PaymentCommandHandlers(paymentRepo);
  const paymentQueryHandlers = new PaymentQueryHandlers(paymentRepo);

  // Inventory Context
  const inventoryRepo = usePrisma
    ? new PrismaInventoryRepository(prisma)
    : new InMemoryInventoryRepository();
  const inventoryCommandHandlers = new InventoryCommandHandlers(inventoryRepo);
  const inventoryQueryHandlers = new InventoryQueryHandlers(inventoryRepo);

  // Shipping Context
  const shippingRepo = usePrisma
    ? new PrismaShippingRepository(prisma)
    : new InMemoryShippingRepository();
  const shippingCommandHandlers = new ShippingCommandHandlers(shippingRepo);
  const shippingQueryHandlers = new ShippingQueryHandlers(shippingRepo);

  // Catalog Context
  const categoryRepo = usePrisma
    ? new PrismaCategoryRepository(prisma)
    : new InMemoryCategoryRepository();
  const catalogCommandHandlers = new CatalogCommandHandlers(categoryRepo);
  const catalogQueryHandlers = new CatalogQueryHandlers(categoryRepo);

  return {
    routes: {
      user: userRoutes(userCommandHandlers, userQueryHandlers),
      order: orderRoutes(orderCommandHandlers, orderQueryHandlers),
      product: productRoutes(productCommandHandlers, productQueryHandlers),
      cart: cartRoutes(cartCommandHandlers, cartQueryHandlers),
      payment: paymentRoutes(paymentCommandHandlers, paymentQueryHandlers),
      inventory: inventoryRoutes(inventoryCommandHandlers, inventoryQueryHandlers),
      shipping: shippingRoutes(shippingCommandHandlers, shippingQueryHandlers),
      catalog: catalogRoutes(catalogCommandHandlers, catalogQueryHandlers),
      admin: adminRoutes({
        userCommandHandlers,
        userQueryHandlers,
        productCommandHandlers,
        productQueryHandlers,
        orderCommandHandlers,
        orderQueryHandlers,
        inventoryCommandHandlers,
        inventoryQueryHandlers,
      }),
    },
    tokenIssuer,
  };
}
