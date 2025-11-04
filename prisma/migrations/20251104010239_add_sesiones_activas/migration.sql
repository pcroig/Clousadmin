/*
  Warnings:

  - You are about to drop the column `severidad` on the `alertas_nomina` table. All the data in the column will be lost.
  - You are about to alter the column `tipo` on the `alertas_nomina` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(50)`.
  - You are about to drop the column `direccion` on the `empleados` table. All the data in the column will be lost.
  - You are about to drop the column `permitePingPong` on the `equipo_politica_ausencias` table. All the data in the column will be lost.
  - Added the required column `categoria` to the `alertas_nomina` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `alertas_nomina` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."alertas_nomina_severidad_idx";

-- AlterTable
ALTER TABLE "alertas_nomina" DROP COLUMN "severidad",
ADD COLUMN     "accionUrl" TEXT,
ADD COLUMN     "categoria" VARCHAR(100) NOT NULL,
ADD COLUMN     "codigo" VARCHAR(100) NOT NULL,
ADD COLUMN     "detalles" JSONB,
ADD COLUMN     "empleadoId" TEXT,
ALTER COLUMN "nominaId" DROP NOT NULL,
ALTER COLUMN "tipo" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "puestoId" TEXT;

-- AlterTable
ALTER TABLE "empleados" DROP COLUMN "direccion",
ADD COLUMN     "direccionCalle" VARCHAR(200),
ADD COLUMN     "direccionNumero" VARCHAR(10),
ADD COLUMN     "direccionPiso" VARCHAR(10),
ADD COLUMN     "direccionProvincia" VARCHAR(100);

-- AlterTable
ALTER TABLE "equipo_politica_ausencias" DROP COLUMN "permitePingPong";

-- AlterTable
ALTER TABLE "nominas" ADD COLUMN     "empleadoNotificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "empleadoVisto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" VARCHAR(50) NOT NULL DEFAULT 'borrador',
ADD COLUMN     "fechaNotificacion" TIMESTAMP(3),
ADD COLUMN     "fechaPublicacion" TIMESTAMP(3),
ADD COLUMN     "fechaVisto" TIMESTAMP(3),
ADD COLUMN     "subidoPor" TEXT;

-- AlterTable
ALTER TABLE "sedes" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "ciudad" DROP NOT NULL;

-- CreateTable
CREATE TABLE "resumenes_mensuales_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasLaborables" INTEGER NOT NULL DEFAULT 0,
    "diasTrabajados" INTEGER NOT NULL DEFAULT 0,
    "diasVacaciones" INTEGER NOT NULL DEFAULT 0,
    "diasBajaIT" INTEGER NOT NULL DEFAULT 0,
    "diasPermisosRetribuidos" INTEGER NOT NULL DEFAULT 0,
    "diasPermisosNoRetribuidos" INTEGER NOT NULL DEFAULT 0,
    "horasTrabajadas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "horasExtras" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salarioBase" DECIMAL(10,2),
    "calculadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumenes_mensuales_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports_gestoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "archivoNombre" VARCHAR(255) NOT NULL,
    "generadoPor" TEXT,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numEmpleados" INTEGER,
    "numAlertasCriticas" INTEGER,

    CONSTRAINT "exports_gestoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_activas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_activas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_empleados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpira" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "fechaCompletado" TIMESTAMP(3),
    "progreso" JSONB NOT NULL DEFAULT '{"datos_personales": false, "datos_bancarios": false}',
    "datosTemporales" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones_signup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usada" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" TIMESTAMP(3),
    "invitadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_signup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" VARCHAR(200),
    "empresa" VARCHAR(200),
    "mensaje" TEXT,
    "invitado" BOOLEAN NOT NULL DEFAULT false,
    "invitadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resumenes_mensuales_nomina_empresaId_anio_mes_idx" ON "resumenes_mensuales_nomina"("empresaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "resumenes_mensuales_nomina_empleadoId_idx" ON "resumenes_mensuales_nomina"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "resumenes_mensuales_nomina_empresaId_empleadoId_mes_anio_key" ON "resumenes_mensuales_nomina"("empresaId", "empleadoId", "mes", "anio");

-- CreateIndex
CREATE INDEX "exports_gestoria_empresaId_anio_mes_idx" ON "exports_gestoria"("empresaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "exports_gestoria_generadoEn_idx" ON "exports_gestoria"("generadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_activas_tokenHash_key" ON "sesiones_activas"("tokenHash");

-- CreateIndex
CREATE INDEX "sesiones_activas_usuarioId_idx" ON "sesiones_activas"("usuarioId");

-- CreateIndex
CREATE INDEX "sesiones_activas_tokenHash_idx" ON "sesiones_activas"("tokenHash");

-- CreateIndex
CREATE INDEX "sesiones_activas_expiraEn_idx" ON "sesiones_activas"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_empleados_empleadoId_key" ON "onboarding_empleados"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_empleados_token_key" ON "onboarding_empleados"("token");

-- CreateIndex
CREATE INDEX "onboarding_empleados_token_idx" ON "onboarding_empleados"("token");

-- CreateIndex
CREATE INDEX "onboarding_empleados_empleadoId_idx" ON "onboarding_empleados"("empleadoId");

-- CreateIndex
CREATE INDEX "onboarding_empleados_empresaId_idx" ON "onboarding_empleados"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_signup_email_key" ON "invitaciones_signup"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_signup_token_key" ON "invitaciones_signup"("token");

-- CreateIndex
CREATE INDEX "invitaciones_signup_token_idx" ON "invitaciones_signup"("token");

-- CreateIndex
CREATE INDEX "invitaciones_signup_email_idx" ON "invitaciones_signup"("email");

-- CreateIndex
CREATE INDEX "invitaciones_signup_usada_idx" ON "invitaciones_signup"("usada");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist"("email");

-- CreateIndex
CREATE INDEX "waitlist_email_idx" ON "waitlist"("email");

-- CreateIndex
CREATE INDEX "waitlist_invitado_idx" ON "waitlist"("invitado");

-- CreateIndex
CREATE INDEX "alertas_nomina_empleadoId_idx" ON "alertas_nomina"("empleadoId");

-- CreateIndex
CREATE INDEX "alertas_nomina_tipo_idx" ON "alertas_nomina"("tipo");

-- CreateIndex
CREATE INDEX "alertas_nomina_categoria_idx" ON "alertas_nomina"("categoria");

-- CreateIndex
CREATE INDEX "documentos_puestoId_idx" ON "documentos"("puestoId");

-- CreateIndex
CREATE INDEX "nominas_estado_idx" ON "nominas"("estado");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nomina" ADD CONSTRAINT "alertas_nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_mensuales_nomina" ADD CONSTRAINT "resumenes_mensuales_nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_mensuales_nomina" ADD CONSTRAINT "resumenes_mensuales_nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports_gestoria" ADD CONSTRAINT "exports_gestoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_activas" ADD CONSTRAINT "sesiones_activas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_empleados" ADD CONSTRAINT "onboarding_empleados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_empleados" ADD CONSTRAINT "onboarding_empleados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
