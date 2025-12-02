-- ================================================
-- Migración: Unificar título y mensaje en notificaciones
-- ================================================
-- Esta migración elimina la columna 'titulo' y mejora los mensajes
-- para que sean más descriptivos y naturales

-- Paso 1: Actualizar notificaciones existentes combinando título y mensaje
-- Solo actualiza si el mensaje no contiene ya información suficiente
UPDATE "notificaciones"
SET "mensaje" =
  CASE
    -- Si el mensaje ya es descriptivo (más de 50 caracteres), mantenerlo
    WHEN LENGTH("mensaje") > 50 THEN "mensaje"
    -- Si título y mensaje son diferentes, combinarlos
    WHEN "titulo" != "mensaje" AND "titulo" IS NOT NULL THEN
      "titulo" || ': ' || "mensaje"
    -- En otros casos, usar el mensaje existente
    ELSE "mensaje"
  END
WHERE "titulo" IS NOT NULL;

-- Paso 2: Cambiar el tipo de columna mensaje a TEXT para permitir mensajes más largos
ALTER TABLE "notificaciones" ALTER COLUMN "mensaje" TYPE TEXT;

-- Paso 3: Eliminar la columna titulo
ALTER TABLE "notificaciones" DROP COLUMN "titulo";
