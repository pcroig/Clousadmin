-- ========================================
-- MIGRACIÓN: Índices de Rendimiento Adicionales
-- ========================================
-- Añade índices compuestos para mejorar queries frecuentes
-- SAFE: Crear índices no afecta datos existentes
-- ROLLBACK: DROP INDEX si es necesario revertir

-- Índice para búsquedas de nóminas por año/mes/estado (dashboard HR)
CREATE INDEX IF NOT EXISTS "nominas_anio_mes_estado_idx" ON "nominas" ("anio", "mes", "estado");

-- Índice para dashboard empleado (mis nóminas recientes)
CREATE INDEX IF NOT EXISTS "nominas_empleado_anio_estado_idx" ON "nominas" ("empleadoId", "anio", "estado");

-- Índice para fichajes pendientes de revisión (lista HR)
CREATE INDEX IF NOT EXISTS "fichajes_empresa_estado_fecha_idx" ON "fichajes" ("empresaId", "estado", "fecha" DESC);

-- Índice para ausencias por rango de fechas y estado (calendario)
CREATE INDEX IF NOT EXISTS "ausencias_empresa_fecha_estado_idx" ON "ausencias" ("empresaId", "fechaInicio", "fechaFin", "estado");

-- Índice para documentos recientes por empleado
CREATE INDEX IF NOT EXISTS "documentos_empleado_created_idx" ON "documentos" ("empleadoId", "createdAt" DESC) WHERE "empleadoId" IS NOT NULL;

-- Índice para notificaciones no leídas por usuario
CREATE INDEX IF NOT EXISTS "notificaciones_usuario_leida_created_idx" ON "notificaciones" ("usuarioId", "leida", "createdAt" DESC);

-- Índice para empleados activos por empresa (listados)
CREATE INDEX IF NOT EXISTS "empleados_empresa_estado_nombre_idx" ON "empleados" ("empresaId", "estadoEmpleado", "nombre", "apellidos");

-- ANÁLISIS: Actualizar estadísticas de la BD
ANALYZE;


