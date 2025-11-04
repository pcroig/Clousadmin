-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "web" VARCHAR(255);

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "sedeId" TEXT;

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "ciudad" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integraciones" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "proveedor" VARCHAR(100) NOT NULL,
    "config" JSONB,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integraciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sedes_empresaId_idx" ON "sedes"("empresaId");

-- CreateIndex
CREATE INDEX "integraciones_empresaId_idx" ON "integraciones"("empresaId");

-- CreateIndex
CREATE INDEX "integraciones_tipo_idx" ON "integraciones"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "integraciones_empresaId_tipo_proveedor_key" ON "integraciones"("empresaId", "tipo", "proveedor");

-- CreateIndex
CREATE INDEX "equipos_sedeId_idx" ON "equipos"("sedeId");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integraciones" ADD CONSTRAINT "integraciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
