-- RemoveJornadaNombreAddGlobalTimeLimits
-- This migration removes the 'nombre' field from the Jornada table.
-- Time limits (limiteInferior/Superior) are now stored globally in Empresa.config instead of per-jornada.

-- AlterTable: Remove 'nombre' column from 'jornadas' table
ALTER TABLE "jornadas" DROP COLUMN "nombre";

-- Note: No changes needed for Empresa table as config is already a JSONB field.
-- The application will handle adding limiteInferiorFichaje and limiteSuperiorFichaje to Empresa.config.
