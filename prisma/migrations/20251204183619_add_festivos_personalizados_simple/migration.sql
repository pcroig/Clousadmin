-- Migración: Sistema simple de festivos personalizados
-- Los empleados pueden solicitar reemplazar festivos de empresa con fechas específicas
-- HR Admin aprueba o rechaza las solicitudes

-- 1. Eliminar tabla anterior si existe y recrearla con el esquema correcto
DROP TABLE IF EXISTS "empleado_festivos" CASCADE;

-- 2. Crear tabla con relación a festivo de empresa
CREATE TABLE "empleado_festivos" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "empleadoId" TEXT NOT NULL,
    "festivoEmpresaId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "solicitadoPor" TEXT,
    "aprobadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear índices
CREATE UNIQUE INDEX "empleado_festivos_empleadoId_festivoEmpresaId_key" ON "empleado_festivos"("empleadoId", "festivoEmpresaId");
CREATE INDEX "empleado_festivos_empleadoId_idx" ON "empleado_festivos"("empleadoId");
CREATE INDEX "empleado_festivos_estado_idx" ON "empleado_festivos"("estado");
CREATE INDEX "empleado_festivos_festivoEmpresaId_idx" ON "empleado_festivos"("festivoEmpresaId");

-- 4. Agregar foreign keys
ALTER TABLE "empleado_festivos" ADD CONSTRAINT "empleado_festivos_empleadoId_fkey" 
    FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "empleado_festivos" ADD CONSTRAINT "empleado_festivos_festivoEmpresaId_fkey" 
    FOREIGN KEY ("festivoEmpresaId") REFERENCES "festivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;


