-- AlterTable
ALTER TABLE "empleados" ADD COLUMN "sedeId" TEXT;

-- CreateIndex
CREATE INDEX "empleados_sedeId_idx" ON "empleados"("sedeId");

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
