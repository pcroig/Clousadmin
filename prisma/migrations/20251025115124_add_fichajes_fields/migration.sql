-- AlterTable
ALTER TABLE "fichajes" ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "editado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" VARCHAR(50) NOT NULL DEFAULT 'confirmado',
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "metodo" VARCHAR(50) NOT NULL DEFAULT 'manual',
ADD COLUMN     "motivoAlerta" TEXT,
ADD COLUMN     "motivoEdicion" TEXT,
ADD COLUMN     "scoreAlerta" INTEGER,
ADD COLUMN     "solicitadoPor" TEXT;

-- CreateIndex
CREATE INDEX "fichajes_estado_idx" ON "fichajes"("estado");
