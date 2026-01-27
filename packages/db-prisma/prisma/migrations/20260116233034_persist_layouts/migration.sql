-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Session_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleConfigurationId_fkey" FOREIGN KEY ("vehicleConfigurationId") REFERENCES "VehicleConfiguration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_vehicleSetupId_fkey" FOREIGN KEY ("vehicleSetupId") REFERENCES "VehicleSetup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lap" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Lap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lapId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_lapId_fkey" FOREIGN KEY ("lapId") REFERENCES "Lap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedPlotLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plotConfigs" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT NOT NULL DEFAULT 'global',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SavedAnalysisLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'global',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inServiceDate" DATETIME,
    "outOfServiceDate" DATETIME,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleConfiguration_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleSetup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "vehicleConfigurationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleSetup_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleSetup_vehicleConfigurationId_fkey" FOREIGN KEY ("vehicleConfigurationId") REFERENCES "VehicleConfiguration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Session_eventId_idx" ON "Session"("eventId");

-- CreateIndex
CREATE INDEX "Session_vehicleId_idx" ON "Session"("vehicleId");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "Lap_sessionId_lapNumber_idx" ON "Lap"("sessionId", "lapNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Lap_sessionId_lapNumber_key" ON "Lap"("sessionId", "lapNumber");

-- CreateIndex
CREATE INDEX "ChatMessage_lapId_createdAt_idx" ON "ChatMessage"("lapId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedPlotLayout_isDefault_context_idx" ON "SavedPlotLayout"("isDefault", "context");

-- CreateIndex
CREATE INDEX "SavedPlotLayout_createdAt_idx" ON "SavedPlotLayout"("createdAt");

-- CreateIndex
CREATE INDEX "SavedAnalysisLayout_context_isDefault_idx" ON "SavedAnalysisLayout"("context", "isDefault");

-- CreateIndex
CREATE INDEX "SavedAnalysisLayout_createdAt_idx" ON "SavedAnalysisLayout"("createdAt");

-- CreateIndex
CREATE INDEX "Vehicle_createdAt_idx" ON "Vehicle"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleConfiguration_vehicleId_idx" ON "VehicleConfiguration"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleConfiguration_createdAt_idx" ON "VehicleConfiguration"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleSetup_vehicleId_idx" ON "VehicleSetup"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSetup_vehicleConfigurationId_idx" ON "VehicleSetup"("vehicleConfigurationId");

-- CreateIndex
CREATE INDEX "VehicleSetup_createdAt_idx" ON "VehicleSetup"("createdAt");
