/*
  Warnings:

  - You are about to drop the `TrainingPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainingPlanDay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `planId` on the `Note` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TrainingPlan_clientId_isActive_idx";

-- DropIndex
DROP INDEX "TrainingPlan_trainerId_idx";

-- DropIndex
DROP INDEX "TrainingPlanDay_planId_weekday_key";

-- DropIndex
DROP INDEX "TrainingPlanDay_templateId_idx";

-- DropIndex
DROP INDEX "TrainingPlanDay_planId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TrainingPlan";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TrainingPlanDay";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clientId" TEXT,
    "workoutId" TEXT,
    "workoutExerciseId" TEXT,
    "workoutSetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_workoutSetId_fkey" FOREIGN KEY ("workoutSetId") REFERENCES "WorkoutSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("authorId", "body", "clientId", "createdAt", "id", "scope", "updatedAt", "workoutExerciseId", "workoutId", "workoutSetId") SELECT "authorId", "body", "clientId", "createdAt", "id", "scope", "updatedAt", "workoutExerciseId", "workoutId", "workoutSetId" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE INDEX "Note_clientId_createdAt_idx" ON "Note"("clientId", "createdAt");
CREATE INDEX "Note_workoutId_idx" ON "Note"("workoutId");
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
