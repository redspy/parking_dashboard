import { createHash } from "crypto";
import { randomBytes } from "crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Organization ─────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: "org-demo" },
    update: {},
    create: {
      id: "org-demo",
      name: "Demo Parking Co.",
      plan: "PRO",
    },
  });
  console.log("✓ Organization:", org.name);

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      organizationId: org.id,
      email: "admin@demo.com",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "operator@demo.com" },
    update: {},
    create: {
      organizationId: org.id,
      email: "operator@demo.com",
      passwordHash: hashPassword("operator123"),
      role: "OPERATOR",
    },
  });

  await prisma.user.upsert({
    where: { email: "billing@demo.com" },
    update: {},
    create: {
      organizationId: org.id,
      email: "billing@demo.com",
      passwordHash: hashPassword("billing123"),
      role: "BILLING",
    },
  });
  console.log("✓ Users: admin, operator, billing");

  // ─── Parking Lot ──────────────────────────────────────────────────────────
  const lot = await prisma.parkingLot.upsert({
    where: { id: "lot-main" },
    update: {},
    create: {
      id: "lot-main",
      organizationId: org.id,
      name: "메인 주차장",
      location: "서울 강남구 테헤란로 123",
      totalSlots: 50,
    },
  });
  console.log("✓ Parking lot:", lot.name);

  // ─── Parking Zones ────────────────────────────────────────────────────────
  const zoneA = await prisma.parkingZone.upsert({
    where: { id: "zone-a" },
    update: {},
    create: {
      id: "zone-a",
      lotId: lot.id,
      name: "A구역",
      floor: "B1",
      totalSlots: 20,
      activeSlots: 20,
    },
  });

  const zoneB = await prisma.parkingZone.upsert({
    where: { id: "zone-b" },
    update: {},
    create: {
      id: "zone-b",
      lotId: lot.id,
      name: "B구역",
      floor: "B2",
      totalSlots: 20,
      activeSlots: 20,
    },
  });

  const zoneEv = await prisma.parkingZone.upsert({
    where: { id: "zone-ev" },
    update: {},
    create: {
      id: "zone-ev",
      lotId: lot.id,
      name: "EV충전구역",
      floor: "1F",
      totalSlots: 10,
      activeSlots: 10,
    },
  });
  console.log("✓ Zones: A구역, B구역, EV충전구역");

  // ─── Parking Slots ────────────────────────────────────────────────────────
  const statuses = ["EMPTY", "OCCUPIED", "EMPTY", "EMPTY", "OCCUPIED"] as const;
  const slotPromises = [];

  for (let i = 1; i <= 20; i++) {
    const status = statuses[(i - 1) % statuses.length];
    slotPromises.push(
      prisma.parkingSlot.upsert({
        where: { id: `slot-a-${i}` },
        update: { status },
        create: { id: `slot-a-${i}`, zoneId: zoneA.id, slotCode: `A-${String(i).padStart(2, "0")}`, status },
      }),
    );
  }

  for (let i = 1; i <= 20; i++) {
    const status = i <= 15 ? "OCCUPIED" : "EMPTY"; // B zone is busier
    slotPromises.push(
      prisma.parkingSlot.upsert({
        where: { id: `slot-b-${i}` },
        update: { status },
        create: { id: `slot-b-${i}`, zoneId: zoneB.id, slotCode: `B-${String(i).padStart(2, "0")}`, status },
      }),
    );
  }

  for (let i = 1; i <= 10; i++) {
    const chargerStatus = i <= 3 ? "IN_USE" : i === 4 ? "FAULT" : "AVAILABLE";
    const slotStatus = i <= 3 ? "OCCUPIED" : "EMPTY";
    slotPromises.push(
      prisma.parkingSlot.upsert({
        where: { id: `slot-ev-${i}` },
        update: { status: slotStatus, chargerStatus },
        create: {
          id: `slot-ev-${i}`,
          zoneId: zoneEv.id,
          slotCode: `EV-${String(i).padStart(2, "0")}`,
          status: slotStatus,
          isEvCharging: true,
          chargerType: i <= 5 ? "DC_FAST" : "AC_SLOW",
          chargerStatus,
        },
      }),
    );
  }

  await Promise.all(slotPromises);
  console.log("✓ 50 parking slots created");

  // ─── Pricing Rules ────────────────────────────────────────────────────────
  await prisma.pricingRule.upsert({
    where: { id: "rule-base" },
    update: {},
    create: {
      id: "rule-base",
      lotId: lot.id,
      name: "기본 요금",
      baseRate: 1000,
      occupancyThreshold: 0,
      rateMultiplier: 1.0,
      validFrom: new Date("2024-01-01"),
      isActive: true,
    },
  });

  await prisma.pricingRule.upsert({
    where: { id: "rule-peak" },
    update: {},
    create: {
      id: "rule-peak",
      lotId: lot.id,
      name: "혼잡 요금 (80% 이상)",
      baseRate: 1000,
      occupancyThreshold: 0.8,
      rateMultiplier: 1.5,
      validFrom: new Date("2024-01-01"),
      isActive: true,
    },
  });
  console.log("✓ Pricing rules created");

  // ─── Sample Vehicles & Sessions ───────────────────────────────────────────
  const plates = ["123가4567", "456나7890", "789다1234", "321마5678"];
  for (let i = 0; i < plates.length; i++) {
    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber: plates[i] },
      update: {},
      create: {
        plateNumber: plates[i],
        vehicleType: "CAR",
        ownerType: i === 0 ? "MEMBER" : "VISITOR",
      },
    });

    // Active sessions for occupied slots
    const existingSession = await prisma.parkingSession.findFirst({
      where: { vehicleId: vehicle.id, exitTime: null },
    });
    if (!existingSession) {
      await prisma.parkingSession.create({
        data: {
          vehicleId: vehicle.id,
          slotId: `slot-b-${i + 1}`,
          entryTime: new Date(Date.now() - (i + 1) * 30 * 60 * 1000),
          paymentStatus: "UNPAID",
        },
      });
    }
  }
  console.log("✓ Sample vehicles and sessions");

  // ─── Sample Alerts ────────────────────────────────────────────────────────
  const existingAlerts = await prisma.alert.count({ where: { organizationId: org.id } });
  if (existingAlerts === 0) {
    await prisma.alert.createMany({
      data: [
        {
          organizationId: org.id,
          lotId: lot.id,
          type: "OVERSTAY",
          severity: "WARN",
          message: "B-05 구역 장기주차 감지 (3시간 초과)",
          status: "OPEN",
        },
        {
          organizationId: org.id,
          lotId: lot.id,
          type: "SENSOR_ERROR",
          severity: "CRITICAL",
          message: "A-12 슬롯 센서 응답 없음",
          status: "OPEN",
        },
        {
          organizationId: org.id,
          type: "PAYMENT_ERROR",
          severity: "INFO",
          message: "결제 단말기 네트워크 지연 감지",
          status: "ACK",
        },
      ],
    });
  }
  console.log("✓ Sample alerts");

  // ─── Simulation ───────────────────────────────────────────────────────────
  const existingSim = await prisma.simulation.findFirst({
    where: { organizationId: org.id, status: "RUNNING" },
  });

  if (!existingSim) {
    const simulation = await prisma.simulation.create({
      data: {
        organizationId: org.id,
        lotId: lot.id,
        name: "데모 시뮬레이션",
        status: "RUNNING",
        gateState: "CLOSED",
      },
    });

    const token = randomBytes(32).toString("hex");
    await prisma.simulationQrToken.create({
      data: {
        simulationId: simulation.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    console.log("✓ Demo simulation created, token:", token.slice(0, 16) + "...");
  }

  console.log("\n🎉 Seed complete!");
  console.log("  Admin:    admin@demo.com / admin123");
  console.log("  Operator: operator@demo.com / operator123");
  console.log("  Billing:  billing@demo.com / billing123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
