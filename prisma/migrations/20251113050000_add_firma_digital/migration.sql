-- AlterTable: Add digital signature fields to documentos table
ALTER TABLE "documentos"
ADD COLUMN "requiereFirma" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "firmado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "firmadoEn" TIMESTAMP(3),
ADD COLUMN "hashDocumento" TEXT,
ADD COLUMN "generadoDesdePlantilla" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Add indexes for new documento fields
CREATE INDEX "documentos_requiereFirma_firmado_idx" ON "documentos"("requiereFirma", "firmado");
CREATE INDEX "documentos_generadoDesdePlantilla_idx" ON "documentos"("generadoDesdePlantilla");

-- CreateTable: SolicitudFirma - Digital signature workflow
CREATE TABLE "solicitudes_firma" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "mensaje" TEXT,
    "ordenFirma" BOOLEAN NOT NULL DEFAULT false,
    "proveedor" VARCHAR(50) NOT NULL DEFAULT 'interno',
    "recordatorioAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "diasRecordatorio" INTEGER NOT NULL DEFAULT 3,
    "nombreDocumento" VARCHAR(255) NOT NULL,
    "hashDocumento" TEXT NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "creadoPor" VARCHAR(100),
    "completadaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_firma_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Firma - Individual signatures
CREATE TABLE "firmas" (
    "id" TEXT NOT NULL,
    "solicitudFirmaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'simple',
    "metodoCaptura" VARCHAR(50) NOT NULL DEFAULT 'click',
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "firmadoEn" TIMESTAMP(3),
    "datosCapturados" JSONB,
    "ipAddress" VARCHAR(50),
    "certificadoHash" TEXT,
    "enviadoEn" TIMESTAMP(3),
    "ultimoRecordatorio" TIMESTAMP(3),
    "numRecordatorios" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firmas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes for solicitudes_firma
CREATE INDEX "solicitudes_firma_empresaId_idx" ON "solicitudes_firma"("empresaId");
CREATE INDEX "solicitudes_firma_documentoId_idx" ON "solicitudes_firma"("documentoId");
CREATE INDEX "solicitudes_firma_estado_idx" ON "solicitudes_firma"("estado");
CREATE INDEX "solicitudes_firma_empresaId_estado_idx" ON "solicitudes_firma"("empresaId", "estado");
CREATE INDEX "solicitudes_firma_empresaId_createdAt_idx" ON "solicitudes_firma"("empresaId", "createdAt");

-- CreateIndex: Indexes for firmas
CREATE UNIQUE INDEX "firmas_solicitudFirmaId_empleadoId_key" ON "firmas"("solicitudFirmaId", "empleadoId");
CREATE INDEX "firmas_solicitudFirmaId_idx" ON "firmas"("solicitudFirmaId");
CREATE INDEX "firmas_empleadoId_idx" ON "firmas"("empleadoId");
CREATE INDEX "firmas_firmado_idx" ON "firmas"("firmado");
CREATE INDEX "firmas_enviadoEn_idx" ON "firmas"("enviadoEn");
CREATE INDEX "firmas_solicitudFirmaId_firmado_idx" ON "firmas"("solicitudFirmaId", "firmado");
CREATE INDEX "firmas_empleadoId_firmado_idx" ON "firmas"("empleadoId", "firmado");

-- AddForeignKey: solicitudes_firma -> empresas
ALTER TABLE "solicitudes_firma" ADD CONSTRAINT "solicitudes_firma_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: solicitudes_firma -> documentos
ALTER TABLE "solicitudes_firma" ADD CONSTRAINT "solicitudes_firma_documentoId_fkey"
FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: firmas -> solicitudes_firma
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_solicitudFirmaId_fkey"
FOREIGN KEY ("solicitudFirmaId") REFERENCES "solicitudes_firma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: firmas -> empleados
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_empleadoId_fkey"
FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
