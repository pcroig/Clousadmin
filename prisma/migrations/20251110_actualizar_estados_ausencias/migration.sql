-- ========================================
-- Actualización de estados de ausencias
-- Unifica en: pendiente, confirmada, completada, rechazada
-- ========================================

-- Eliminar ausencias canceladas (ya no se persisten)
DELETE FROM "ausencias" WHERE estado::text = 'cancelada';

-- Verificar si el tipo existe antes de renombrarlo (para reset limpio)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoAusencia') THEN
    -- El tipo ya existe, necesitamos renombrarlo y recrearlo
    -- Primero eliminar el default para evitar conflictos de casting
    ALTER TABLE "ausencias" ALTER COLUMN "estado" DROP DEFAULT;
    
    -- Renombrar tipo anterior
    ALTER TYPE "EstadoAusencia" RENAME TO "EstadoAusencia_old";
    
    -- Crear nuevo tipo
    CREATE TYPE "EstadoAusencia" AS ENUM ('pendiente', 'confirmada', 'completada', 'rechazada');
    
    -- Adaptar columna con los nuevos valores
    ALTER TABLE "ausencias"
      ALTER COLUMN "estado" TYPE "EstadoAusencia"
      USING (
        CASE estado::text
          WHEN 'pendiente_aprobacion' THEN 'pendiente'::"EstadoAusencia"
          WHEN 'en_curso' THEN 'confirmada'::"EstadoAusencia"
          WHEN 'auto_aprobada' THEN 'confirmada'::"EstadoAusencia"
          WHEN 'completada' THEN 'completada'::"EstadoAusencia"
          WHEN 'rechazada' THEN 'rechazada'::"EstadoAusencia"
          ELSE 'pendiente'::"EstadoAusencia"
        END
      );
    
    -- Eliminar tipo antiguo
    DROP TYPE "EstadoAusencia_old";
  ELSE
    -- El tipo no existe, crear el enum directamente
    CREATE TYPE "EstadoAusencia" AS ENUM ('pendiente', 'confirmada', 'completada', 'rechazada');
    
    -- Primero eliminar el default si existe
    ALTER TABLE "ausencias" ALTER COLUMN "estado" DROP DEFAULT;
    
    -- Adaptar columna desde VARCHAR a ENUM
    ALTER TABLE "ausencias"
      ALTER COLUMN "estado" TYPE "EstadoAusencia"
      USING (
        CASE estado::text
          WHEN 'pendiente_aprobacion' THEN 'pendiente'::"EstadoAusencia"
          WHEN 'en_curso' THEN 'confirmada'::"EstadoAusencia"
          WHEN 'auto_aprobada' THEN 'confirmada'::"EstadoAusencia"
          WHEN 'completada' THEN 'completada'::"EstadoAusencia"
          WHEN 'rechazada' THEN 'rechazada'::"EstadoAusencia"
          WHEN 'cancelada' THEN 'rechazada'::"EstadoAusencia"
          ELSE 'pendiente'::"EstadoAusencia"
        END
      );
  END IF;
END $$;

-- Establecer el nuevo default
ALTER TABLE "ausencias" ALTER COLUMN "estado" SET DEFAULT 'pendiente'::"EstadoAusencia";


