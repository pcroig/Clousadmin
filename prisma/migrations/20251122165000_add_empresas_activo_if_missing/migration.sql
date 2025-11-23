-- Garantizar columna de estado activo en empresas (idempotente)
ALTER TABLE "empresas"
ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE "empresas"
SET "activo" = TRUE
WHERE "activo" IS NULL;


