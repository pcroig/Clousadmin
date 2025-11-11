-- ========================================
-- Actualización de estados de ausencias
-- Unifica en: pendiente, confirmada, completada, rechazada
-- ========================================

-- Eliminar ausencias canceladas (ya no se persisten)
DELETE FROM "ausencias" WHERE estado = 'cancelada';

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

-- Ahora sí, establecer el nuevo default
ALTER TABLE "ausencias" ALTER COLUMN "estado" SET DEFAULT 'pendiente'::"EstadoAusencia";

-- Eliminar tipo antiguo
DROP TYPE "EstadoAusencia_old";


