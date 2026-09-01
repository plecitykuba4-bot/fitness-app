ALTER TABLE "Exercise" ADD COLUMN "trackingType" TEXT NOT NULL DEFAULT 'WEIGHT_REPS';

UPDATE "Exercise"
SET "trackingType" = 'TIME'
WHERE lower("name") LIKE '%plank%'
   OR lower("name") LIKE '%výdrž%'
   OR lower("name") LIKE '%vis%'
   OR lower("name") LIKE '%wall sit%';
