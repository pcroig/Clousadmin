-- CreateEnum
CREATE TYPE "TipoFichaje" AS ENUM ('ordinario', 'extraordinario');

-- AlterTable
ALTER TABLE "fichajes" ADD COLUMN "tipoFichaje" "TipoFichaje" NOT NULL DEFAULT 'ordinario';

-- CreateIndex
CREATE INDEX "fichajes_tipoFichaje_idx" ON "fichajes"("tipoFichaje");

-- CreateIndex
CREATE INDEX "fichajes_empleadoId_tipoFichaje_fecha_idx" ON "fichajes"("empleadoId", "tipoFichaje", "fecha" DESC);
