import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrderCommandHandlers } from '../../application/command/order-command-handlers.js';
import { OrderQueryHandlers } from '../../application/query/order-query-handlers.js';
import { z } from 'zod';

const createOrderSchema = z.object({
  shippingAddress: z.string().min(1),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
});

const addItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceAmount: z.number().int().nonnegative(),
  currency: z.string().default('KRW'),
});

const addItemSchemaAlt = z.object({
  productId: z.string(),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  currency: z.string().default('KRW'),
});

const cancelSchema = z.object({
  reason: z.string().default('고객 요청'),
});

function getUserId(req: FastifyRequest): string | null {
  return (req as any).user?.userId ?? null;
}

export function orderRoutes(
  commandHandlers: OrderCommandHandlers,
  queryHandlers: OrderQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // POST /orders - 주문 생성
    fastify.post('/orders', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const body = createOrderSchema.parse(req.body);
      const order = await commandHandlers.createOrder({ customerId, ...body });
      return reply.status(201).send({ data: order });
    });

    // GET /orders - 내 주문 목록
    fastify.get('/orders', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const orders = await queryHandlers.getOrdersByCustomer({ customerId });
      return reply.send({ data: orders });
    });

    // GET /orders/:orderId - 주문 상세
    fastify.get('/orders/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const { orderId } = req.params as { orderId: string };
      const order = await queryHandlers.getOrder({ orderId });
      return reply.send({ data: order });
    });

    // POST /orders/:orderId/items - 아이템 추가
    fastify.post('/orders/:orderId/items', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const { orderId } = req.params as { orderId: string };
      // Support both unitPrice and unitPriceAmount field names
      const rawBody = req.body as any;
      const unitPriceAmount = rawBody.unitPriceAmount ?? rawBody.unitPrice ?? 0;
      const productId = rawBody.productId ?? '';
      const body = addItemSchema.parse({ ...rawBody, unitPriceAmount, productId: productId || rawBody.productId });
      const order = await commandHandlers.addItem({ orderId, ...body });
      return reply.status(201).send({ data: order });
    });

    // DELETE /orders/:orderId/items/:itemId - 아이템 제거
    fastify.delete('/orders/:orderId/items/:itemId', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const { orderId, itemId } = req.params as { orderId: string; itemId: string };
      const order = await commandHandlers.removeItem({ orderId, itemId });
      return reply.send({ data: order });
    });

    // POST /orders/:orderId/confirm - 주문 확정
    fastify.post('/orders/:orderId/confirm', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const { orderId } = req.params as { orderId: string };
      const order = await commandHandlers.confirmOrder({ orderId });
      return reply.send({ data: order });
    });

    // POST /orders/:orderId/cancel - 주문 취소
    fastify.post('/orders/:orderId/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
      const customerId = getUserId(req);
      if (!customerId) return reply.status(401).send({ error: 'Unauthorized' });

      const { orderId } = req.params as { orderId: string };
      const body = cancelSchema.parse(req.body);
      const order = await commandHandlers.cancelOrder({ orderId, reason: body.reason });
      return reply.send({ data: order });
    });
  };
}
