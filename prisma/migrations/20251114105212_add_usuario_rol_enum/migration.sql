/*
  Warnings:

  - You are about to drop the column `fecha` on the `denuncias` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFirma` on the `documentos` table. All the data in the column will be lost.
  - You are about to alter the column `año` on the `empleado_saldo_ausencias` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to drop the column `departamento` on the `empleados` table. All the data in the column will be lost.
  - You are about to alter the column `numeroHijos` on the `empleados` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The `tipoContrato` column on the `empleados` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `grupoCotizacion` on the `empleados` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The `estadoEmpleado` column on the `empleados` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tipo` column on the `equipos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `mes` on the `exports_gestoria` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `anio` on the `exports_gestoria` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The `estado` column on the `fichajes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `deducciones` on the `nominas` table. All the data in the column will be lost.
  - You are about to drop the column `salarioBruto` on the `nominas` table. All the data in the column will be lost.
  - You are about to drop the column `salarioNeto` on the `nominas` table. All the data in the column will be lost.
  - You are about to alter the column `mes` on the `nominas` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `anio` on the `nominas` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `mes` on the `resumenes_mensuales_nomina` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `anio` on the `resumenes_mensuales_nomina` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to drop the column `requiereOrden` on the `solicitudes_firma` table. All the data in the column will be lost.
  - You are about to alter the column `solicitadoPor` on the `solicitudes_firma` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The `rol` column on the `usuarios` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[empresaId,tipo,proveedor,usuarioId]` on the table `integraciones` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `tipo` on the `ausencias` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tipoContrato` on the `contratos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tipo` on the `fichaje_eventos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `salarioBase` to the `nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalBruto` to the `nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalNeto` to the `nominas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashDocumento` to the `solicitudes_firma` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombreDocumento` to the `solicitudes_firma` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulo` to the `solicitudes_firma` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UsuarioRol" AS ENUM ('platform_admin', 'hr_admin', 'manager', 'empleado');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('activo', 'baja', 'suspendido');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('indefinido', 'temporal', 'administrador', 'fijo_discontinuo', 'becario', 'practicas', 'obra_y_servicio');

-- CreateEnum
CREATE TYPE "TipoEquipo" AS ENUM ('proyecto', 'squad', 'temporal');

-- CreateEnum
CREATE TYPE "EstadoFichaje" AS ENUM ('en_curso', 'pendiente', 'finalizado');

-- CreateEnum
CREATE TYPE "TipoFichajeEvento" AS ENUM ('entrada', 'pausa_inicio', 'pausa_fin', 'salida');

-- CreateEnum
CREATE TYPE "TipoAusencia" AS ENUM ('vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro');

-- DropIndex
DROP INDEX "empleados_departamento_idx";

-- DropIndex
DROP INDEX "empleados_firmaGuardada_idx";

-- DropIndex
DROP INDEX "integraciones_empresaId_tipo_proveedor_key";

-- DropIndex
DROP INDEX "solicitudes_firma_pdfFirmadoS3Key_idx";

-- AlterTable
ALTER TABLE "ausencias" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoAusencia" NOT NULL;

-- AlterTable
ALTER TABLE "contratos" DROP COLUMN "tipoContrato",
ADD COLUMN     "tipoContrato" "TipoContrato" NOT NULL;

-- AlterTable
ALTER TABLE "denuncias" DROP COLUMN "fecha";

-- AlterTable
ALTER TABLE "documentos" DROP COLUMN "fechaFirma";

-- AlterTable
ALTER TABLE "documentos_generados" ADD COLUMN     "camposCompletados" JSONB,
ADD COLUMN     "pendienteRellenar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rellenadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "empleado_saldo_ausencias" ALTER COLUMN "año" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "empleados" DROP COLUMN "departamento",
ADD COLUMN     "nivelEducacion" VARCHAR(50),
ALTER COLUMN "numeroHijos" SET DATA TYPE SMALLINT,
DROP COLUMN "tipoContrato",
ADD COLUMN     "tipoContrato" "TipoContrato" NOT NULL DEFAULT 'indefinido',
ALTER COLUMN "grupoCotizacion" SET DATA TYPE SMALLINT,
DROP COLUMN "estadoEmpleado",
ADD COLUMN     "estadoEmpleado" "EstadoEmpleado" NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE "equipos" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoEquipo" NOT NULL DEFAULT 'proyecto';

-- AlterTable
ALTER TABLE "exports_gestoria" ALTER COLUMN "mes" SET DATA TYPE SMALLINT,
ALTER COLUMN "anio" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "fichaje_eventos" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoFichajeEvento" NOT NULL;

-- AlterTable
ALTER TABLE "fichajes" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoFichaje" NOT NULL DEFAULT 'en_curso';

-- AlterTable
ALTER TABLE "firmas" ADD COLUMN     "certificadoHash" TEXT,
ADD COLUMN     "datosCapturados" JSONB,
ADD COLUMN     "firmado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metodoCaptura" VARCHAR(50) NOT NULL DEFAULT 'click',
ADD COLUMN     "numRecordatorios" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tipo" VARCHAR(50) NOT NULL DEFAULT 'simple',
ALTER COLUMN "enviadoEn" DROP NOT NULL,
ALTER COLUMN "enviadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "integraciones" ADD COLUMN     "calendarId" VARCHAR(255),
ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "nominas" DROP COLUMN "deducciones",
DROP COLUMN "salarioBruto",
DROP COLUMN "salarioNeto",
ADD COLUMN     "complementosPendientes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contratoId" TEXT,
ADD COLUMN     "diasAusencias" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "diasTrabajados" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "eventoNominaId" TEXT,
ADD COLUMN     "exportadaEn" TIMESTAMP(3),
ADD COLUMN     "salarioBase" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalBruto" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalComplementos" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalDeducciones" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalNeto" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "mes" SET DATA TYPE SMALLINT,
ALTER COLUMN "anio" SET DATA TYPE SMALLINT,
ALTER COLUMN "estado" SET DEFAULT 'pre_nomina';

-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "eventoNominaId" TEXT;

-- AlterTable
ALTER TABLE "onboarding_empleados" ADD COLUMN     "tipoOnboarding" VARCHAR(20) NOT NULL DEFAULT 'completo';

-- AlterTable
ALTER TABLE "plantillas_documentos" ADD COLUMN     "autoGenerarOffboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoGenerarOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permiteRellenar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiereRevision" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "resumenes_mensuales_nomina" ALTER COLUMN "mes" SET DATA TYPE SMALLINT,
ALTER COLUMN "anio" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "solicitudes_firma" DROP COLUMN "requiereOrden",
ADD COLUMN     "creadoPor" VARCHAR(100),
ADD COLUMN     "diasRecordatorio" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "hashDocumento" TEXT NOT NULL,
ADD COLUMN     "motivoCancelacion" TEXT,
ADD COLUMN     "nombreDocumento" VARCHAR(255) NOT NULL,
ADD COLUMN     "ordenFirma" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordatorioAutomatico" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "titulo" VARCHAR(255) NOT NULL,
ALTER COLUMN "solicitadoPor" DROP NOT NULL,
ALTER COLUMN "solicitadoPor" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "solicitadoEn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "googleId" VARCHAR(255),
DROP COLUMN "rol",
ADD COLUMN     "rol" "UsuarioRol" NOT NULL DEFAULT 'empleado';

-- CreateTable
CREATE TABLE "eventos_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" SMALLINT NOT NULL,
    "anio" SMALLINT NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'generando',
    "fechaGeneracion" TIMESTAMP(3),
    "fechaLimiteComplementos" TIMESTAMP(3),
    "fechaExportacion" TIMESTAMP(3),
    "fechaImportacion" TIMESTAMP(3),
    "fechaPublicacion" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "totalEmpleados" INTEGER NOT NULL DEFAULT 0,
    "empleadosConComplementos" INTEGER NOT NULL DEFAULT 0,
    "complementosAsignados" INTEGER NOT NULL DEFAULT 0,
    "nominasImportadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_complemento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "esImporteFijo" BOOLEAN NOT NULL DEFAULT true,
    "importeFijo" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_complemento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado_complementos" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipoComplementoId" TEXT NOT NULL,
    "contratoId" TEXT,
    "importePersonalizado" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "validadoPor" TEXT,
    "fechaValidacion" TIMESTAMP(3),
    "rechazado" BOOLEAN NOT NULL DEFAULT false,
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleado_complementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_complemento" (
    "id" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "empleadoComplementoId" TEXT NOT NULL,
    "importe" DECIMAL(10,2) NOT NULL,
    "asignadoPor" TEXT,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_complemento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_nomina_empresaId_estado_idx" ON "eventos_nomina"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "eventos_nomina_empresaId_mes_anio_idx" ON "eventos_nomina"("empresaId", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_nomina_empresaId_mes_anio_key" ON "eventos_nomina"("empresaId", "mes", "anio");

-- CreateIndex
CREATE INDEX "tipos_complemento_empresaId_activo_idx" ON "tipos_complemento"("empresaId", "activo");

-- CreateIndex
CREATE INDEX "empleado_complementos_empleadoId_activo_idx" ON "empleado_complementos"("empleadoId", "activo");

-- CreateIndex
CREATE INDEX "empleado_complementos_tipoComplementoId_idx" ON "empleado_complementos"("tipoComplementoId");

-- CreateIndex
CREATE INDEX "empleado_complementos_contratoId_idx" ON "empleado_complementos"("contratoId");

-- CreateIndex
CREATE INDEX "asignaciones_complemento_nominaId_idx" ON "asignaciones_complemento"("nominaId");

-- CreateIndex
CREATE INDEX "asignaciones_complemento_empleadoComplementoId_idx" ON "asignaciones_complemento"("empleadoComplementoId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_complemento_nominaId_empleadoComplementoId_key" ON "asignaciones_complemento"("nominaId", "empleadoComplementoId");

-- CreateIndex
CREATE INDEX "ausencias_tipo_idx" ON "ausencias"("tipo");

-- CreateIndex
CREATE INDEX "ausencias_empresaId_estado_idx" ON "ausencias"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "ausencias_empresaId_tipo_estado_idx" ON "ausencias"("empresaId", "tipo", "estado");

-- CreateIndex
CREATE INDEX "ausencias_empresaId_empleadoId_estado_idx" ON "ausencias"("empresaId", "empleadoId", "estado");

-- CreateIndex
CREATE INDEX "auto_completados_empresaId_tipo_estado_idx" ON "auto_completados"("empresaId", "tipo", "estado");

-- CreateIndex
CREATE INDEX "auto_completados_empresaId_estado_expiraEn_idx" ON "auto_completados"("empresaId", "estado", "expiraEn");

-- CreateIndex
CREATE INDEX "contratos_tipoContrato_idx" ON "contratos"("tipoContrato");

-- CreateIndex
CREATE INDEX "empleados_estadoEmpleado_idx" ON "empleados"("estadoEmpleado");

-- CreateIndex
CREATE INDEX "fichaje_eventos_tipo_idx" ON "fichaje_eventos"("tipo");

-- CreateIndex
CREATE INDEX "fichajes_estado_idx" ON "fichajes"("estado");

-- CreateIndex
CREATE INDEX "fichajes_empresaId_estado_idx" ON "fichajes"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "fichajes_empresaId_fecha_idx" ON "fichajes"("empresaId", "fecha");

-- CreateIndex
CREATE INDEX "fichajes_empresaId_empleadoId_fecha_idx" ON "fichajes"("empresaId", "empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "firmas_firmado_idx" ON "firmas"("firmado");

-- CreateIndex
CREATE INDEX "firmas_enviadoEn_idx" ON "firmas"("enviadoEn");

-- CreateIndex
CREATE INDEX "firmas_solicitudFirmaId_firmado_idx" ON "firmas"("solicitudFirmaId", "firmado");

-- CreateIndex
CREATE INDEX "firmas_empleadoId_firmado_idx" ON "firmas"("empleadoId", "firmado");

-- CreateIndex
CREATE INDEX "integraciones_usuarioId_idx" ON "integraciones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "integraciones_empresaId_tipo_proveedor_usuarioId_key" ON "integraciones"("empresaId", "tipo", "proveedor", "usuarioId");

-- CreateIndex
CREATE INDEX "nominas_contratoId_idx" ON "nominas"("contratoId");

-- CreateIndex
CREATE INDEX "nominas_eventoNominaId_idx" ON "nominas"("eventoNominaId");

-- CreateIndex
CREATE INDEX "nominas_empleadoId_estado_idx" ON "nominas"("empleadoId", "estado");

-- CreateIndex
CREATE INDEX "nominas_eventoNominaId_estado_idx" ON "nominas"("eventoNominaId", "estado");

-- CreateIndex
CREATE INDEX "notificaciones_eventoNominaId_idx" ON "notificaciones"("eventoNominaId");

-- CreateIndex
CREATE INDEX "solicitudes_firma_empresaId_estado_idx" ON "solicitudes_firma"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_firma_empresaId_createdAt_idx" ON "solicitudes_firma"("empresaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_googleId_key" ON "usuarios"("googleId");

-- CreateIndex
CREATE INDEX "usuarios_googleId_idx" ON "usuarios"("googleId");

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_eventoNominaId_fkey" FOREIGN KEY ("eventoNominaId") REFERENCES "eventos_nomina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_nomina" ADD CONSTRAINT "eventos_nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_complemento" ADD CONSTRAINT "tipos_complemento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_complementos" ADD CONSTRAINT "empleado_complementos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_complementos" ADD CONSTRAINT "empleado_complementos_tipoComplementoId_fkey" FOREIGN KEY ("tipoComplementoId") REFERENCES "tipos_complemento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_complementos" ADD CONSTRAINT "empleado_complementos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_complemento" ADD CONSTRAINT "asignaciones_complemento_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_complemento" ADD CONSTRAINT "asignaciones_complemento_empleadoComplementoId_fkey" FOREIGN KEY ("empleadoComplementoId") REFERENCES "empleado_complementos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_eventoNominaId_fkey" FOREIGN KEY ("eventoNominaId") REFERENCES "eventos_nomina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
