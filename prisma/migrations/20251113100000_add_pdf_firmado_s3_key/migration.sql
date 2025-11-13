-- AlterTable: Add PDF firmado field to solicitudes_firma table
-- Stores the S3 key of the PDF with visual signature marks (generated when all signatures complete)

ALTER TABLE "solicitudes_firma"
ADD COLUMN "pdfFirmadoS3Key" TEXT;

-- CreateIndex: Add index for querying completed signature requests with signed PDFs
CREATE INDEX "solicitudes_firma_pdfFirmadoS3Key_idx" ON "solicitudes_firma"("pdfFirmadoS3Key");
