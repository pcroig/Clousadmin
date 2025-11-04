-- Eliminar equipos duplicados, manteniendo solo el primero por (empresaId, nombre)
-- Primero, eliminar las relaciones de empleados con equipos duplicados (mantener solo el primero)
WITH equipos_duplicados AS (
  SELECT 
    id,
    "empresaId",
    nombre,
    ROW_NUMBER() OVER (PARTITION BY "empresaId", nombre ORDER BY "createdAt" ASC) as rn
  FROM equipos
),
ids_duplicados AS (
  SELECT id FROM equipos_duplicados WHERE rn > 1
)
DELETE FROM "empleado_equipos" 
WHERE "equipoId" IN (SELECT id FROM ids_duplicados);

-- Luego, eliminar los equipos duplicados (mantener solo el primero)
WITH equipos_duplicados AS (
  SELECT 
    id,
    "empresaId",
    nombre,
    ROW_NUMBER() OVER (PARTITION BY "empresaId", nombre ORDER BY "createdAt" ASC) as rn
  FROM equipos
)
DELETE FROM equipos
WHERE id IN (
  SELECT id FROM equipos_duplicados WHERE rn > 1
);

-- Ahora sí, agregar el índice único
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_empresaId_nombre_key" UNIQUE ("empresaId", "nombre");
