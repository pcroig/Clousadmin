-- Add foreign key constraint between ausencias.documentoId and documentos.id
-- This ensures referential integrity for justificantes (supporting documents)

-- Step 1: Clean up any invalid documentoId references (set to NULL if documento doesn't exist)
UPDATE "ausencias"
SET "documentoId" = NULL
WHERE "documentoId" IS NOT NULL
  AND "documentoId" NOT IN (SELECT "id" FROM "documentos");

-- Step 2: Create index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "ausencias_documentoId_idx" ON "ausencias"("documentoId");

-- Step 3: Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ausencias_documentoId_fkey'
  ) THEN
    ALTER TABLE "ausencias"
    ADD CONSTRAINT "ausencias_documentoId_fkey" 
    FOREIGN KEY ("documentoId") 
    REFERENCES "documentos"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
  END IF;
END $$;

