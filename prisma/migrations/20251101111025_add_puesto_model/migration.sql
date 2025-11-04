/*
  Warnings:

  - You are about to drop the column `metodo` on the `fichaje_eventos` table. All the data in the column will be lost.
  - You are about to drop the column `aprobadoPor` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `motivoAlerta` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `motivoRechazo` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `notas` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `scoreAlerta` on the `fichajes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ausencias" ALTER COLUMN "estado" SET DEFAULT 'pendiente_aprobacion';

-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "puestoId" TEXT;

-- AlterTable
ALTER TABLE "fichaje_eventos" DROP COLUMN "metodo";

-- AlterTable
ALTER TABLE "fichajes" DROP COLUMN "aprobadoPor",
DROP COLUMN "motivoAlerta",
DROP COLUMN "motivoRechazo",
DROP COLUMN "notas",
DROP COLUMN "scoreAlerta";

-- CreateTable
CREATE TABLE "puestos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puestos_empresaId_idx" ON "puestos"("empresaId");

-- CreateIndex
CREATE INDEX "empleados_puestoId_idx" ON "empleados"("puestoId");

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
