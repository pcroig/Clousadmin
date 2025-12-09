-- AlterTable
ALTER TABLE "solicitudes_firma" ADD COLUMN "posicionesFirmaEmpresa" JSONB;
ALTER TABLE "solicitudes_firma" ADD COLUMN "firmaEmpresaS3Key" TEXT;
