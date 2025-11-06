-- AlterTable
ALTER TABLE "empleados" ALTER COLUMN "nif" SET DATA TYPE TEXT,
ALTER COLUMN "nss" SET DATA TYPE TEXT,
ALTER COLUMN "iban" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "onboarding_empleados" ALTER COLUMN "progreso" SET DEFAULT '{"credenciales_completadas": false, "datos_personales": false, "datos_bancarios": false, "datos_documentos": false}';
