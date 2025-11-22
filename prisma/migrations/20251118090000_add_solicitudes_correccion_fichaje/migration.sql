-- CreateEnum
CREATE TYPE "EstadoSolicitudCorreccionFichaje" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- CreateTable
CREATE TABLE "solicitudes_correccion_fichaje" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "empresaId" TEXT NOT NULL,
    "fichajeId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "estado" "EstadoSolicitudCorreccionFichaje" NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT NOT NULL,
    "detalles" JSONB NOT NULL,
    "respuesta" TEXT,
    "revisadaPor" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_correccion_fichaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fichaje_empresaId_idx" ON "solicitudes_correccion_fichaje"("empresaId");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fichaje_fichajeId_idx" ON "solicitudes_correccion_fichaje"("fichajeId");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fichaje_empleadoId_idx" ON "solicitudes_correccion_fichaje"("empleadoId");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fichaje_estado_idx" ON "solicitudes_correccion_fichaje"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fichaje_revisadaPor_idx" ON "solicitudes_correccion_fichaje"("revisadaPor");

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fichaje" ADD CONSTRAINT "solicitudes_correccion_fichaje_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fichaje" ADD CONSTRAINT "solicitudes_correccion_fichaje_fichajeId_fkey" FOREIGN KEY ("fichajeId") REFERENCES "fichajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fichaje" ADD CONSTRAINT "solicitudes_correccion_fichaje_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fichaje" ADD CONSTRAINT "solicitudes_correccion_fichaje_revisadaPor_fkey" FOREIGN KEY ("revisadaPor") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

