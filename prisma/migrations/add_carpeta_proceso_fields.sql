-- Agregar campos para vincular carpetas a procesos de onboarding/offboarding
-- Fecha: 2025-11-13

ALTER TABLE carpeta ADD COLUMN IF NOT EXISTS "vinculadaAProceso" VARCHAR(50);
-- Valores posibles: 'onboarding', 'offboarding', NULL (sin vincular)

ALTER TABLE carpeta ADD COLUMN IF NOT EXISTS "requiereFirma" BOOLEAN DEFAULT false;
-- Indica si los documentos de esta carpeta requieren firma digital

ALTER TABLE carpeta ADD COLUMN IF NOT EXISTS "requiereRellenarDatos" BOOLEAN DEFAULT false;
-- Indica si requiere que el empleado rellene datos (campos) antes de generar documento

ALTER TABLE carpeta ADD COLUMN IF NOT EXISTS "camposRequeridos" JSONB;
-- Array de campos que el empleado debe rellenar: ["nif", "direccion", "iban"]

COMMENT ON COLUMN carpeta."vinculadaAProceso" IS 'Proceso al que está vinculada la carpeta: onboarding, offboarding, o NULL';
COMMENT ON COLUMN carpeta."requiereFirma" IS 'Si los documentos de esta carpeta requieren firma digital (Fase 2)';
COMMENT ON COLUMN carpeta."requiereRellenarDatos" IS 'Si requiere que el empleado complete campos antes de generar documento';
COMMENT ON COLUMN carpeta."camposRequeridos" IS 'Array JSON de campos que el empleado debe completar';

