// ========================================
// Prisma Schema Patches (self-healing)
// ========================================
// Utilities to ensure critical columns exist even if migrations
// were not executed (e.g., legacy databases or manual setups).
// These helpers run once per process and apply idempotent ALTER TABLE clauses.

import { prisma } from '@/lib/prisma';

let empresaActivoEnsured = false;
let empresaActivoEnsuring: Promise<void> | null = null;

/**
 * Garantiza que la columna empresas.activo existe.
 * Si no existe (bases antiguas), la crea y la rellena con TRUE.
 */
export async function ensureEmpresaActivoColumn(): Promise<void> {
  if (empresaActivoEnsured) {
    return;
  }

  if (empresaActivoEnsuring) {
    await empresaActivoEnsuring;
    return;
  }

  empresaActivoEnsuring = (async () => {
    try {
      const result = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'empresas'
            AND column_name = 'activo'
        ) AS "exists";
      `;

      const exists = result[0]?.exists ?? false;

      if (!exists) {
        console.warn('[PrismaPatches] Falta empresas.activo. Aplicando parche automático.');
        await prisma.$executeRawUnsafe(
          'ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT TRUE'
        );
        await prisma.$executeRawUnsafe('UPDATE "empresas" SET "activo" = TRUE WHERE "activo" IS NULL');
      }

      empresaActivoEnsured = true;
    } catch (error) {
      console.error('[PrismaPatches] Error asegurando empresas.activo:', error);
      throw error;
    } finally {
      empresaActivoEnsuring = null;
    }
  })();

  await empresaActivoEnsuring;
}

