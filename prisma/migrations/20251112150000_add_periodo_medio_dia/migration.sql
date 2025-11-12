-- CreateEnum
CREATE TYPE "PeriodoMedioDia" AS ENUM ('manana', 'tarde');

-- AlterTable
ALTER TABLE "ausencias" ADD COLUMN "periodo" "PeriodoMedioDia";

