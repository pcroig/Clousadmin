-- CreateTable
CREATE TABLE "compensaciones_horas_extra" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "horasBalance" DECIMAL(5,2) NOT NULL,
    "tipoCompensacion" VARCHAR(50) NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "diasAusencia" DECIMAL(4,1),
    "ausenciaId" TEXT,
    "nominaId" TEXT,
    "aprobadoPor" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensaciones_horas_extra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compensaciones_horas_extra_ausenciaId_key" ON "compensaciones_horas_extra"("ausenciaId");

-- CreateIndex
CREATE INDEX "compensaciones_horas_extra_empresaId_idx" ON "compensaciones_horas_extra"("empresaId");

-- CreateIndex
CREATE INDEX "compensaciones_horas_extra_empleadoId_idx" ON "compensaciones_horas_extra"("empleadoId");

-- CreateIndex
CREATE INDEX "compensaciones_horas_extra_estado_idx" ON "compensaciones_horas_extra"("estado");

-- AddForeignKey
ALTER TABLE "compensaciones_horas_extra" ADD CONSTRAINT "compensaciones_horas_extra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensaciones_horas_extra" ADD CONSTRAINT "compensaciones_horas_extra_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensaciones_horas_extra" ADD CONSTRAINT "compensaciones_horas_extra_ausenciaId_fkey" FOREIGN KEY ("ausenciaId") REFERENCES "ausencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
