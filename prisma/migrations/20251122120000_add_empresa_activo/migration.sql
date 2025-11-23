-- Add activo flag to empresas for soft delete support
ALTER TABLE "empresas"
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT TRUE;


