'use server';

// ========================================
// Subscription helpers (Platform Admin)
// ========================================

import { prisma } from '@/lib/prisma';

let subscriptionTableExistsCache: boolean | null = null;

/**
 * Verifica si la tabla de suscripciones existe en la base de datos.
 * Cachea el resultado para evitar consultas repetidas en cada request.
 */
export async function hasSubscriptionTable(): Promise<boolean> {
  if (subscriptionTableExistsCache !== null) {
    return subscriptionTableExistsCache;
  }

  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'subscriptions'
      ) as "exists"
    `;

    subscriptionTableExistsCache = Boolean(result?.[0]?.exists);
  } catch (error) {
    console.error('[Platform] Error verificando tabla subscriptions:', error);
    subscriptionTableExistsCache = false;
  }

  return subscriptionTableExistsCache;
}

