/*
  Warnings:

  - You are about to drop the column `targetReps` on the `WorkoutExercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetSets` on the `WorkoutExercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetWeight` on the `WorkoutExercise` table. All the data in the column will be lost.
  - You are about to drop the column `reps` on the `WorkoutTemplateExercise` table. All the data in the column will be lost.
  - You are about to drop the column `sets` on the `WorkoutTemplateExercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetWeight` on the `WorkoutTemplateExercise` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "WorkoutTemplateSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "targetWeight" REAL,
    CONSTRAINT "WorkoutTemplateSet_templateExerciseId_fkey" FOREIGN KEY ("templateExerciseId") REFERENCES "WorkoutTemplateExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutExerciseTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "targetWeight" REAL,
    CONSTRAINT "WorkoutExerciseTarget_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "tempo" TEXT,
    "note" TEXT,
    CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutExercise" ("exerciseId", "id", "note", "restSeconds", "sortOrder", "tempo", "workoutId") SELECT "exerciseId", "id", "note", "restSeconds", "sortOrder", "tempo", "workoutId" FROM "WorkoutExercise";
DROP TABLE "WorkoutExercise";
ALTER TABLE "new_WorkoutExercise" RENAME TO "WorkoutExercise";
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");
CREATE UNIQUE INDEX "WorkoutExercise_workoutId_sortOrder_key" ON "WorkoutExercise"("workoutId", "sortOrder");
CREATE TABLE "new_WorkoutTemplateExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "tempo" TEXT,
    "note" TEXT,
    CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutTemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutTemplateExercise" ("exerciseId", "id", "note", "restSeconds", "sortOrder", "templateId", "tempo") SELECT "exerciseId", "id", "note", "restSeconds", "sortOrder", "templateId", "tempo" FROM "WorkoutTemplateExercise";
DROP TABLE "WorkoutTemplateExercise";
ALTER TABLE "new_WorkoutTemplateExercise" RENAME TO "WorkoutTemplateExercise";
CREATE INDEX "WorkoutTemplateExercise_templateId_idx" ON "WorkoutTemplateExercise"("templateId");
CREATE INDEX "WorkoutTemplateExercise_exerciseId_idx" ON "WorkoutTemplateExercise"("exerciseId");
CREATE UNIQUE INDEX "WorkoutTemplateExercise_templateId_sortOrder_key" ON "WorkoutTemplateExercise"("templateId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WorkoutTemplateSet_templateExerciseId_idx" ON "WorkoutTemplateSet"("templateExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateSet_templateExerciseId_setNumber_key" ON "WorkoutTemplateSet"("templateExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "WorkoutExerciseTarget_workoutExerciseId_idx" ON "WorkoutExerciseTarget"("workoutExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExerciseTarget_workoutExerciseId_setNumber_key" ON "WorkoutExerciseTarget"("workoutExerciseId", "setNumber");
