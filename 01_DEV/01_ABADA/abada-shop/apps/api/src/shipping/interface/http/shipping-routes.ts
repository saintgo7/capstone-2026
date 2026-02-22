import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ShippingCommandHandlers } from '../../application/command/shipping-command-handlers.js';
import { ShippingQueryHandlers } from '../../application/query/shipping-query-handlers.js';
import { ok } from '../../../shared/infrastructure/response-helper.js';
import { z } from 'zod';

const createShippingSchema = z.object({
  orderId: z.string().min(1),
  address: z.object({
    recipientName: z.string().min(1),
    phone: z.string().min(1),
    zipCode: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
  }),
  deliveryNote: z.string().optional(),
});

const shipOrderSchema = z.object({
  carrier: z.enum(['CJ', 'LOTTE', 'POST', 'HANJIN', 'FEDEX', 'DHL', 'EMS']),
  trackingNumber: z.string().min(1),
});

export function shippingRoutes(
  commandHandlers: ShippingCommandHandlers,
  queryHandlers: ShippingQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // POST /shipping - create shipping record
    fastify.post('/shipping', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = createShippingSchema.parse(req.body);
      const shipping = await commandHandlers.createShipping(body);
      return reply.status(201).send(ok(shipping));
    });

    // GET /shipping/order/:orderId - get shipping by order
    fastify.get('/shipping/order/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = req.params as { orderId: string };
      const shipping = await queryHandlers.getShippingByOrder({ orderId });
      return reply.send(ok(shipping));
    });

    // GET /shipping/:id - get shipping by id
    fastify.get('/shipping/:id', async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const shipping = await queryHandlers.getShipping({ id });
      return reply.send(ok(shipping));
    });

    // PUT /shipping/:id/ship - mark as shipped
    fastify.put('/shipping/:id/ship', async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const body = shipOrderSchema.parse(req.body);
      const shipping = await commandHandlers.shipOrder({ id, ...body });
      return reply.send(ok(shipping));
    });

    // PUT /shipping/:id/deliver - mark as delivered
    fastify.put('/shipping/:id/deliver', async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const shipping = await commandHandlers.deliverOrder({ id });
      return reply.send(ok(shipping));
    });
  };
}
