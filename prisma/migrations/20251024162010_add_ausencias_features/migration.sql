/*
  Warnings:

  - Added the required column `diasSolicitados` to the `ausencias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo` to the `festivos` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."festivos_empresaId_idx";

-- DropIndex
DROP INDEX "public"."festivos_fecha_idx";

-- AlterTable
ALTER TABLE "ausencias" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "descuentaSaldo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diasAlternativos" JSONB,
ADD COLUMN     "diasIdeales" JSONB,
ADD COLUMN     "diasPrioritarios" JSONB,
ADD COLUMN     "diasSolicitados" DECIMAL(4,1),
ADD COLUMN     "equipoId" TEXT,
ADD COLUMN     "justificanteUrl" TEXT,
ADD COLUMN     "medioDia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisionIA" JSONB;

-- Populate diasSolicitados for existing records
UPDATE "ausencias" SET "diasSolicitados" = "diasLaborables" WHERE "diasSolicitados" IS NULL;

-- Make diasSolicitados NOT NULL after populating
ALTER TABLE "ausencias" ALTER COLUMN "diasSolicitados" SET NOT NULL;

-- AlterTable
ALTER TABLE "festivos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comunidadAutonoma" VARCHAR(100),
ADD COLUMN     "origen" VARCHAR(50) NOT NULL DEFAULT 'manual',
ADD COLUMN     "tipo" VARCHAR(50);

-- Populate tipo for existing festivos
UPDATE "festivos" SET "tipo" = 'nacional' WHERE "tipo" IS NULL;

-- Make tipo NOT NULL after populating
ALTER TABLE "festivos" ALTER COLUMN "tipo" SET NOT NULL;

-- CreateTable
CREATE TABLE "empleado_saldo_ausencias" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "año" INTEGER NOT NULL,
    "diasTotales" INTEGER NOT NULL DEFAULT 0,
    "diasUsados" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "diasPendientes" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "origen" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleado_saldo_ausencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo_politica_ausencias" (
    "equipoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "maxSolapamientoPct" INTEGER NOT NULL DEFAULT 50,
    "requiereAntelacionDias" INTEGER NOT NULL DEFAULT 5,
    "permitePingPong" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipo_politica_ausencias_pkey" PRIMARY KEY ("equipoId")
);

-- CreateIndex
CREATE INDEX "empleado_saldo_ausencias_empleadoId_año_idx" ON "empleado_saldo_ausencias"("empleadoId", "año");

-- CreateIndex
CREATE INDEX "empleado_saldo_ausencias_empresaId_idx" ON "empleado_saldo_ausencias"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_saldo_ausencias_empleadoId_año_key" ON "empleado_saldo_ausencias"("empleadoId", "año");

-- CreateIndex
CREATE INDEX "equipo_politica_ausencias_empresaId_idx" ON "equipo_politica_ausencias"("empresaId");

-- CreateIndex
CREATE INDEX "ausencias_equipoId_idx" ON "ausencias"("equipoId");

-- CreateIndex
CREATE INDEX "festivos_empresaId_fecha_activo_idx" ON "festivos"("empresaId", "fecha", "activo");

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_saldo_ausencias" ADD CONSTRAINT "empleado_saldo_ausencias_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_saldo_ausencias" ADD CONSTRAINT "empleado_saldo_ausencias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_politica_ausencias" ADD CONSTRAINT "equipo_politica_ausencias_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_politica_ausencias" ADD CONSTRAINT "equipo_politica_ausencias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
