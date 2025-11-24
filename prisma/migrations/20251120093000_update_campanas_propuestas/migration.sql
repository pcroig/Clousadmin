-- Add new columns to preferencias_vacaciones
ALTER TABLE "preferencias_vacaciones"
  ADD COLUMN "propuestaEnviada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cambioSolicitado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "propuestaEmpleado" JSONB;

-- Add finalizadaEn column to campanas_vacaciones
ALTER TABLE "campanas_vacaciones"
  ADD COLUMN "finalizadaEn" TIMESTAMP(3);

-- Ensure estado column allows new states by updating comment (informational)
COMMENT ON COLUMN "campanas_vacaciones"."estado" IS 'abierta | borrador_generado | propuesta_enviada | finalizada';









