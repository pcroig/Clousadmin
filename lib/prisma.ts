// ========================================
// Prisma Client Singleton
// ========================================
// Prevents multiple instances in development (hot reload)
// Follows Prisma best practices for Next.js
// Optimized for production with connection pooling
// Lazy initialization to avoid environment variable timing issues

import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Production optimization: connection pooling
// RDS PostgreSQL recommended: connection_limit=10 for serverless
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL is not defined. ' +
      'Please create a .env.local file with DATABASE_URL="postgresql://..." ' +
      'See docs/SETUP.md for more information.'
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

// Lazy initialization: create Prisma client only when first accessed
// This ensures environment variables are loaded before Prisma initializes
function getPrismaInstance(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

// Export Prisma with lazy initialization
// The client is created only when first accessed, ensuring env vars are loaded
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = getPrismaInstance();
    const value = (instance as any)[prop];
    
    // If it's a function, bind it to maintain 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    
    return value;
  },
  has(_target, prop) {
    return prop in getPrismaInstance();
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getPrismaInstance());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getPrismaInstance(), prop);
  },
});

export { Prisma };
