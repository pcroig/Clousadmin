-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "cif" VARCHAR(20),
    "email" VARCHAR(255),
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "logoUrl" TEXT,
    "config" JSONB NOT NULL DEFAULT '{"hora_cierre_fichaje_default":"18:00","auto_completado_fichajes_dias":7,"auto_completado_nominas_dias":7,"auto_completado_contratos_dias":14,"umbral_ia_nominas":0.8,"umbral_ia_contratos":0.85,"permitir_saldo_vacaciones_negativo":true,"empleado_puede_ver_salario":false}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "cognitoId" VARCHAR(255),
    "rol" VARCHAR(50) NOT NULL DEFAULT 'empleado',
    "nombre" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(200) NOT NULL,
    "avatar" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ultimoAcceso" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "fotoUrl" TEXT,
    "nif" VARCHAR(20),
    "nss" VARCHAR(20),
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "codigoPostal" VARCHAR(5),
    "ciudad" VARCHAR(100),
    "estadoCivil" VARCHAR(50),
    "numeroHijos" INTEGER NOT NULL DEFAULT 0,
    "genero" VARCHAR(50),
    "iban" VARCHAR(34),
    "bic" VARCHAR(200),
    "departamento" VARCHAR(100),
    "puesto" VARCHAR(100),
    "fechaAlta" TIMESTAMP(3) NOT NULL,
    "fechaBaja" TIMESTAMP(3),
    "tipoContrato" VARCHAR(50) NOT NULL DEFAULT 'indefinido',
    "categoriaProfesional" VARCHAR(50),
    "grupoCotizacion" INTEGER,
    "estadoEmpleado" VARCHAR(50) NOT NULL DEFAULT 'activo',
    "managerId" TEXT,
    "jornadaId" TEXT,
    "salarioBaseAnual" DECIMAL(10,2),
    "salarioBaseMensual" DECIMAL(10,2),
    "diasVacaciones" INTEGER NOT NULL DEFAULT 22,
    "onboardingCompletado" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletadoEn" TIMESTAMP(3),
    "documentosCompletos" BOOLEAN NOT NULL DEFAULT false,
    "documentosCompletadosEn" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "managerId" TEXT,
    "descripcion" TEXT,
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'proyecto',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado_equipos" (
    "empleadoId" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "fechaIncorporacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleado_equipos_pkey" PRIMARY KEY ("empleadoId","equipoId")
);

-- CreateTable
CREATE TABLE "jornadas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "horasSemanales" DECIMAL(5,2) NOT NULL,
    "config" JSONB NOT NULL,
    "esPredefinida" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichajes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TIMESTAMPTZ(6) NOT NULL,
    "horaSalida" TIMESTAMPTZ(6),
    "ubicacion" TEXT,
    "autoCompletado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ausencias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "diasNaturales" INTEGER NOT NULL,
    "diasLaborables" INTEGER NOT NULL,
    "motivo" TEXT,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "aprobadaPor" TEXT,
    "aprobadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "documentoId" TEXT,
    "optimizadaIA" BOOLEAN NOT NULL DEFAULT false,
    "notasIA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ausencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "fecha" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpetas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "nombre" VARCHAR(255) NOT NULL,
    "parentId" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "carpetaId" TEXT,
    "nombre" VARCHAR(255) NOT NULL,
    "tipoDocumento" VARCHAR(100) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "tamano" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" VARCHAR(255) NOT NULL,
    "procesadoIA" BOOLEAN NOT NULL DEFAULT false,
    "datosExtraidos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipoContrato" VARCHAR(50) NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "salarioBaseAnual" DECIMAL(10,2) NOT NULL,
    "documentoId" TEXT,
    "datosExtraidosIA" JSONB,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "salarioBruto" DECIMAL(10,2) NOT NULL,
    "deducciones" DECIMAL(10,2) NOT NULL,
    "salarioNeto" DECIMAL(10,2) NOT NULL,
    "documentoId" TEXT,
    "datosExtraidosIA" JSONB,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "tieneAnomalias" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "severidad" VARCHAR(50) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "fechaResolucion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertas_nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_cambio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "aprobadorId" TEXT,
    "tipo" VARCHAR(100) NOT NULL,
    "camposCambiados" JSONB NOT NULL,
    "motivo" TEXT,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "fechaRespuesta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_completados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "recursoId" VARCHAR(255) NOT NULL,
    "accionRealizada" TEXT NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "revisadoPor" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_completados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cif_key" ON "empresas"("cif");

-- CreateIndex
CREATE INDEX "empresas_cif_idx" ON "empresas"("cif");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empleadoId_key" ON "usuarios"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cognitoId_key" ON "usuarios"("cognitoId");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_cognitoId_idx" ON "usuarios"("cognitoId");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_usuarioId_key" ON "empleados"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_email_key" ON "empleados"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_nif_key" ON "empleados"("nif");

-- CreateIndex
CREATE INDEX "empleados_empresaId_idx" ON "empleados"("empresaId");

-- CreateIndex
CREATE INDEX "empleados_usuarioId_idx" ON "empleados"("usuarioId");

-- CreateIndex
CREATE INDEX "empleados_managerId_idx" ON "empleados"("managerId");

-- CreateIndex
CREATE INDEX "empleados_jornadaId_idx" ON "empleados"("jornadaId");

-- CreateIndex
CREATE INDEX "empleados_nif_idx" ON "empleados"("nif");

-- CreateIndex
CREATE INDEX "empleados_email_idx" ON "empleados"("email");

-- CreateIndex
CREATE INDEX "empleados_estadoEmpleado_idx" ON "empleados"("estadoEmpleado");

-- CreateIndex
CREATE INDEX "empleados_departamento_idx" ON "empleados"("departamento");

