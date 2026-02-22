import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

process.stderr.write('[DEBUG] prisma-client.ts: before new PrismaClient()\n');
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
  });
process.stderr.write('[DEBUG] prisma-client.ts: after new PrismaClient()\n');

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
