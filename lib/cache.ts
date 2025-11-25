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
type AsyncFn = (...args: any[]) => Promise<unknown>;

export function cachedQuery<TFunc extends AsyncFn>(
  fn: TFunc,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
): (...args: Parameters<TFunc>) => ReturnType<TFunc> {
  const { revalidate = CacheDurations.LISTINGS, tags = [] } = options;

  const cachedFn = unstable_cache(fn, keyParts, {
    revalidate,
    tags,
  });

  return ((...args: Parameters<TFunc>) => cachedFn(...args)) as (
    ...args: Parameters<TFunc>
  ) => ReturnType<TFunc>;
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

