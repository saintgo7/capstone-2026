import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserCommandHandlers } from '../../application/command/user-command-handlers.js';
import { UserQueryHandlers } from '../../application/query/user-query-handlers.js';
import { ok, fail } from '../../../shared/infrastructure/response-helper.js';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const addAddressSchema = z.object({
  label: z.string().min(1).max(20),
  recipientName: z.string().min(1),
  phone: z.string(),
  zipCode: z.string().length(5),
  address1: z.string().min(1),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export function userRoutes(
  commandHandlers: UserCommandHandlers,
  queryHandlers: UserQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // POST /auth/register
    fastify.post('/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = registerSchema.parse(req.body);
      const user = await commandHandlers.register(body);
      return reply.status(201).send(ok(user));
    });

    // POST /auth/login
    fastify.post('/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = loginSchema.parse(req.body);
      const result = await commandHandlers.login(body);
      return reply.send(ok(result));
    });

    // POST /auth/refresh
    fastify.post('/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = refreshTokenSchema.parse(req.body);
      const result = await commandHandlers.refreshToken({ refreshToken: body.refreshToken });
      return reply.send(ok(result));
    });

    // POST /auth/logout
    fastify.post('/auth/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
      // Stateless JWT: client discards token; server-side blacklist can be added later
      return reply.send(ok({ message: 'Logged out successfully' }));
    });

    // GET /users/me
    fastify.get('/users/me', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const user = await queryHandlers.getUser({ userId });
      return reply.send(ok(user));
    });

    // PUT /users/me
    fastify.put('/users/me', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const body = updateProfileSchema.parse(req.body);
      const user = await commandHandlers.updateProfile({ userId, ...body });
      return reply.send(ok(user));
    });

    // PUT /users/me/password
    fastify.put('/users/me/password', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const body = changePasswordSchema.parse(req.body);
      await commandHandlers.changePassword({ userId, ...body });
      return reply.send(ok({ message: 'Password changed successfully' }));
    });

    // GET /users/me/addresses
    fastify.get('/users/me/addresses', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const addresses = await queryHandlers.getAddresses({ userId });
      return reply.send(ok(addresses));
    });

    // POST /users/me/addresses
    fastify.post('/users/me/addresses', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const body = addAddressSchema.parse(req.body);
      const addresses = await commandHandlers.addAddress({ userId, ...body });
      return reply.status(201).send(ok(addresses));
    });

    // DELETE /users/me/addresses/:addressId
    fastify.delete('/users/me/addresses/:addressId', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user?.userId;
      if (!userId) return reply.status(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
      const { addressId } = req.params as { addressId: string };
      await commandHandlers.removeAddress({ userId, addressId });
      return reply.status(204).send();
    });
  };
}
