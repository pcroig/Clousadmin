-- ========================================
-- Migración: Añadir Campos para Nuevo Workflow de Nóminas
-- ========================================
-- Esta migración añade los campos necesarios para el nuevo flujo de nóminas

-- 1. Añadir campo tipoPagas en contratos
ALTER TABLE "contratos" ADD COLUMN "tipoPagas" SMALLINT NOT NULL DEFAULT 12;

-- Añadir constraint para valores válidos (12, 14, 15 pagas)
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_tipoPagas_check"
  CHECK ("tipoPagas" IN (12, 14, 15));

-- Crear índice para tipoPagas
CREATE INDEX "contratos_tipoPagas_idx" ON "contratos"("tipoPagas");

-- 2. Modificar eventos_nomina para nuevo workflow
-- Renombrar fechaGeneracion a fechaCreacion (preservando datos)
ALTER TABLE "eventos_nomina" RENAME COLUMN "fechaGeneracion" TO "fechaCreacion";

-- Añadir nuevos campos
ALTER TABLE "eventos_nomina" ADD COLUMN "fechaGeneracionPrenominas" TIMESTAMP(3);
ALTER TABLE "eventos_nomina" ADD COLUMN "compensarHoras" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "eventos_nomina" ADD COLUMN "prenominasGeneradas" INTEGER NOT NULL DEFAULT 0;

-- Cambiar default del estado de "abierto" a "pendiente"
ALTER TABLE "eventos_nomina" ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- Crear nuevos índices
CREATE INDEX "eventos_nomina_compensarHoras_idx" ON "eventos_nomina"("compensarHoras");
CREATE INDEX "eventos_nomina_estado_fechaGeneracionPrenominas_idx"
  ON "eventos_nomina"("estado", "fechaGeneracionPrenominas");

-- 3. Añadir campos de extracción IA en nominas
ALTER TABLE "nominas" ADD COLUMN "totalDeduccionesExtraido" DECIMAL(10,2);
ALTER TABLE "nominas" ADD COLUMN "totalNetoExtraido" DECIMAL(10,2);
ALTER TABLE "nominas" ADD COLUMN "confianzaExtraccion" DECIMAL(3,2);
ALTER TABLE "nominas" ADD COLUMN "metodoExtraccion" VARCHAR(50);

-- Crear índices para análisis de extracción IA
CREATE INDEX "nominas_confianzaExtraccion_idx" ON "nominas"("confianzaExtraccion");
CREATE INDEX "nominas_metodoExtraccion_idx" ON "nominas"("metodoExtraccion");

-- 4. Migrar datos existentes
-- Copiar fechaCreacion a fechaGeneracionPrenominas para eventos que tienen nóminas
UPDATE "eventos_nomina"
SET "fechaGeneracionPrenominas" = "fechaCreacion"
WHERE "fechaCreacion" IS NOT NULL;

-- Actualizar prenominasGeneradas con el conteo real
UPDATE "eventos_nomina" e
SET "prenominasGeneradas" = (
  SELECT COUNT(*)
  FROM "nominas" n
  WHERE n."eventoNominaId" = e.id
);
