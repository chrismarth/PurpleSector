/*
  Warnings:

  - Added the required column `userId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Lap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MathChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SavedAnalysisLayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SavedPlotLayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `VehicleConfiguration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `VehicleSetup` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT,
    "data" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lapId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_lapId_fkey" FOREIGN KEY ("lapId") REFERENCES "Lap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("content", "createdAt", "id", "lapId", "role") SELECT "content", "createdAt", "id", "lapId", "role" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatMessage_lapId_createdAt_idx" ON "ChatMessage"("lapId", "createdAt");
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "description", "endDate", "id", "location", "name", "startDate", "updatedAt") SELECT "createdAt", "description", "endDate", "id", "location", "name", "startDate", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE TABLE "new_Lap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER NOT NULL,
    "lapTime" REAL,
    "telemetryData" TEXT NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "suggestions" TEXT,
    "driverComments" TEXT,
    "tags" TEXT,
    "plotConfigs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lap" ("analyzed", "createdAt", "driverComments", "id", "lapNumber", "lapTime", "plotConfigs", "sessionId", "suggestions", "tags", "telemetryData") SELECT "analyzed", "createdAt", "driverComments", "id", "lapNumber", "lapTime", "plotConfigs", "sessionId", "suggestions", "tags", "telemetryData" FROM "Lap";
DROP TABLE "Lap";
ALTER TABLE "new_Lap" RENAME TO "Lap";
CREATE INDEX "Lap_sessionId_lapNumber_idx" ON "Lap"("sessionId", "lapNumber");
CREATE INDEX "Lap_userId_idx" ON "Lap"("userId");
CREATE UNIQUE INDEX "Lap_sessionId_lapNumber_key" ON "Lap"("sessionId", "lapNumber");
CREATE TABLE "new_MathChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MathChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MathChannel" ("comment", "createdAt", "expression", "id", "inputs", "label", "unit", "updatedAt", "validated") SELECT "comment", "createdAt", "expression", "id", "inputs", "label", "unit", "updatedAt", "validated" FROM "MathChannel";
DROP TABLE "MathChannel";
ALTER TABLE "new_MathChannel" RENAME TO "MathChannel";
CREATE INDEX "MathChannel_createdAt_idx" ON "MathChannel"("createdAt");
CREATE INDEX "MathChannel_userId_idx" ON "MathChannel"("userId");
CREATE TABLE "new_SavedAnalysisLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'global',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedAnalysisLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedAnalysisLayout" ("context", "createdAt", "description", "id", "isDefault", "layout", "name", "updatedAt") SELECT "context", "createdAt", "description", "id", "isDefault", "layout", "name", "updatedAt" FROM "SavedAnalysisLayout";
DROP TABLE "SavedAnalysisLayout";
ALTER TABLE "new_SavedAnalysisLayout" RENAME TO "SavedAnalysisLayout";
CREATE INDEX "SavedAnalysisLayout_context_isDefault_idx" ON "SavedAnalysisLayout"("context", "isDefault");
CREATE INDEX "SavedAnalysisLayout_createdAt_idx" ON "SavedAnalysisLayout"("createdAt");
CREATE INDEX "SavedAnalysisLayout_userId_idx" ON "SavedAnalysisLayout"("userId");
CREATE TABLE "new_SavedPlotLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plotConfigs" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT NOT NULL DEFAULT 'global',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedPlotLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedPlotLayout" ("context", "createdAt", "description", "id", "isDefault", "layout", "name", "plotConfigs", "updatedAt") SELECT "context", "createdAt", "description", "id", "isDefault", "layout", "name", "plotConfigs", "updatedAt" FROM "SavedPlotLayout";
DROP TABLE "SavedPlotLayout";
ALTER TABLE "new_SavedPlotLayout" RENAME TO "SavedPlotLayout";
CREATE INDEX "SavedPlotLayout_isDefault_context_idx" ON "SavedPlotLayout"("isDefault", "context");
CREATE INDEX "SavedPlotLayout_createdAt_idx" ON "SavedPlotLayout"("createdAt");
CREATE INDEX "SavedPlotLayout_userId_idx" ON "SavedPlotLayout"("userId");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "plotConfigs" TEXT,
    "vehicleId" TEXT,
    "vehicleConfigurationId" TEXT,
    "vehicleSetupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleConfigurationId_fkey" FOREIGN KEY ("vehicleConfigurationId") REFERENCES "VehicleConfiguration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleSetupId_fkey" FOREIGN KEY ("vehicleSetupId") REFERENCES "VehicleSetup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "eventId", "id", "name", "plotConfigs", "source", "started", "status", "tags", "updatedAt", "vehicleConfigurationId", "vehicleId", "vehicleSetupId") SELECT "createdAt", "eventId", "id", "name", "plotConfigs", "source", "started", "status", "tags", "updatedAt", "vehicleConfigurationId", "vehicleId", "vehicleSetupId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_eventId_idx" ON "Session"("eventId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_vehicleId_idx" ON "Session"("vehicleId");
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inServiceDate" DATETIME,
    "outOfServiceDate" DATETIME,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("createdAt", "description", "id", "inServiceDate", "name", "outOfServiceDate", "tags", "updatedAt") SELECT "createdAt", "description", "id", "inServiceDate", "name", "outOfServiceDate", "tags", "updatedAt" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_createdAt_idx" ON "Vehicle"("createdAt");
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");
CREATE TABLE "new_VehicleConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleConfiguration_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VehicleConfiguration" ("createdAt", "description", "id", "name", "parts", "updatedAt", "vehicleId") SELECT "createdAt", "description", "id", "name", "parts", "updatedAt", "vehicleId" FROM "VehicleConfiguration";
DROP TABLE "VehicleConfiguration";
ALTER TABLE "new_VehicleConfiguration" RENAME TO "VehicleConfiguration";
CREATE INDEX "VehicleConfiguration_vehicleId_idx" ON "VehicleConfiguration"("vehicleId");
CREATE INDEX "VehicleConfiguration_createdAt_idx" ON "VehicleConfiguration"("createdAt");
CREATE INDEX "VehicleConfiguration_userId_idx" ON "VehicleConfiguration"("userId");
CREATE TABLE "new_VehicleSetup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehicleConfigurationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleSetup_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleSetup_vehicleConfigurationId_fkey" FOREIGN KEY ("vehicleConfigurationId") REFERENCES "VehicleConfiguration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VehicleSetup" ("createdAt", "description", "id", "name", "parameters", "updatedAt", "vehicleConfigurationId", "vehicleId") SELECT "createdAt", "description", "id", "name", "parameters", "updatedAt", "vehicleConfigurationId", "vehicleId" FROM "VehicleSetup";
DROP TABLE "VehicleSetup";
ALTER TABLE "new_VehicleSetup" RENAME TO "VehicleSetup";
CREATE INDEX "VehicleSetup_vehicleId_idx" ON "VehicleSetup"("vehicleId");
CREATE INDEX "VehicleSetup_vehicleConfigurationId_idx" ON "VehicleSetup"("vehicleConfigurationId");
CREATE INDEX "VehicleSetup_createdAt_idx" ON "VehicleSetup"("createdAt");
CREATE INDEX "VehicleSetup_userId_idx" ON "VehicleSetup"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Group_organizationId_idx" ON "Group"("organizationId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
