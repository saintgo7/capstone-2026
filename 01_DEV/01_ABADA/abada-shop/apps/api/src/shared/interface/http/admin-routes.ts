// Admin-only API routes with ADMIN role guard
// Prefix: /api/v1/admin
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserCommandHandlers } from '../../../user/application/command/user-command-handlers.js';
import { UserQueryHandlers } from '../../../user/application/query/user-query-handlers.js';
import { ProductCommandHandlers } from '../../../product/application/command/product-command-handlers.js';
import { ProductQueryHandlers } from '../../../product/application/query/product-query-handlers.js';
import { OrderCommandHandlers } from '../../../order/application/command/order-command-handlers.js';
import { OrderQueryHandlers } from '../../../order/application/query/order-query-handlers.js';
import { InventoryCommandHandlers } from '../../../inventory/application/command/inventory-command-handlers.js';
import { InventoryQueryHandlers } from '../../../inventory/application/query/inventory-query-handlers.js';
import { ForbiddenError, UnauthorizedError } from '../../domain/index.js';
import { ok } from '../../infrastructure/response-helper.js';
import { z } from 'zod';

function requireAdmin(req: FastifyRequest): string {
  const user = (req as any).user;
  if (!user?.userId) throw new UnauthorizedError('Authentication required');
  if (user.role !== 'ADMIN') throw new ForbiddenError('Admin access required');
  return user.userId;
}

const adjustStockSchema = z.object({
  delta: z.number().int(),
});

const updateOrderStatusSchema = z.object({
  action: z.enum(['ship', 'deliver', 'cancel']),
  reason: z.string().optional(),
});

const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  priceAmount: z.number().int().nonnegative(),
  currency: z.string().default('KRW'),
  initialStock: z.number().int().nonnegative().default(0),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  discountRate: z.number().min(0).max(100).optional(),
});

export function adminRoutes(deps: {
  userCommandHandlers: UserCommandHandlers;
  userQueryHandlers: UserQueryHandlers;
  productCommandHandlers: ProductCommandHandlers;
  productQueryHandlers: ProductQueryHandlers;
  orderCommandHandlers: OrderCommandHandlers;
  orderQueryHandlers: OrderQueryHandlers;
  inventoryCommandHandlers: InventoryCommandHandlers;
  inventoryQueryHandlers: InventoryQueryHandlers;
}) {
  return async (fastify: FastifyInstance) => {

    // ── Admin Stats ──────────────────────────────────────────────────────────

    // GET /admin/stats - dashboard summary stats
    fastify.get('/admin/stats', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const [
        { users: allUsers, total: totalUsers },
        { orders: allOrders, total: totalOrders },
      ] = await Promise.all([
        deps.userQueryHandlers.getAllUsers({ limit: 1 }),
        deps.orderQueryHandlers.getAllOrders({ limit: 1 }),
      ]);

      // Count recent orders (placeholder - we count all orders as "today")
      const stats = {
        totalUsers,
        totalOrders,
        totalRevenue: allOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      };
      return reply.send(ok(stats));
    });

    // ── Admin Products ───────────────────────────────────────────────────────

    // GET /admin/products - list all products
    fastify.get('/admin/products', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { status, limit, offset, search, categoryId } = req.query as any;
      const products = await deps.productQueryHandlers.getProducts({
        status,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
        search,
        categoryId,
      });
      return reply.send(ok(products, {
        pagination: {
          limit: limit ? Number(limit) : 50,
          offset: offset ? Number(offset) : 0,
        },
      }));
    });

    // GET /admin/products/:productId - product detail
    fastify.get('/admin/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { productId } = req.params as { productId: string };
      const product = await deps.productQueryHandlers.getProduct({ productId });
      return reply.send(ok(product));
    });

    // POST /admin/products - create product
    fastify.post('/admin/products', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const body = createProductSchema.parse(req.body);
      const product = await deps.productCommandHandlers.createProduct(body);
      return reply.status(201).send(ok(product));
    });

    // PATCH /admin/products/:productId - update product
    fastify.patch('/admin/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { productId } = req.params as { productId: string };
      const body = updateProductSchema.parse(req.body);
      const product = await deps.productCommandHandlers.updateProduct({ productId, ...body });
      return reply.send(ok(product));
    });

    // POST /admin/products/:productId/activate - activate product
    fastify.post('/admin/products/:productId/activate', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { productId } = req.params as { productId: string };
      const product = await deps.productCommandHandlers.activateProduct({ productId });
      return reply.send(ok(product));
    });

    // ── Admin Orders ─────────────────────────────────────────────────────────

    // GET /admin/orders - list all orders (all customers)
    fastify.get('/admin/orders', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { status, limit, offset } = req.query as any;
      const limitNum = limit ? Number(limit) : 50;
      const offsetNum = offset ? Number(offset) : 0;
      const { orders, total } = await deps.orderQueryHandlers.getAllOrders({
        status,
        limit: limitNum,
        offset: offsetNum,
      });
      return reply.send(ok(orders, {
        pagination: { total, limit: limitNum, offset: offsetNum },
      }));
    });

    // GET /admin/orders/:orderId - order detail
    fastify.get('/admin/orders/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { orderId } = req.params as { orderId: string };
      const order = await deps.orderQueryHandlers.getOrder({ orderId });
      return reply.send(ok(order));
    });

    // PATCH /admin/orders/:orderId/status - change order status (ship/deliver/cancel)
    fastify.patch('/admin/orders/:orderId/status', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { orderId } = req.params as { orderId: string };
      const body = updateOrderStatusSchema.parse(req.body);

      let order;
      switch (body.action) {
        case 'ship':
          order = await deps.orderCommandHandlers.startShipping({ orderId });
          break;
        case 'deliver':
          order = await deps.orderCommandHandlers.deliverOrder({ orderId });
          break;
        case 'cancel':
          order = await deps.orderCommandHandlers.cancelOrder({
            orderId,
            reason: body.reason ?? '관리자 취소',
          });
          break;
      }
      return reply.send(ok(order));
    });

    // ── Admin Users ──────────────────────────────────────────────────────────

    // GET /admin/users - list all users
    fastify.get('/admin/users', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { status, limit, offset } = req.query as any;
      const limitNum = limit ? Number(limit) : 50;
      const offsetNum = offset ? Number(offset) : 0;
      const { users, total } = await deps.userQueryHandlers.getAllUsers({
        status,
        limit: limitNum,
        offset: offsetNum,
      });
      return reply.send(ok(users, {
        pagination: { total, limit: limitNum, offset: offsetNum },
      }));
    });

    // GET /admin/users/:userId - user detail
    fastify.get('/admin/users/:userId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { userId } = req.params as { userId: string };
      const user = await deps.userQueryHandlers.getUser({ userId });
      return reply.send(ok(user));
    });

    // ── Admin Inventory ──────────────────────────────────────────────────────

    // GET /admin/inventory/:productId - inventory status
    fastify.get('/admin/inventory/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { productId } = req.params as { productId: string };
      const inventory = await deps.inventoryQueryHandlers.getInventory({ productId });
      return reply.send(ok(inventory));
    });

    // PUT /admin/inventory/:productId - adjust stock
    fastify.put('/admin/inventory/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAdmin(req);
      const { productId } = req.params as { productId: string };
      const body = adjustStockSchema.parse(req.body);
      const inventory = await deps.inventoryCommandHandlers.adjustStock({ productId, delta: body.delta });
      return reply.send(ok(inventory));
    });
  };
}
