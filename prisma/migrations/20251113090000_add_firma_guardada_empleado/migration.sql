-- AlterTable: Add saved signature fields to empleados table
-- Allows employees to save their signature for quick signing

ALTER TABLE "empleados"
ADD COLUMN "firmaGuardada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "firmaS3Key" TEXT,
ADD COLUMN "firmaGuardadaData" JSONB;

-- CreateIndex: Add index for employees with saved signatures (for querying)
CREATE INDEX "empleados_firmaGuardada_idx" ON "empleados"("firmaGuardada");
