-- CreateTable
CREATE TABLE "BlacklistVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlacklistVehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistVehicle_organizationId_plateNumber_key" ON "BlacklistVehicle"("organizationId", "plateNumber");
