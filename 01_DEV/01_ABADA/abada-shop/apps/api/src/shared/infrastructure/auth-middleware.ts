import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenIssuer } from '../../user/application/port/token-issuer.js';

const PUBLIC_PATHS = new Set([
  '/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
]);

export function createAuthMiddleware(tokenIssuer: TokenIssuer) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (PUBLIC_PATHS.has(req.url)) return;

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      // Not all routes require auth - let route handlers decide
      return;
    }

    const token = auth.slice(7);
    try {
      const payload = await tokenIssuer.verifyAccessToken(token);
      (req as any).user = payload;
    } catch {
      // Invalid token - route handlers will return 401 if auth is required
    }
  };
}