-- CreateIndex
CREATE INDEX "equipos_empresaId_idx" ON "equipos"("empresaId");

-- CreateIndex
CREATE INDEX "equipos_managerId_idx" ON "equipos"("managerId");

-- CreateIndex
CREATE INDEX "empleado_equipos_empleadoId_idx" ON "empleado_equipos"("empleadoId");

-- CreateIndex
CREATE INDEX "empleado_equipos_equipoId_idx" ON "empleado_equipos"("equipoId");

-- CreateIndex
CREATE INDEX "jornadas_empresaId_idx" ON "jornadas"("empresaId");

-- CreateIndex
CREATE INDEX "fichajes_empresaId_idx" ON "fichajes"("empresaId");

-- CreateIndex
CREATE INDEX "fichajes_empleadoId_idx" ON "fichajes"("empleadoId");

-- CreateIndex
CREATE INDEX "fichajes_fecha_idx" ON "fichajes"("fecha");

-- CreateIndex
CREATE INDEX "fichajes_tipo_idx" ON "fichajes"("tipo");

-- CreateIndex
CREATE INDEX "ausencias_empresaId_idx" ON "ausencias"("empresaId");

-- CreateIndex
CREATE INDEX "ausencias_empleadoId_idx" ON "ausencias"("empleadoId");

-- CreateIndex
CREATE INDEX "ausencias_tipo_idx" ON "ausencias"("tipo");

-- CreateIndex
CREATE INDEX "ausencias_estado_idx" ON "ausencias"("estado");

-- CreateIndex
CREATE INDEX "ausencias_fechaInicio_fechaFin_idx" ON "ausencias"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "festivos_empresaId_idx" ON "festivos"("empresaId");

-- CreateIndex
CREATE INDEX "festivos_fecha_idx" ON "festivos"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "festivos_empresaId_fecha_key" ON "festivos"("empresaId", "fecha");

-- CreateIndex
CREATE INDEX "carpetas_empresaId_idx" ON "carpetas"("empresaId");

-- CreateIndex
CREATE INDEX "carpetas_empleadoId_idx" ON "carpetas"("empleadoId");

-- CreateIndex
CREATE INDEX "carpetas_parentId_idx" ON "carpetas"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_s3Key_key" ON "documentos"("s3Key");

-- CreateIndex
CREATE INDEX "documentos_empresaId_idx" ON "documentos"("empresaId");

-- CreateIndex
CREATE INDEX "documentos_empleadoId_idx" ON "documentos"("empleadoId");

-- CreateIndex
CREATE INDEX "documentos_carpetaId_idx" ON "documentos"("carpetaId");

-- CreateIndex
CREATE INDEX "documentos_tipoDocumento_idx" ON "documentos"("tipoDocumento");

-- CreateIndex
CREATE INDEX "documentos_s3Key_idx" ON "documentos"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_documentoId_key" ON "contratos"("documentoId");

-- CreateIndex
CREATE INDEX "contratos_empleadoId_idx" ON "contratos"("empleadoId");

-- CreateIndex
CREATE INDEX "contratos_tipoContrato_idx" ON "contratos"("tipoContrato");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_documentoId_key" ON "nominas"("documentoId");

-- CreateIndex
CREATE INDEX "nominas_empleadoId_idx" ON "nominas"("empleadoId");

-- CreateIndex
CREATE INDEX "nominas_mes_anio_idx" ON "nominas"("mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_empleadoId_mes_anio_key" ON "nominas"("empleadoId", "mes", "anio");

-- CreateIndex
CREATE INDEX "alertas_nomina_empresaId_idx" ON "alertas_nomina"("empresaId");

-- CreateIndex
CREATE INDEX "alertas_nomina_nominaId_idx" ON "alertas_nomina"("nominaId");

-- CreateIndex
CREATE INDEX "alertas_nomina_severidad_idx" ON "alertas_nomina"("severidad");

-- CreateIndex
CREATE INDEX "alertas_nomina_resuelta_idx" ON "alertas_nomina"("resuelta");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_empresaId_idx" ON "solicitudes_cambio"("empresaId");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_empleadoId_idx" ON "solicitudes_cambio"("empleadoId");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_aprobadorId_idx" ON "solicitudes_cambio"("aprobadorId");

-- CreateIndex
CREATE INDEX "solicitudes_cambio_estado_idx" ON "solicitudes_cambio"("estado");

-- CreateIndex
CREATE INDEX "auto_completados_empresaId_idx" ON "auto_completados"("empresaId");

-- CreateIndex
CREATE INDEX "auto_completados_empleadoId_idx" ON "auto_completados"("empleadoId");

-- CreateIndex
CREATE INDEX "auto_completados_tipo_idx" ON "auto_completados"("tipo");

-- CreateIndex
CREATE INDEX "auto_completados_estado_idx" ON "auto_completados"("estado");

-- CreateIndex
CREATE INDEX "auto_completados_expiraEn_idx" ON "auto_completados"("expiraEn");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_equipos" ADD CONSTRAINT "empleado_equipos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_equipos" ADD CONSTRAINT "empleado_equipos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichajes" ADD CONSTRAINT "fichajes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichajes" ADD CONSTRAINT "fichajes_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivos" ADD CONSTRAINT "festivos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "carpetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "carpetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nomina" ADD CONSTRAINT "alertas_nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nomina" ADD CONSTRAINT "alertas_nomina_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cambio" ADD CONSTRAINT "solicitudes_cambio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cambio" ADD CONSTRAINT "solicitudes_cambio_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cambio" ADD CONSTRAINT "solicitudes_cambio_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_completados" ADD CONSTRAINT "auto_completados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_completados" ADD CONSTRAINT "auto_completados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
