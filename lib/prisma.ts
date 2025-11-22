// ========================================
// Prisma Client Singleton
// ========================================
// Prevents multiple instances in development (hot reload)
// Follows Prisma best practices for Next.js
// Optimized for production with connection pooling
// Lazy initialization to avoid environment variable timing issues

import { performance } from 'perf_hooks';

import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaLoggerAttached?: boolean;
};

// Production optimization: connection pooling
// RDS PostgreSQL recommended: connection_limit=10 for serverless
const getDatabaseUrl = () => {
  // Try multiple sources for DATABASE_URL
  const baseUrl = 
    process.env.DATABASE_URL || 
    process.env.NEXT_PUBLIC_DATABASE_URL ||
    (typeof window === 'undefined' ? process.env.DATABASE_URL : undefined);
  
  if (!baseUrl) {
    // Debug info
    console.error('[Prisma] DATABASE_URL no encontrada. Variables disponibles:', {
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      hasNEXT_PUBLIC_DATABASE_URL: !!process.env.NEXT_PUBLIC_DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      cwd: process.cwd(),
    });
    
    throw new Error(
      'DATABASE_URL is not defined. ' +
      'Please create a .env.local file with DATABASE_URL="postgresql://..." ' +
      'See docs/SETUP.md for more information. ' +
      'Make sure to restart the Next.js dev server after creating/updating .env.local'
    );
  }

  try {
    // In production, add connection pooling parameters if not already present
    if (process.env.NODE_ENV === 'production') {
      const url = new URL(baseUrl);
      
      // Add pooling parameters if not already set
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '10');
      }
      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20');
      }
      
      return url.toString();
    }
    
    return baseUrl;
  } catch (error) {
    // If DATABASE_URL is invalid format, provide helpful error
    throw new Error(
      `DATABASE_URL tiene un formato inválido. Debe ser una URL válida. ` +
      `Ejemplo: postgresql://user:password@localhost:5432/clousadmin. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const prismaClientSingleton =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClientSingleton;
}

if (
  process.env.PRISMA_PERF_LOG === 'true' &&
  !globalForPrisma.prismaLoggerAttached
) {
  let queryCounter = 0;
  prismaClientSingleton.$use(async (params, next) => {
    const start = performance.now();
    const result = await next(params);
    const duration = performance.now() - start;
    queryCounter += 1;
    console.log(
      `[Prisma][${queryCounter}] ${params.model ?? 'raw'}.${params.action} - ${duration.toFixed(2)}ms`
    );
    return result;
  });
  globalForPrisma.prismaLoggerAttached = true;
}

export const prisma = prismaClientSingleton;
export { Prisma };
