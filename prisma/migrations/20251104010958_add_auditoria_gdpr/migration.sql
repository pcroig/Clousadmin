-- CreateTable
CREATE TABLE "auditoria_accesos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empleadoAccedidoId" TEXT,
    "accion" VARCHAR(50) NOT NULL,
    "recurso" VARCHAR(100) NOT NULL,
    "camposAccedidos" JSONB,
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_accesos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "otorgado" BOOLEAN NOT NULL DEFAULT false,
    "otorgadoEn" TIMESTAMP(3),
    "revocadoEn" TIMESTAMP(3),
    "version" VARCHAR(50) NOT NULL,
    "ipAddress" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consentimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_eliminacion_datos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "solicitantePor" TEXT NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT,
    "respuesta" TEXT,
    "completadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_eliminacion_datos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_accesos_empresaId_idx" ON "auditoria_accesos"("empresaId");

-- CreateIndex
CREATE INDEX "auditoria_accesos_usuarioId_idx" ON "auditoria_accesos"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoria_accesos_empleadoAccedidoId_idx" ON "auditoria_accesos"("empleadoAccedidoId");

-- CreateIndex
CREATE INDEX "auditoria_accesos_accion_idx" ON "auditoria_accesos"("accion");

-- CreateIndex
CREATE INDEX "auditoria_accesos_recurso_idx" ON "auditoria_accesos"("recurso");

-- CreateIndex
CREATE INDEX "auditoria_accesos_createdAt_idx" ON "auditoria_accesos"("createdAt");

-- CreateIndex
CREATE INDEX "consentimientos_empresaId_idx" ON "consentimientos"("empresaId");

-- CreateIndex
CREATE INDEX "consentimientos_empleadoId_idx" ON "consentimientos"("empleadoId");

-- CreateIndex
CREATE INDEX "consentimientos_tipo_idx" ON "consentimientos"("tipo");

-- CreateIndex
CREATE INDEX "consentimientos_otorgado_idx" ON "consentimientos"("otorgado");

-- CreateIndex
CREATE UNIQUE INDEX "consentimientos_empresaId_empleadoId_tipo_key" ON "consentimientos"("empresaId", "empleadoId", "tipo");

-- CreateIndex
CREATE INDEX "solicitudes_eliminacion_datos_empresaId_idx" ON "solicitudes_eliminacion_datos"("empresaId");

-- CreateIndex
CREATE INDEX "solicitudes_eliminacion_datos_empleadoId_idx" ON "solicitudes_eliminacion_datos"("empleadoId");

-- CreateIndex
CREATE INDEX "solicitudes_eliminacion_datos_estado_idx" ON "solicitudes_eliminacion_datos"("estado");

-- AddForeignKey
ALTER TABLE "auditoria_accesos" ADD CONSTRAINT "auditoria_accesos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_accesos" ADD CONSTRAINT "auditoria_accesos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_eliminacion_datos" ADD CONSTRAINT "solicitudes_eliminacion_datos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_eliminacion_datos" ADD CONSTRAINT "solicitudes_eliminacion_datos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
