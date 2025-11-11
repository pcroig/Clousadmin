-- ========================================
-- Refactor Fichajes: Eliminar Auto-completado IA
-- ========================================

-- Añadir campos de auditoría para cuadre masivo
ALTER TABLE "fichajes" ADD COLUMN IF NOT EXISTS "cuadradoMasivamente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fichajes" ADD COLUMN IF NOT EXISTS "cuadradoPor" TEXT;
ALTER TABLE "fichajes" ADD COLUMN IF NOT EXISTS "cuadradoEn" TIMESTAMP(3);

-- Cambiar estado 'revisado' a 'pendiente'
-- Los fichajes en estado 'revisado' ahora se consideran 'pendiente'
UPDATE "fichajes" SET estado = 'pendiente' WHERE estado = 'revisado';

-- Nota: Los campos autoCompletado y fechaAprobacion se mantienen por compatibilidad
-- pero están marcados como deprecated en el schema





