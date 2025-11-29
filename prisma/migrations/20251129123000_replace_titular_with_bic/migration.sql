-- Reemplazar titularCuenta por BIC en datos bancarios

-- Renombrar columna si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'empleados' AND column_name = 'titularCuenta'
  ) THEN
    ALTER TABLE "empleados" RENAME COLUMN "titularCuenta" TO "bic";
    
    -- Limpiar datos: truncar a 11 caracteres (tamaño máximo BIC)
    UPDATE "empleados" SET "bic" = LEFT("bic", 11) WHERE LENGTH("bic") > 11;
    
    -- Cambiar tipo a VARCHAR(11) para código BIC
    ALTER TABLE "empleados" ALTER COLUMN "bic" TYPE VARCHAR(11);
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'empleados' AND column_name = 'bic'
  ) THEN
    -- Si no existe ninguna de las dos, crear la columna bic
    ALTER TABLE "empleados" ADD COLUMN "bic" VARCHAR(11);
  END IF;
END $$;

-- Actualizar configuraciones de onboarding para usar el nuevo nombre de campo
UPDATE "onboarding_configs"
SET "camposRequeridos" = jsonb_set(
  "camposRequeridos",
  '{datos_bancarios}',
  (
    (COALESCE("camposRequeridos"->'datos_bancarios', '{}'::jsonb) - 'titularCuenta')
    || jsonb_build_object(
      'bic',
      COALESCE(
        "camposRequeridos"->'datos_bancarios'->'bic',
        "camposRequeridos"->'datos_bancarios'->'titularCuenta',
        to_jsonb(true)
      )
    )
  )
);

ALTER TABLE "onboarding_configs"
ALTER COLUMN "camposRequeridos"
SET DEFAULT '{"datos_personales":{"nif":true,"nss":true,"telefono":true,"direccionCalle":true,"direccionNumero":true,"codigoPostal":true,"ciudad":true,"direccionProvincia":true,"direccionPiso":false,"estadoCivil":false,"numeroHijos":false},"datos_bancarios":{"iban":true,"bic":true}}';

