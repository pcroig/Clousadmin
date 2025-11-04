// ========================================
// Prisma Client Singleton
// ========================================
// Prevents multiple instances in development (hot reload)
// Follows Prisma best practices for Next.js

import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaInstance =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaInstance;
}

// Named exports (no default export)
export const prisma = prismaInstance;
export { Prisma };
