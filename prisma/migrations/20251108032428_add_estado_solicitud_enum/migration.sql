/*
  Warnings:

  - The `estado` column on the `solicitudes_cambio` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'requiere_revision', 'auto_aprobada', 'aprobada_manual', 'rechazada');

-- AlterTable
ALTER TABLE "solicitudes_cambio" ADD COLUMN     "requiereAprobacionManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisadaPorIA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisionIA" JSONB,
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente';

-- CreateIndex
CREATE INDEX "solicitudes_cambio_estado_idx" ON "solicitudes_cambio"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_empresaId_estado_idx" ON "solicitudes_cambio"("empresaId", "estado");
