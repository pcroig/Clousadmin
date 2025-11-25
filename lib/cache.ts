// ========================================
// Cache Utilities - Next.js unstable_cache wrapper
// ========================================
// Provides safe caching for expensive operations
// Revalidation times based on data freshness requirements

import { unstable_cache } from 'next/cache';

/**
 * Cache configuration presets
 */
export const CacheDurations = {
  /** 5 seconds - Para datos que cambian frecuentemente */
  REALTIME: 5,
  /** 30 seconds - Para dashboards y analytics */
  DASHBOARD: 30,
  /** 5 minutes - Para listados con filtros */
  LISTINGS: 300,
  /** 15 minutes - Para datos relativamente estáticos */
  STATIC: 900,
  /** 1 hour - Para configuraciones de empresa */
  CONFIG: 3600,
  /** 1 day - Para festivos y datos anuales */
  DAILY: 86400,
} as const;

/**
 * Wrapper para unstable_cache con tipos seguros
 * 
 * @example
 * ```ts
 * const getDashboardData = cachedQuery(
 *   async (empresaId: string) => {
 *     return await prisma.empleado.findMany({
 *       where: { empresaId },
 *       select: { id: true, nombre: true },
 *     });
 *   },
 *   ['dashboard-empleados'],
 *   { revalidate: CacheDurations.DASHBOARD, tags: ['empleados'] }
 * );
 * ```
 */
export function cachedQuery<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
): T {
  const { revalidate = CacheDurations.LISTINGS, tags = [] } = options;

  return unstable_cache(fn, keyParts, {
    revalidate,
    tags,
  }) as T;
}

/**
 * Invalidar cache por tags
 * 
 * @example
 * ```ts
 * import { revalidateTag } from 'next/cache';
 * revalidateTag('empleados');
 * ```
 */
export { revalidateTag, revalidatePath } from 'next/cache';

