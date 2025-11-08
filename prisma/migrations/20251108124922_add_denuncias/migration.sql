-- CreateTable
CREATE TABLE "denuncias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "denuncianteId" TEXT,
    "descripcion" TEXT NOT NULL,
    "fechaIncidente" DATE,
    "ubicacion" TEXT,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "prioridad" VARCHAR(50) NOT NULL DEFAULT 'media',
    "esAnonima" BOOLEAN NOT NULL DEFAULT false,
    "asignadaA" TEXT,
    "asignadaEn" TIMESTAMP(3),
    "resueltaEn" TIMESTAMP(3),
    "resolucion" TEXT,
    "notasInternas" TEXT,
    "documentos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "denuncias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "denuncias_empresaId_estado_idx" ON "denuncias"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "denuncias_denuncianteId_idx" ON "denuncias"("denuncianteId");

-- CreateIndex
CREATE INDEX "denuncias_asignadaA_idx" ON "denuncias"("asignadaA");

-- CreateIndex
CREATE INDEX "denuncias_createdAt_idx" ON "denuncias"("createdAt");

-- AddForeignKey
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
