import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Returns the shared Redis client, or null if REDIS_URL is not configured.
 * Lazily initializes on first call.
 */
export function getRedisClient(): Redis | null {
  const url = process.env['REDIS_URL'];
  if (!url) return null;

  if (!redisClient) {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redisClient.connect().catch(() => {
      // Connection errors are handled by callers via ping/command failures
    });
  }
  return redisClient;
}
