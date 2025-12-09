-- Migración: Desacoplar tipo de complemento de importe y modalidad
-- Cada complemento asignado guarda si es fijo/variable y su importe

-- 1. Añadir columna a complementos de empleado para guardar modalidad
ALTER TABLE "empleado_complementos" ADD COLUMN IF NOT EXISTS "esImporteFijo" BOOLEAN NOT NULL DEFAULT true;

-- 2. Rellenar la columna usando el valor previo del tipo de complemento
UPDATE "empleado_complementos" ec
SET "esImporteFijo" = tc."esImporteFijo"
FROM "tipos_complemento" tc
WHERE ec."tipoComplementoId" = tc."id";

-- 3. Copiar el importe fijo del tipo al complemento si no tenía importe personalizado
UPDATE "empleado_complementos" ec
SET "importePersonalizado" = tc."importeFijo"
FROM "tipos_complemento" tc
WHERE ec."tipoComplementoId" = tc."id"
  AND ec."importePersonalizado" IS NULL
  AND tc."importeFijo" IS NOT NULL;

-- 4. Para complementos variables sin importe, asignar 0 como placeholder
UPDATE "empleado_complementos" ec
SET "importePersonalizado" = 0
WHERE ec."importePersonalizado" IS NULL;

-- 5. Hacer el campo NOT NULL ahora que todos tienen valor
ALTER TABLE "empleado_complementos" ALTER COLUMN "importePersonalizado" SET NOT NULL;

-- 6. Eliminar los campos de importe y modalidad del tipo de complemento
ALTER TABLE "tipos_complemento" DROP COLUMN IF EXISTS "esImporteFijo";
ALTER TABLE "tipos_complemento" DROP COLUMN IF EXISTS "importeFijo";



