-- ========================================
-- PLANTILLAS DE DOCUMENTOS Y FIRMA DIGITAL
-- ========================================

-- PlantillaDocumento - Template storage and metadata
CREATE TABLE "plantillas_documentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "categoria" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "formato" VARCHAR(20) NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" VARCHAR(255) NOT NULL,
    "variablesUsadas" JSONB NOT NULL DEFAULT '[]',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "esOficial" BOOLEAN NOT NULL DEFAULT false,
    "requiereContrato" BOOLEAN NOT NULL DEFAULT false,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT false,
    "carpetaDestinoDefault" VARCHAR(50),
    "usarIAParaExtraer" BOOLEAN NOT NULL DEFAULT false,
    "configuracionIA" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_documentos_pkey" PRIMARY KEY ("id")
);

-- DocumentoGenerado - Documents generated from templates
CREATE TABLE "documentos_generados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "generadoPor" TEXT,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variablesUtilizadas" JSONB NOT NULL,
    "usadaIA" BOOLEAN NOT NULL DEFAULT false,
    "confianzaIA" DECIMAL(3,2),
    "tiempoGeneracion" INTEGER,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "visto" BOOLEAN NOT NULL DEFAULT false,
    "vistoEn" TIMESTAMP(3),
    "requiereFirma" BOOLEAN NOT NULL DEFAULT false,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "firmadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_generados_pkey" PRIMARY KEY ("id")
);

-- VariableMapping - Cache de mappings de variables resueltos por IA
CREATE TABLE "variable_mappings" (
    "id" TEXT NOT NULL,
    "variableName" VARCHAR(200) NOT NULL,
    "jsonPath" TEXT NOT NULL,
    "requiresDecryption" BOOLEAN NOT NULL DEFAULT false,
    "requiresFormatting" BOOLEAN NOT NULL DEFAULT false,
    "formatType" VARCHAR(50),
    "formatPattern" VARCHAR(100),
    "generadoPorIA" BOOLEAN NOT NULL DEFAULT true,
    "confianza" DECIMAL(3,2) NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "vecesUsado" INTEGER NOT NULL DEFAULT 0,
    "ultimoUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variable_mappings_pkey" PRIMARY KEY ("id")
);

-- JobGeneracionDocumentos - Background jobs para generación asíncrona
CREATE TABLE "jobs_generacion_documentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "solicitadoPor" TEXT NOT NULL,
    "empleadoIds" JSONB NOT NULL,
    "configuracion" JSONB NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'en_cola',
    "progreso" SMALLINT NOT NULL DEFAULT 0,
    "totalEmpleados" INTEGER NOT NULL,
    "procesados" INTEGER NOT NULL DEFAULT 0,
    "exitosos" INTEGER NOT NULL DEFAULT 0,
    "fallidos" INTEGER NOT NULL DEFAULT 0,
    "iniciadoEn" TIMESTAMP(3),
    "completadoEn" TIMESTAMP(3),
    "tiempoTotal" INTEGER,
    "resultados" JSONB,
    "error" TEXT,
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "ultimoIntento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_generacion_documentos_pkey" PRIMARY KEY ("id")
);

-- SolicitudFirma - Tracking de solicitudes de firma de documentos
CREATE TABLE "solicitudes_firma" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "solicitadoPor" TEXT NOT NULL,
    "solicitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensaje" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "requiereOrden" BOOLEAN NOT NULL DEFAULT false,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'individual',
    "proveedor" VARCHAR(50) NOT NULL DEFAULT 'interno',
    "proveedorData" JSONB,
    "completadaEn" TIMESTAMP(3),
    "expiradaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_firma_pkey" PRIMARY KEY ("id")
);

-- Firma - Tracking individual de firma por empleado
CREATE TABLE "firmas" (
    "id" TEXT NOT NULL,
    "solicitudFirmaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vistoEn" TIMESTAMP(3),
    "firmadoEn" TIMESTAMP(3),
    "rechazadoEn" TIMESTAMP(3),
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "ubicacion" JSONB,
    "certificado" TEXT,
    "metodoFirma" VARCHAR(50),
    "motivoRechazo" TEXT,
    "recordatoriosEnviados" INTEGER NOT NULL DEFAULT 0,
    "ultimoRecordatorio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firmas_pkey" PRIMARY KEY ("id")
);

-- Add firma digital tracking fields to Documento
ALTER TABLE "documentos" ADD COLUMN "requiereFirma" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documentos" ADD COLUMN "firmado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documentos" ADD COLUMN "fechaFirma" TIMESTAMP(3);

-- ========================================
-- UNIQUE CONSTRAINTS
-- ========================================

CREATE UNIQUE INDEX "plantillas_documentos_s3Key_key" ON "plantillas_documentos"("s3Key");
CREATE UNIQUE INDEX "documentos_generados_documentoId_key" ON "documentos_generados"("documentoId");
CREATE UNIQUE INDEX "variable_mappings_variableName_key" ON "variable_mappings"("variableName");
CREATE UNIQUE INDEX "firmas_solicitudFirmaId_empleadoId_key" ON "firmas"("solicitudFirmaId", "empleadoId");

