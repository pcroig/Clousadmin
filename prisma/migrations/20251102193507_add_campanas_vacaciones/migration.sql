-- CreateTable
CREATE TABLE "campanas_vacaciones" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "alcance" VARCHAR(50) NOT NULL DEFAULT 'todos',
    "equipoIds" JSONB,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'abierta',
    "solapamientoMaximoPct" INTEGER NOT NULL DEFAULT 30,
    "propuestaIA" JSONB,
    "totalEmpleadosAsignados" INTEGER NOT NULL DEFAULT 0,
    "empleadosCompletados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cerradaEn" TIMESTAMP(3),
    "cuadradaEn" TIMESTAMP(3),

    CONSTRAINT "campanas_vacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_vacaciones" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "diasIdeales" JSONB NOT NULL,
    "diasPrioritarios" JSONB,
    "diasAlternativos" JSONB,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "aceptada" BOOLEAN NOT NULL DEFAULT false,
    "propuestaIA" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_vacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campanas_vacaciones_empresaId_idx" ON "campanas_vacaciones"("empresaId");

-- CreateIndex
CREATE INDEX "campanas_vacaciones_estado_idx" ON "campanas_vacaciones"("estado");

-- CreateIndex
CREATE INDEX "preferencias_vacaciones_campanaId_idx" ON "preferencias_vacaciones"("campanaId");

-- CreateIndex
CREATE INDEX "preferencias_vacaciones_empleadoId_idx" ON "preferencias_vacaciones"("empleadoId");

-- CreateIndex
CREATE INDEX "preferencias_vacaciones_empresaId_idx" ON "preferencias_vacaciones"("empresaId");

-- CreateIndex
CREATE INDEX "preferencias_vacaciones_completada_idx" ON "preferencias_vacaciones"("completada");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_vacaciones_campanaId_empleadoId_key" ON "preferencias_vacaciones"("campanaId", "empleadoId");

-- AddForeignKey
ALTER TABLE "campanas_vacaciones" ADD CONSTRAINT "campanas_vacaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_vacaciones" ADD CONSTRAINT "preferencias_vacaciones_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas_vacaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_vacaciones" ADD CONSTRAINT "preferencias_vacaciones_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_vacaciones" ADD CONSTRAINT "preferencias_vacaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
