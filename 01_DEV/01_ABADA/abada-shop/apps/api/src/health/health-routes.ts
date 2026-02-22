import { FastifyInstance } from 'fastify';
import { ok, fail } from '../shared/infrastructure/response-helper.js';
import { prisma } from '../shared/infrastructure/prisma-client.js';

const startedAt = Date.now();

// Read version once at module load
const VERSION = process.env['npm_package_version'] ?? '1.0.0';

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /health - basic liveness check (no external deps)
  fastify.get('/', async (_req, reply) => {
    return reply.send(
      ok({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
      }),
    );
  });

  // GET /health/ready - readiness check (DB + Redis connectivity)
  fastify.get('/ready', async (_req, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Database check
    try {
      const dbStart = Date.now();
      await prisma.$queryRawUnsafe('SELECT 1');
      checks['db'] = { status: 'ok', latency: Date.now() - dbStart };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      checks['db'] = { status: 'error', error: message };
    }

    // Redis check
    try {
      const { getRedisClient } = await import('../shared/infrastructure/redis-client.js');
      const redis = getRedisClient();
      if (redis) {
        const redisStart = Date.now();
        await redis.ping();
        checks['redis'] = { status: 'ok', latency: Date.now() - redisStart };
      } else {
        checks['redis'] = { status: 'not_configured' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      checks['redis'] = { status: 'error', error: message };
    }

    const allOk = Object.values(checks).every(
      (c) => c.status === 'ok' || c.status === 'not_configured',
    );
    const status = allOk ? 'ready' : 'not_ready';
    const statusCode = allOk ? 200 : 503;

    return reply.status(statusCode).send(
      allOk
        ? ok({ status, checks })
        : fail('NOT_READY', 'One or more dependencies are unavailable', { status, checks }),
    );
  });
}
