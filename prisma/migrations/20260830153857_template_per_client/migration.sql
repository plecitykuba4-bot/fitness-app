-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMin" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutTemplate" ("createdAt", "description", "estimatedMin", "id", "name", "trainerId", "updatedAt") SELECT "createdAt", "description", "estimatedMin", "id", "name", "trainerId", "updatedAt" FROM "WorkoutTemplate";
DROP TABLE "WorkoutTemplate";
ALTER TABLE "new_WorkoutTemplate" RENAME TO "WorkoutTemplate";
CREATE INDEX "WorkoutTemplate_trainerId_idx" ON "WorkoutTemplate"("trainerId");
CREATE INDEX "WorkoutTemplate_clientId_idx" ON "WorkoutTemplate"("clientId");
CREATE UNIQUE INDEX "WorkoutTemplate_trainerId_clientId_name_key" ON "WorkoutTemplate"("trainerId", "clientId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
