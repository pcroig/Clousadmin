-- Eliminar columna fecha si existe (puede no existir si la tabla se creó sin ella)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'denuncias' 
    AND column_name = 'fecha'
  ) THEN
    ALTER TABLE "denuncias" DROP COLUMN "fecha";
  END IF;
END $$;




