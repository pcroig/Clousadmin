/*
  Warnings:

  - You are about to drop the column `accionRealizada` on the `auto_completados` table. All the data in the column will be lost.
  - You are about to drop the column `recursoId` on the `auto_completados` table. All the data in the column will be lost.
  - You are about to drop the column `revisadoEn` on the `auto_completados` table. All the data in the column will be lost.
  - You are about to drop the column `revisadoPor` on the `auto_completados` table. All the data in the column will be lost.
  - Added the required column `datosOriginales` to the `auto_completados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sugerencias` to the `auto_completados` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "auto_completados" DROP COLUMN "accionRealizada",
DROP COLUMN "recursoId",
DROP COLUMN "revisadoEn",
DROP COLUMN "revisadoPor",
ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "datosOriginales" JSONB NOT NULL,
ADD COLUMN     "sugerencias" JSONB NOT NULL,
ALTER COLUMN "expiraEn" DROP NOT NULL;
