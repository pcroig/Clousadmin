-- Add 2FA fields to usuarios table
ALTER TABLE "usuarios"
ADD COLUMN "backupCodes" JSONB,
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpSecret" TEXT;

