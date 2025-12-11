-- CreateTable
CREATE TABLE "fichaje_eventos_propuestos" (
    "id" TEXT NOT NULL,
    "fichajeId" TEXT NOT NULL,
    "tipo" "TipoFichajeEvento" NOT NULL,
    "hora" TIMESTAMPTZ(6) NOT NULL,
    "metodo" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichaje_eventos_propuestos_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "fichajes" ADD COLUMN "eventosPropuestosCalculados" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "fichaje_eventos_propuestos_fichajeId_idx" ON "fichaje_eventos_propuestos"("fichajeId");

-- CreateIndex
CREATE INDEX "fichaje_eventos_propuestos_tipo_idx" ON "fichaje_eventos_propuestos"("tipo");

-- CreateIndex
CREATE INDEX "fichajes_eventosPropuestosCalculados_idx" ON "fichajes"("eventosPropuestosCalculados");

-- AddForeignKey
ALTER TABLE "fichaje_eventos_propuestos" ADD CONSTRAINT "fichaje_eventos_propuestos_fichajeId_fkey" FOREIGN KEY ("fichajeId") REFERENCES "fichajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
