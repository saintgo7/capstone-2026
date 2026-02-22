import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createContainer } from './config/container.js';
import { createAuthMiddleware } from './shared/infrastructure/auth-middleware.js';
import {
  DomainError,
  ApplicationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from './shared/domain/index.js';
import { ZodError } from 'zod';

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? '*',
  });

  // Global error handler
  fastify.setErrorHandler((error: any, _req, reply) => {
    // Fastify built-in errors (JSON parse error, validation, etc.)
    if ('statusCode' in error && typeof error.statusCode === 'number' && !(error.statusCode >= 500)) {
      const statusCode = error.statusCode as number;
      return reply.status(statusCode).send({ error: error.code ?? 'REQUEST_ERROR', message: error.message });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: error.errors,
      });
    }
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ error: error.code, message: error.message });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ error: error.code, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.code, message: error.message });
    }
    if (error instanceof ConflictError) {
      return reply.status(409).send({ error: error.code, message: error.message });
    }
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.code, message: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(422).send({ error: 'DOMAIN_ERROR', message: error.message });
    }
    if (error instanceof ApplicationError) {
      return reply.status(400).send({ error: error.code, message: error.message });
    }

    fastify.log.error(error);
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'abada-shop-api',
    timestamp: new Date().toISOString(),
  }));

  // Auth middleware (global preHandler)
  const container = createContainer();
  fastify.addHook('preHandler', createAuthMiddleware(container.tokenIssuer));

  // Register routes
  await fastify.register(container.routes.user, { prefix: '/api/v1' });
  await fastify.register(container.routes.order, { prefix: '/api/v1' });
  await fastify.register(container.routes.product, { prefix: '/api/v1' });
  await fastify.register(container.routes.cart, { prefix: '/api/v1' });
  await fastify.register(container.routes.payment, { prefix: '/api/v1' });
  await fastify.register(container.routes.inventory, { prefix: '/api/v1' });
  await fastify.register(container.routes.shipping, { prefix: '/api/v1' });
  await fastify.register(container.routes.catalog, { prefix: '/api/v1' });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
