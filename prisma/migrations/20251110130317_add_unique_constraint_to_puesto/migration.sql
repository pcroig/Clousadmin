-- Add unique constraint to puestos table
CREATE UNIQUE INDEX IF NOT EXISTS "puestos_empresaId_nombre_key" ON "puestos" ("empresaId", "nombre");

-- Add constraint comment
COMMENT ON INDEX "puestos_empresaId_nombre_key" IS 'Un puesto con el mismo nombre no puede repetirse en una empresa';
