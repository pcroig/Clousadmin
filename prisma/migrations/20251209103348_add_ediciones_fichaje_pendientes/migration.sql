-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "accionBoton" VARCHAR(50),
ADD COLUMN     "enlace" TEXT,
ADD COLUMN     "prioridad" VARCHAR(20) NOT NULL DEFAULT 'normal',
ADD COLUMN     "textoBoton" VARCHAR(100);

-- CreateTable
CREATE TABLE "ediciones_fichaje_pendientes" (
    "id" TEXT NOT NULL,
    "fichajeId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "editadoPor" TEXT NOT NULL,
    "notificacionId" TEXT NOT NULL,
    "cambios" JSONB NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprobadoEn" TIMESTAMP(3),
    "rechazadoEn" TIMESTAMP(3),

    CONSTRAINT "ediciones_fichaje_pendientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ediciones_fichaje_pendientes_notificacionId_key" ON "ediciones_fichaje_pendientes"("notificacionId");

-- CreateIndex
CREATE INDEX "ediciones_fichaje_pendientes_fichajeId_estado_idx" ON "ediciones_fichaje_pendientes"("fichajeId", "estado");

-- CreateIndex
CREATE INDEX "ediciones_fichaje_pendientes_empleadoId_estado_expiraEn_idx" ON "ediciones_fichaje_pendientes"("empleadoId", "estado", "expiraEn");

-- CreateIndex
CREATE INDEX "ediciones_fichaje_pendientes_empresaId_idx" ON "ediciones_fichaje_pendientes"("empresaId");

-- CreateIndex
CREATE INDEX "ediciones_fichaje_pendientes_estado_idx" ON "ediciones_fichaje_pendientes"("estado");

-- AddForeignKey
ALTER TABLE "ediciones_fichaje_pendientes" ADD CONSTRAINT "ediciones_fichaje_pendientes_fichajeId_fkey" FOREIGN KEY ("fichajeId") REFERENCES "fichajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ediciones_fichaje_pendientes" ADD CONSTRAINT "ediciones_fichaje_pendientes_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ediciones_fichaje_pendientes" ADD CONSTRAINT "ediciones_fichaje_pendientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ediciones_fichaje_pendientes" ADD CONSTRAINT "ediciones_fichaje_pendientes_editadoPor_fkey" FOREIGN KEY ("editadoPor") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ediciones_fichaje_pendientes" ADD CONSTRAINT "ediciones_fichaje_pendientes_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "notificaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
