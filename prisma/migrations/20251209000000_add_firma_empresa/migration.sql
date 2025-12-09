-- AlterTable
ALTER TABLE "empresas" ADD COLUMN "firmaEmpresaGuardada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "empresas" ADD COLUMN "firmaEmpresaS3Key" TEXT;
ALTER TABLE "empresas" ADD COLUMN "firmaEmpresaGuardadaData" JSONB;
ALTER TABLE "empresas" ADD COLUMN "firmaEmpresaGuardadaEn" TIMESTAMP(3);
