-- AlterTable
ALTER TABLE "onboarding_configs" ADD COLUMN "workflowAcciones" JSONB NOT NULL DEFAULT '[]'::jsonb;
