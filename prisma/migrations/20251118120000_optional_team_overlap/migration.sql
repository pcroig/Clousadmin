-- Make solapamientoMaximoPct optional (per-team optional overlap)
ALTER TABLE "campanas_vacaciones"
  ALTER COLUMN "solapamientoMaximoPct" DROP NOT NULL;

ALTER TABLE "campanas_vacaciones"
  ALTER COLUMN "solapamientoMaximoPct" DROP DEFAULT;




