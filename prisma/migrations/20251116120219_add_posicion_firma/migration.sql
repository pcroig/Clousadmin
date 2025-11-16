-- Add posicionFirma JSON column to solicitudes_firma
ALTER TABLE "solicitudes_firma"
ADD COLUMN IF NOT EXISTS "posicionFirma" JSONB;

