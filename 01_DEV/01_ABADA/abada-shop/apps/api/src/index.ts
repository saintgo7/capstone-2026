import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createContainer } from './config/container.js';
import { createAuthMiddleware } from './shared/infrastructure/auth-middleware.js';
import { healthRoutes } from './health/health-routes.js';
import {
  DomainError,
  ApplicationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from './shared/domain/index.js';
import { fail } from './shared/infrastructure/response-helper.js';
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

  // Global error handler - standardized { success: false, error: { code, message, details? } }
  fastify.setErrorHandler((error: any, _req, reply) => {
    // Fastify built-in errors (JSON parse error, validation, etc.)
    if ('statusCode' in error && typeof error.statusCode === 'number' && !(error.statusCode >= 500)) {
      const statusCode = error.statusCode as number;
      return reply.status(statusCode).send(fail(error.code ?? 'REQUEST_ERROR', error.message));
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(
        fail('VALIDATION_ERROR', 'Invalid request', error.errors),
      );
    }
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send(fail(error.code, error.message));
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send(fail(error.code, error.message));
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send(fail(error.code, error.message));
    }
    if (error instanceof ConflictError) {
      return reply.status(409).send(fail(error.code, error.message));
    }
    if (error instanceof ValidationError) {
      return reply.status(400).send(fail(error.code, error.message));
    }
    if (error instanceof DomainError) {
      return reply.status(422).send(fail('DOMAIN_ERROR', error.message));
    }
    if (error instanceof ApplicationError) {
      return reply.status(400).send(fail(error.code, error.message));
    }

    fastify.log.error(error);
    return reply.status(500).send(fail('INTERNAL_ERROR', 'Internal server error'));
  });

  // Health check routes (registered before auth middleware - no auth required)
  await fastify.register(healthRoutes, { prefix: '/health' });

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
  await fastify.register(container.routes.admin, { prefix: '/api/v1' });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
