/*
  Warnings:

  - You are about to drop the column `telemetryData` on the `Lap` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER NOT NULL,
    "lapTime" REAL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "suggestions" TEXT,
    "driverComments" TEXT,
    "tags" TEXT,
    "plotConfigs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lap" ("analyzed", "createdAt", "driverComments", "id", "lapNumber", "lapTime", "plotConfigs", "sessionId", "suggestions", "tags", "userId") SELECT "analyzed", "createdAt", "driverComments", "id", "lapNumber", "lapTime", "plotConfigs", "sessionId", "suggestions", "tags", "userId" FROM "Lap";
DROP TABLE "Lap";
ALTER TABLE "new_Lap" RENAME TO "Lap";
CREATE INDEX "Lap_sessionId_lapNumber_idx" ON "Lap"("sessionId", "lapNumber");
CREATE INDEX "Lap_userId_idx" ON "Lap"("userId");
CREATE UNIQUE INDEX "Lap_sessionId_lapNumber_key" ON "Lap"("sessionId", "lapNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
