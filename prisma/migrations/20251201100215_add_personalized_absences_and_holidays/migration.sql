/*
  Warnings:

  - You are about to alter the column `bic` on the `empleados` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(11)`.

*/
-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "diasAusenciasPersonalizados" INTEGER,
ALTER COLUMN "bic" SET DATA TYPE VARCHAR(11);

-- CreateTable
CREATE TABLE "empleado_festivos" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "fecha" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleado_festivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "empleado_festivos_empleadoId_idx" ON "empleado_festivos"("empleadoId");

-- CreateIndex
CREATE INDEX "empleado_festivos_fecha_idx" ON "empleado_festivos"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_festivos_empleadoId_fecha_key" ON "empleado_festivos"("empleadoId", "fecha");

-- AddForeignKey
ALTER TABLE "empleado_festivos" ADD CONSTRAINT "empleado_festivos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
