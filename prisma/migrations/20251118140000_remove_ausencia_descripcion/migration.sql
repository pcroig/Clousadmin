-- Merge descripcion data into motivo before dropping the column
UPDATE ausencias
SET motivo = COALESCE(NULLIF(motivo, ''), descripcion)
WHERE (motivo IS NULL OR btrim(motivo) = '')
  AND descripcion IS NOT NULL;

ALTER TABLE "ausencias"
DROP COLUMN "descripcion";










