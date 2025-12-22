/**
 * Prisma Client Singleton
 * COD-9-006: Database client with connection pooling
 * 
 * Usage: import { prisma } from './prismaClient';
 * 
 * IMPORTANT: Set DATABASE_URL in .env before using
 * Example: DATABASE_URL="postgresql://user:pass@localhost:5432/merlin?schema=public"
 */

import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool configuration for production
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // Connection pool settings are configured via DATABASE_URL params:
    // ?connection_limit=10&pool_timeout=10
  });
};

// Export singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Check if database is available
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize database connection
 */
export async function initDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.warn('[Prisma] DATABASE_URL not set - using JSON file storage');
    return false;
  }

  try {
    await prisma.$connect();
    console.log('[Prisma] ✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('[Prisma] ❌ Database connection failed:', error);
    return false;
  }
}
