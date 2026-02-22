import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PaymentCommandHandlers } from '../../application/command/payment-command-handlers.js';
import { PaymentQueryHandlers } from '../../application/query/payment-query-handlers.js';
import { UnauthorizedError } from '../../../shared/domain/index.js';
import { z } from 'zod';

const initiatePaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().optional(),
  method: z.enum(['CARD', 'VIRTUAL_ACCOUNT', 'BANK_TRANSFER', 'KAKAO_PAY', 'NAVER_PAY', 'POINT']),
});

const completePaymentSchema = z.object({
  pgTransactionId: z.string().optional(),
});

const failPaymentSchema = z.object({
  reason: z.string().min(1),
});

const tossConfirmSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

const tossCancelSchema = z.object({
  reason: z.string().min(1),
  cancelAmount: z.number().int().positive().optional(),
});

function requireAuth(req: FastifyRequest): string {
  const userId = (req as any).user?.userId;
  if (!userId) throw new UnauthorizedError('Authentication required');
  return userId;
}

export function paymentRoutes(
  commandHandlers: PaymentCommandHandlers,
  queryHandlers: PaymentQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // POST /payments - initiate payment
    fastify.post('/payments', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const body = initiatePaymentSchema.parse(req.body);
      const payment = await commandHandlers.initiatePayment(body);
      return reply.status(201).send({ data: payment });
    });

    // GET /payments/:id - get payment by id
    fastify.get('/payments/:id', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { id } = req.params as { id: string };
      const payment = await queryHandlers.getPayment({ paymentId: id });
      return reply.send({ data: payment });
    });

    // GET /payments/orders/:orderId - get payment by order id
    fastify.get('/payments/orders/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { orderId } = req.params as { orderId: string };
      const payment = await queryHandlers.getPaymentByOrderId({ orderId });
      return reply.send({ data: payment });
    });

    // POST /payments/:id/complete - complete payment (direct, non-PG)
    fastify.post('/payments/:id/complete', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { id } = req.params as { id: string };
      const body = completePaymentSchema.parse(req.body ?? {});
      const payment = await commandHandlers.completePayment({ paymentId: id, ...body });
      return reply.send({ data: payment });
    });

    // POST /payments/confirm - TossPayments payment confirmation
    fastify.post('/payments/confirm', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const body = tossConfirmSchema.parse(req.body);
      const payment = await commandHandlers.confirmTossPayment(body);
      return reply.send({ data: payment });
    });

    // POST /payments/:id/cancel - cancel payment via TossPayments
    fastify.post('/payments/:id/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { id } = req.params as { id: string };
      const body = tossCancelSchema.parse(req.body);
      const payment = await commandHandlers.cancelTossPayment({
        paymentId: id,
        reason: body.reason,
        cancelAmount: body.cancelAmount,
      });
      return reply.send({ data: payment });
    });

    // POST /payments/webhook/toss - TossPayments webhook handler
    fastify.post('/payments/webhook/toss', async (req: FastifyRequest, reply: FastifyReply) => {
      // Webhook does not require user auth - validated by signature
      const { eventType, data } = req.body as {
        eventType: string;
        data: { paymentKey: string; orderId: string; status: string };
      };

      try {
        switch (eventType) {
          case 'PAYMENT_STATUS_CHANGED': {
            const payment = await queryHandlers.getPaymentByOrderId({ orderId: data.orderId });
            if (data.status === 'DONE' && payment.status === 'INITIATED') {
              await commandHandlers.completePayment({
                paymentId: payment.id,
                pgTransactionId: data.paymentKey,
              });
            } else if (data.status === 'CANCELED' && payment.status === 'COMPLETED') {
              await commandHandlers.refundPayment({ paymentId: payment.id });
            } else if (data.status === 'ABORTED' || data.status === 'EXPIRED') {
              await commandHandlers.failPayment({
                paymentId: payment.id,
                reason: `PG status: ${data.status}`,
              });
            }
            break;
          }
          default:
            // Ignore unknown event types
            break;
        }
      } catch (error) {
        // Log but do not fail - webhook should always return 200
        fastify.log.error(error, 'Webhook processing error');
      }

      return reply.status(200).send({ ok: true });
    });

    // POST /payments/:id/fail - fail payment
    fastify.post('/payments/:id/fail', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { id } = req.params as { id: string };
      const body = failPaymentSchema.parse(req.body);
      const payment = await commandHandlers.failPayment({ paymentId: id, reason: body.reason });
      return reply.send({ data: payment });
    });

    // POST /payments/:id/refund - refund payment (non-PG)
    fastify.post('/payments/:id/refund', async (req: FastifyRequest, reply: FastifyReply) => {
      requireAuth(req);
      const { id } = req.params as { id: string };
      const payment = await commandHandlers.refundPayment({ paymentId: id });
      return reply.send({ data: payment });
    });
  };
}
