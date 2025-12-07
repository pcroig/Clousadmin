-- AlterTable
ALTER TABLE "empleado_festivos" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "solicitudes_firma" ADD COLUMN     "pdfTemporalS3Key" TEXT;
