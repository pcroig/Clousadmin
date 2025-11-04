/*
  Warnings:

  - Added the required column `fechaFinObjetivo` to the `campanas_vacaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaInicioObjetivo` to the `campanas_vacaciones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campanas_vacaciones" ADD COLUMN     "fechaFinObjetivo" DATE NOT NULL,
ADD COLUMN     "fechaInicioObjetivo" DATE NOT NULL;
