import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InventoryCommandHandlers } from '../../application/command/inventory-command-handlers.js';
import { InventoryQueryHandlers } from '../../application/query/inventory-query-handlers.js';
import { UnauthorizedError } from '../../../shared/domain/index.js';
import { z } from 'zod';

const adjustStockSchema = z.object({
  delta: z.number().int(),
});

const reserveStockSchema = z.object({
  quantity: z.number().int().positive(),
});

const releaseStockSchema = z.object({
  quantity: z.number().int().positive(),
});

function requireAuth(req: FastifyRequest): string {
  const userId = (req as any).user?.userId;
  if (!userId) throw new UnauthorizedError('Authentication required');
  return userId;
}

export function inventoryRoutes(
  commandHandlers: InventoryCommandHandlers,
  queryHandlers: InventoryQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // GET /inventory/:productId - get inventory for a product
    fastify.get('/inventory/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { productId } = req.params as { productId: string };
      const inventory = await queryHandlers.getInventory({ productId });
      return reply.send({ data: inventory });
    });

    // PUT /inventory/:productId - adjust stock quantity
    fastify.put('/inventory/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { productId } = req.params as { productId: string };
      const body = adjustStockSchema.parse(req.body);
      const inventory = await commandHandlers.adjustStock({ productId, delta: body.delta });
      return reply.send({ data: inventory });
    });

    // POST /inventory/:productId/reserve - reserve stock
    fastify.post('/inventory/:productId/reserve', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { productId } = req.params as { productId: string };
      const body = reserveStockSchema.parse(req.body);
      const inventory = await commandHandlers.reserveStock({ productId, quantity: body.quantity });
      return reply.send({ data: inventory });
    });

    // POST /inventory/:productId/release - release reserved stock
    fastify.post('/inventory/:productId/release', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { productId } = req.params as { productId: string };
      const body = releaseStockSchema.parse(req.body);
      const inventory = await commandHandlers.releaseStock({ productId, quantity: body.quantity });
      return reply.send({ data: inventory });
    });
  };
}
