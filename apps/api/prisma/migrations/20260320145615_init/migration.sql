-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL DEFAULT 0,
    "anprConfidenceThreshold" REAL NOT NULL DEFAULT 0.90,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParkingLot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL DEFAULT 0,
    "activeSlots" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ParkingZone_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ParkingLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneId" TEXT NOT NULL,
    "slotCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "isEvCharging" BOOLEAN NOT NULL DEFAULT false,
    "chargerType" TEXT,
    "chargerStatus" TEXT,
    "lastChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParkingSlot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ParkingZone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plateNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'CAR',
    "ownerType" TEXT NOT NULL DEFAULT 'VISITOR'
);

-- CreateTable
CREATE TABLE "ParkingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "entryTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" DATETIME,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "feeAmount" REAL,
    CONSTRAINT "ParkingSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParkingSession_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParkingSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "lotId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alert_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ParkingLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "lotId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "gateState" TEXT NOT NULL DEFAULT 'CLOSED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Simulation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Simulation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ParkingLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationQrToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "simulationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SimulationQrToken_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "simulationId" TEXT NOT NULL,
    "sourceTokenId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUEUED',
    "spawnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passedAt" DATETIME,
    CONSTRAINT "SimulationVehicle_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SimulationVehicle_sourceTokenId_fkey" FOREIGN KEY ("sourceTokenId") REFERENCES "SimulationQrToken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GateEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "simulationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GateEvent_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GateEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "SimulationVehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reservedBy" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParkingSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "zoneId" TEXT,
    "name" TEXT NOT NULL,
    "baseRate" REAL NOT NULL,
    "occupancyThreshold" REAL NOT NULL,
    "rateMultiplier" REAL NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PricingRule_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ParkingLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PricingRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ParkingZone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appliedRate" REAL NOT NULL,
    "occupancyAtEntry" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingHistory_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PricingRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PricingHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ParkingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "pgRefId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" DATETIME,
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ParkingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SensorDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT,
    "zoneId" TEXT,
    "type" TEXT NOT NULL,
    "vendor" TEXT,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "lastHeartbeatAt" DATETIME,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorDevice_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParkingSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SensorDevice_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ParkingZone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SensorEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorEvent_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "SensorDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationQrToken_token_key" ON "SimulationQrToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");
