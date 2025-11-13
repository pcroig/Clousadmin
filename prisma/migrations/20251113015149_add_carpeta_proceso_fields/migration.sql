-- AlterTable
ALTER TABLE "carpetas" ADD COLUMN IF NOT EXISTS "vinculadaAProceso" VARCHAR(50);
ALTER TABLE "carpetas" ADD COLUMN IF NOT EXISTS "requiereFirma" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "carpetas" ADD COLUMN IF NOT EXISTS "requiereRellenarDatos" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "carpetas" ADD COLUMN IF NOT EXISTS "camposRequeridos" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "carpetas_vinculadaAProceso_idx" ON "carpetas"("vinculadaAProceso");
