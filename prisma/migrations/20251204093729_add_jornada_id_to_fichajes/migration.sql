-- AlterTable
ALTER TABLE "fichajes" ADD COLUMN     "jornadaId" TEXT;

-- CreateIndex
CREATE INDEX "fichajes_empleadoId_jornadaId_estado_fecha_idx" ON "fichajes"("empleadoId", "jornadaId", "estado", "fecha");

-- AddForeignKey
ALTER TABLE "fichajes" ADD CONSTRAINT "fichajes_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
