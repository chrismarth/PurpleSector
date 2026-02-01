-- CreateTable
CREATE TABLE "MathChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MathChannel_createdAt_idx" ON "MathChannel"("createdAt");
