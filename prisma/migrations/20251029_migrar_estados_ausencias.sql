-- =====================================================
-- MIGRACIÓN DE ESTADOS DE AUSENCIAS
-- Fecha: 29 Octubre 2025
-- Descripción: Migrar estados antiguos a estados nuevos
-- =====================================================

-- 1. Migrar 'pendiente' → 'pendiente_aprobacion'
UPDATE "Ausencia"
SET estado = 'pendiente_aprobacion'
WHERE estado = 'pendiente';

-- 2. Migrar 'aprobada' → 'en_curso' (si la fecha de fin es futura o hoy)
UPDATE "Ausencia"
SET estado = 'en_curso'
WHERE estado = 'aprobada' 
AND "fechaFin" >= CURRENT_DATE;

-- 3. Migrar 'aprobada' → 'completada' (si la fecha de fin ya pasó)
UPDATE "Ausencia"
SET estado = 'completada'
WHERE estado = 'aprobada' 
AND "fechaFin" < CURRENT_DATE;

-- 4. Verificación: Mostrar conteo por estado después de la migración
SELECT estado, COUNT(*) as total
FROM "Ausencia"
GROUP BY estado
ORDER BY estado;

-- =====================================================
-- NOTAS:
-- - 'rechazada', 'cancelada', 'auto_aprobada' no necesitan migración
-- - Ejecutar: psql $DATABASE_URL -f prisma/migrations/20251029_migrar_estados_ausencias.sql
-- =====================================================
