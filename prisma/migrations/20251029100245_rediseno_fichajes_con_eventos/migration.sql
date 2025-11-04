/*
  Warnings:

  - You are about to drop the column `editado` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `horaSalida` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `metodo` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `motivoEdicion` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `solicitadoPor` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `fichajes` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion` on the `fichajes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[empleadoId,fecha]` on the table `fichajes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."fichajes_tipo_idx";

-- AlterTable
ALTER TABLE "fichajes" DROP COLUMN "editado",
DROP COLUMN "hora",
DROP COLUMN "horaSalida",
DROP COLUMN "metodo",
DROP COLUMN "motivoEdicion",
DROP COLUMN "solicitadoPor",
DROP COLUMN "tipo",
DROP COLUMN "ubicacion",
ADD COLUMN     "horasEnPausa" DECIMAL(5,2),
ADD COLUMN     "horasTrabajadas" DECIMAL(5,2),
ADD COLUMN     "motivoRechazo" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'en_curso';

-- CreateTable
CREATE TABLE "fichaje_eventos" (
    "id" TEXT NOT NULL,
    "fichajeId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "hora" TIMESTAMPTZ(6) NOT NULL,
    "metodo" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "ubicacion" TEXT,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "motivoEdicion" TEXT,
    "horaOriginal" TIMESTAMPTZ(6),
    "editadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichaje_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fichaje_eventos_fichajeId_idx" ON "fichaje_eventos"("fichajeId");

-- CreateIndex
CREATE INDEX "fichaje_eventos_tipo_idx" ON "fichaje_eventos"("tipo");

-- CreateIndex
CREATE INDEX "fichaje_eventos_hora_idx" ON "fichaje_eventos"("hora");

-- CreateIndex
CREATE UNIQUE INDEX "fichajes_empleadoId_fecha_key" ON "fichajes"("empleadoId", "fecha");

-- AddForeignKey
ALTER TABLE "fichaje_eventos" ADD CONSTRAINT "fichaje_eventos_fichajeId_fkey" FOREIGN KEY ("fichajeId") REFERENCES "fichajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
