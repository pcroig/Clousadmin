-- AlterTable
ALTER TABLE "carpetas" ADD COLUMN     "asignadoA" TEXT,
ADD COLUMN     "compartida" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "carpetas_compartida_idx" ON "carpetas"("compartida");
