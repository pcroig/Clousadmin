-- Backfill de jornadaId en fichajes existentes para habilitar promedios históricos.
-- Copia la jornada actual del empleado para todos los fichajes sin jornada asociada.

WITH updated AS (
  UPDATE "fichajes" AS f
  SET "jornadaId" = e."jornadaId"
  FROM "empleados" AS e
  WHERE f."empleadoId" = e."id"
    AND f."jornadaId" IS NULL
    AND e."jornadaId" IS NOT NULL
  RETURNING 1
)
SELECT COUNT(*) AS "fichajes_actualizados"
FROM updated;