-- Simplify digital signature tracking by removing non-essential fields

-- Drop optional provider metadata from solicitudes_firma
ALTER TABLE "solicitudes_firma"
DROP COLUMN IF EXISTS "proveedorData";

-- Remove optional tracking columns from firmas
ALTER TABLE "firmas"
DROP COLUMN IF EXISTS "vistoEn",
DROP COLUMN IF EXISTS "motivoRechazo",
DROP COLUMN IF EXISTS "recordatoriosEnviados",
DROP COLUMN IF EXISTS "ultimoRecordatorio";




