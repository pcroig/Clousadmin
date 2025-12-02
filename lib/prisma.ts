// ========================================
// Prisma Client Singleton
// ========================================
// Prevents multiple instances in development (hot reload)
// Follows Prisma best practices for Next.js
// Optimized for production with connection pooling
// Lazy initialization to avoid environment variable timing issues

import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaLoggerAttached?: boolean;
};

const perf =
  typeof performance !== 'undefined'
    ? performance
    : { now: () => Date.now() };

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
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClientSingleton;
}

// Listener para queries lentas en desarrollo (activar solo cuando sea necesario)
if (process.env.NODE_ENV === 'development' && !globalForPrisma.prismaLoggerAttached) {
  prismaClientSingleton.$on('query' as never, (e: { query: string; duration: number }) => {
    // Log solo queries que tomen más de 100ms
    if (e.duration > 100) {
      console.warn(`🐌 [Prisma Slow Query] ${e.duration}ms\n${e.query}`);
    }
  });
  globalForPrisma.prismaLoggerAttached = true;
}

// Middleware de performance (opcional - activar con PRISMA_PERF_LOG=true)
if (
  process.env.PRISMA_PERF_LOG === 'true' &&
  !globalForPrisma.prismaLoggerAttached
) {
  let queryCounter = 0;
  const loggingMiddleware = async (
    params: { model?: string | null; action: string },
    next: (middlewareParams: unknown) => Promise<unknown>
  ) => {
    const start = perf.now();
    const result = await next(params);
    const duration = perf.now() - start;
    queryCounter += 1;
    
    // Colorear según el tiempo
    const emoji = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
    console.log(
      `${emoji} [Prisma][${queryCounter}] ${params.model ?? 'raw'}.${params.action} - ${duration.toFixed(2)}ms`
    );
    return result;
  };
  (prismaClientSingleton as unknown as { $use(middleware: typeof loggingMiddleware): void }).$use(
    loggingMiddleware
  );
}

const toCamelCase = (value: string): string =>
  value
    .split('_')
    .map((segment, index) =>
      index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)
    )
    .join('');

const vowelRegex = /[aeiouáéíóú]$/i;

const getSingularForms = (word: string): string[] => {
  if (word.endsWith('ces')) {
    return [`${word.slice(0, -3)}z`];
  }

  if (word.endsWith('iones')) {
    return [word.slice(0, -2)];
  }

  if (word.endsWith('es')) {
    const base = word.slice(0, -2);
    if (vowelRegex.test(base)) {
      return [base];
    }
    return [base, `${base}e`];
  }

  if (word.endsWith('s')) {
    return [word.slice(0, -1)];
  }

  return [word];
};

const cartesian = (lists: string[][]): string[][] =>
  lists.reduce<string[][]>(
    (acc, curr) => acc.flatMap((item) => curr.map((value) => [...item, value])),
    [[]]
  );

const buildAliasMap = () => {
  const map = new Map<string, string>();
  const modelNames = Prisma.ModelName as Record<string, string>;

  Object.values(modelNames).forEach((modelName) => {
    const camel = toCamelCase(modelName);
    map.set(camel, modelName);

    const parts = modelName.split('_').map((segment) => getSingularForms(segment));
    const variants = cartesian(parts);

    variants.forEach((variant) => {
      const alias = toCamelCase(variant.join('_'));
      map.set(alias, modelName);
    });
  });

  return map;
};

const prismaAliasMap = buildAliasMap();

const prismaWithAliases = new Proxy(prismaClientSingleton, {
  get(target, prop, receiver) {
    if (typeof prop === 'string') {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }

      const alias = prismaAliasMap.get(prop);
      if (alias && Reflect.has(target, alias)) {
        return Reflect.get(target, alias as keyof typeof target, receiver);
      }
    }

    return Reflect.get(target, prop, receiver);
  },
});

export const prisma = prismaWithAliases as PrismaClient;
export { Prisma };
