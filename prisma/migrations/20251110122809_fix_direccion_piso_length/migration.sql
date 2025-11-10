/*
  Warnings:

  - You are about to drop the column `asignadaA` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `asignadaEn` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `fechaIncidente` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `notasInternas` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `prioridad` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `resolucion` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `resueltaEn` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion` on the `denuncias` table. All the data in the column will be lost.
  - Added the required column `fecha` to the `denuncias` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "denuncias_asignadaA_idx";

-- DropIndex
DROP INDEX "denuncias_empresaId_estado_idx";

-- AlterTable
ALTER TABLE "denuncias" DROP COLUMN "asignadaA",
DROP COLUMN "asignadaEn",
DROP COLUMN "estado",
DROP COLUMN "fechaIncidente",
DROP COLUMN "notasInternas",
DROP COLUMN "prioridad",
DROP COLUMN "resolucion",
DROP COLUMN "resueltaEn",
DROP COLUMN "ubicacion",
ADD COLUMN     "fecha" DATE NOT NULL;

-- AlterTable
ALTER TABLE "empleados" ALTER COLUMN "direccionPiso" SET DATA TYPE VARCHAR(100);

-- CreateIndex
CREATE INDEX "denuncias_empresaId_idx" ON "denuncias"("empresaId");