-- ========================================
-- INDEXES
-- ========================================

-- PlantillaDocumento indexes
CREATE INDEX "plantillas_documentos_empresaId_idx" ON "plantillas_documentos"("empresaId");
CREATE INDEX "plantillas_documentos_tipo_idx" ON "plantillas_documentos"("tipo");
CREATE INDEX "plantillas_documentos_categoria_idx" ON "plantillas_documentos"("categoria");
CREATE INDEX "plantillas_documentos_activa_idx" ON "plantillas_documentos"("activa");
CREATE INDEX "plantillas_documentos_esOficial_idx" ON "plantillas_documentos"("esOficial");

-- DocumentoGenerado indexes
CREATE INDEX "documentos_generados_empresaId_idx" ON "documentos_generados"("empresaId");
CREATE INDEX "documentos_generados_empleadoId_idx" ON "documentos_generados"("empleadoId");
CREATE INDEX "documentos_generados_plantillaId_idx" ON "documentos_generados"("plantillaId");
CREATE INDEX "documentos_generados_documentoId_idx" ON "documentos_generados"("documentoId");
CREATE INDEX "documentos_generados_generadoEn_idx" ON "documentos_generados"("generadoEn");
CREATE INDEX "documentos_generados_firmado_idx" ON "documentos_generados"("firmado");
CREATE INDEX "documentos_generados_usadaIA_idx" ON "documentos_generados"("usadaIA");

-- VariableMapping indexes
CREATE INDEX "variable_mappings_variableName_idx" ON "variable_mappings"("variableName");
CREATE INDEX "variable_mappings_ultimoUso_idx" ON "variable_mappings"("ultimoUso");

-- JobGeneracionDocumentos indexes
CREATE INDEX "jobs_generacion_documentos_empresaId_idx" ON "jobs_generacion_documentos"("empresaId");
CREATE INDEX "jobs_generacion_documentos_plantillaId_idx" ON "jobs_generacion_documentos"("plantillaId");
CREATE INDEX "jobs_generacion_documentos_estado_idx" ON "jobs_generacion_documentos"("estado");
CREATE INDEX "jobs_generacion_documentos_solicitadoPor_idx" ON "jobs_generacion_documentos"("solicitadoPor");
CREATE INDEX "jobs_generacion_documentos_createdAt_idx" ON "jobs_generacion_documentos"("createdAt");

-- SolicitudFirma indexes
CREATE INDEX "solicitudes_firma_empresaId_idx" ON "solicitudes_firma"("empresaId");
CREATE INDEX "solicitudes_firma_documentoId_idx" ON "solicitudes_firma"("documentoId");
CREATE INDEX "solicitudes_firma_estado_idx" ON "solicitudes_firma"("estado");
CREATE INDEX "solicitudes_firma_fechaLimite_idx" ON "solicitudes_firma"("fechaLimite");
CREATE INDEX "solicitudes_firma_tipo_idx" ON "solicitudes_firma"("tipo");
CREATE INDEX "solicitudes_firma_solicitadoPor_idx" ON "solicitudes_firma"("solicitadoPor");

-- Firma indexes
CREATE INDEX "firmas_solicitudFirmaId_idx" ON "firmas"("solicitudFirmaId");
CREATE INDEX "firmas_empleadoId_idx" ON "firmas"("empleadoId");
CREATE INDEX "firmas_estado_idx" ON "firmas"("estado");
CREATE INDEX "firmas_firmadoEn_idx" ON "firmas"("firmadoEn");

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- PlantillaDocumento foreign keys
ALTER TABLE "plantillas_documentos" ADD CONSTRAINT "plantillas_documentos_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DocumentoGenerado foreign keys
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_empleadoId_fkey"
  FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_plantillaId_fkey"
  FOREIGN KEY ("plantillaId") REFERENCES "plantillas_documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_documentoId_fkey"
  FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- JobGeneracionDocumentos foreign keys
ALTER TABLE "jobs_generacion_documentos" ADD CONSTRAINT "jobs_generacion_documentos_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs_generacion_documentos" ADD CONSTRAINT "jobs_generacion_documentos_plantillaId_fkey"
  FOREIGN KEY ("plantillaId") REFERENCES "plantillas_documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SolicitudFirma foreign keys
ALTER TABLE "solicitudes_firma" ADD CONSTRAINT "solicitudes_firma_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solicitudes_firma" ADD CONSTRAINT "solicitudes_firma_documentoId_fkey"
  FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Firma foreign keys
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_solicitudFirmaId_fkey"
  FOREIGN KEY ("solicitudFirmaId") REFERENCES "solicitudes_firma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "firmas" ADD CONSTRAINT "firmas_empleadoId_fkey"
  FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
