-- Rename salarioBruto* campos a salarioBase* para empleados y contratos.
-- Usamos bloques DO para que la migración sea idempotente al ejecutar un reset.

DO $$
BEGIN
  ALTER TABLE "empleados" RENAME COLUMN "salarioBrutoAnual" TO "salarioBaseAnual";
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "empleados" RENAME COLUMN "salarioBrutoMensual" TO "salarioBaseMensual";
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "contratos" RENAME COLUMN "salarioBrutoAnual" TO "salarioBaseAnual";
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

