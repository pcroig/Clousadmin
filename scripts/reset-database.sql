-- ========================================
-- Script SQL para borrar todos los datos de la base de datos
-- ========================================
-- ⚠️ CUIDADO: Este script borra TODOS los datos
-- Ejecutar con: psql -d clousadmin -f scripts/reset-database.sql

-- Desactivar temporalmente las foreign key checks para borrar más rápido
SET session_replication_role = 'replica';

-- Borrar en orden para respetar foreign keys
TRUNCATE TABLE "empleado_equipos" CASCADE;
TRUNCATE TABLE "notificaciones" CASCADE;
TRUNCATE TABLE "auto_completados" CASCADE;
TRUNCATE TABLE "ausencias" CASCADE;
TRUNCATE TABLE "fichajes" CASCADE;
TRUNCATE TABLE "solicitudes" CASCADE;
TRUNCATE TABLE "documentos_generados" CASCADE;
TRUNCATE TABLE "firmas_digitales" CASCADE;
TRUNCATE TABLE "documentos" CASCADE;
TRUNCATE TABLE "asignaciones_complemento" CASCADE;
TRUNCATE TABLE "empleado_complementos" CASCADE;
TRUNCATE TABLE "alertas_nomina" CASCADE;
TRUNCATE TABLE "nominas" CASCADE;
TRUNCATE TABLE "denuncias" CASCADE;
TRUNCATE TABLE "equipos" CASCADE;
TRUNCATE TABLE "jornadas" CASCADE;
TRUNCATE TABLE "empleados" CASCADE;
TRUNCATE TABLE "usuarios" CASCADE;
TRUNCATE TABLE "empresas" CASCADE;
TRUNCATE TABLE "invitaciones_signup" CASCADE;
TRUNCATE TABLE "invitaciones_empleado" CASCADE;
TRUNCATE TABLE "sesiones_activas" CASCADE;
TRUNCATE TABLE "password_reset_tokens" CASCADE;
TRUNCATE TABLE "plantillas" CASCADE;
TRUNCATE TABLE "festivos" CASCADE;
TRUNCATE TABLE "campanas_vacaciones" CASCADE;
TRUNCATE TABLE "carpetas" CASCADE;
TRUNCATE TABLE "contratos" CASCADE;
TRUNCATE TABLE "consentimientos" CASCADE;
TRUNCATE TABLE "compensaciones_horas_extra" CASCADE;
TRUNCATE TABLE "auditoria_accesos" CASCADE;
TRUNCATE TABLE "accounts" CASCADE;

-- Reactivar las foreign key checks
SET session_replication_role = 'origin';

-- Verificar que todo está vacío
SELECT 
    'empresas' as tabla, COUNT(*) as registros FROM "empresas"
UNION ALL
SELECT 'empleados', COUNT(*) FROM "empleados"
UNION ALL
SELECT 'usuarios', COUNT(*) FROM "usuarios"
UNION ALL
SELECT 'fichajes', COUNT(*) FROM "fichajes"
UNION ALL
SELECT 'ausencias', COUNT(*) FROM "ausencias";


