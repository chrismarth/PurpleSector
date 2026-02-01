-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MathChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MathChannel" ("createdAt", "expression", "id", "inputs", "label", "unit", "updatedAt") SELECT "createdAt", "expression", "id", "inputs", "label", "unit", "updatedAt" FROM "MathChannel";
DROP TABLE "MathChannel";
ALTER TABLE "new_MathChannel" RENAME TO "MathChannel";
CREATE INDEX "MathChannel_createdAt_idx" ON "MathChannel"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
