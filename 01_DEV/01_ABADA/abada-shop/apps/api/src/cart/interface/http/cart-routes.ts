import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CartCommandHandlers } from '../../application/command/cart-command-handlers.js';
import { CartQueryHandlers } from '../../application/query/cart-query-handlers.js';
import { UnauthorizedError } from '../../../shared/domain/index.js';
import { ok } from '../../../shared/infrastructure/response-helper.js';
import { z } from 'zod';

const addItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

const updateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
});

function requireAuth(req: FastifyRequest): string {
  const userId = (req as any).user?.userId;
  if (!userId) throw new UnauthorizedError('Authentication required');
  return userId;
}

export function cartRoutes(
  commandHandlers: CartCommandHandlers,
  queryHandlers: CartQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // GET /cart - get current user's cart
    fastify.get('/cart', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = requireAuth(req);
      const cart = await queryHandlers.getCart({ userId });
      return reply.send(ok(cart));
    });

    // POST /cart/items - add item to cart
    fastify.post('/cart/items', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = requireAuth(req);
      const body = addItemSchema.parse(req.body);
      const cart = await commandHandlers.addItem({ userId, ...body });
      return reply.status(201).send(ok(cart));
    });

    // PUT /cart/items/:productId - update item quantity
    fastify.put('/cart/items/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = requireAuth(req);
      const { productId } = req.params as { productId: string };
      const body = updateQuantitySchema.parse(req.body);
      const cart = await commandHandlers.updateItemQuantity({ userId, productId, quantity: body.quantity });
      return reply.send(ok(cart));
    });

    // DELETE /cart/items/:productId - remove specific item
    fastify.delete('/cart/items/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = requireAuth(req);
      const { productId } = req.params as { productId: string };
      const cart = await commandHandlers.removeItem({ userId, productId });
      return reply.send(ok(cart));
    });

    // DELETE /cart - clear entire cart
    fastify.delete('/cart', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = requireAuth(req);
      await commandHandlers.clearCart({ userId });
      return reply.status(204).send();
    });
  };
}
