/*
  Warnings:

  - Made the column `ciudad` on table `sedes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "onboarding_empleados" ALTER COLUMN "progreso" SET DEFAULT '{"datos_personales": false, "datos_bancarios": false, "datos_documentos": false}';

-- AlterTable
ALTER TABLE "sedes" ALTER COLUMN "ciudad" SET NOT NULL;

-- CreateTable
CREATE TABLE "onboarding_configs" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "camposRequeridos" JSONB NOT NULL DEFAULT '{"datos_personales":{"nif":true,"nss":true,"telefono":true,"direccionCalle":true,"direccionNumero":true,"codigoPostal":true,"ciudad":true,"direccionProvincia":true,"direccionPiso":false,"estadoCivil":false,"numeroHijos":false},"datos_bancarios":{"iban":true,"titularCuenta":true}}',
    "documentosRequeridos" JSONB NOT NULL DEFAULT '[]',
    "plantillasDocumentos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_configs_empresaId_key" ON "onboarding_configs"("empresaId");

-- CreateIndex
CREATE INDEX "onboarding_configs_empresaId_idx" ON "onboarding_configs"("empresaId");

-- CreateIndex
CREATE INDEX "nominas_documentoId_idx" ON "nominas"("documentoId");

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_configs" ADD CONSTRAINT "onboarding_configs_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
