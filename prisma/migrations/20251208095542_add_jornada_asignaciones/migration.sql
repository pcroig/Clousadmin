-- CreateTable
CREATE TABLE "jornada_asignaciones" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nivelAsignacion" VARCHAR(20) NOT NULL,
    "equipoIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornada_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jornada_asignaciones_jornadaId_key" ON "jornada_asignaciones"("jornadaId");

-- CreateIndex
CREATE INDEX "jornada_asignaciones_jornadaId_idx" ON "jornada_asignaciones"("jornadaId");

-- CreateIndex
CREATE INDEX "jornada_asignaciones_empresaId_idx" ON "jornada_asignaciones"("empresaId");

-- CreateIndex
CREATE INDEX "jornada_asignaciones_nivelAsignacion_idx" ON "jornada_asignaciones"("nivelAsignacion");

-- AddForeignKey
ALTER TABLE "jornada_asignaciones" ADD CONSTRAINT "jornada_asignaciones_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada_asignaciones" ADD CONSTRAINT "jornada_asignaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
