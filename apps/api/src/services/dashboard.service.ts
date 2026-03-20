import { DashboardSummary, ZoneSummary } from "@parking/types";

import { prisma } from "../db.js";

export async function getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
  const lots = await prisma.parkingLot.findMany({
    where: { organizationId },
    include: { zones: { include: { slots: true } } },
  });

  const allSlots = lots.flatMap((l) => l.zones.flatMap((z) => z.slots));
  const totalSlots = allSlots.length;
  const occupiedSlots = allSlots.filter((s) => s.status === "OCCUPIED").length;
  const emptySlots = allSlots.filter((s) => s.status === "EMPTY").length;
  const occupancyRate = totalSlots > 0 ? occupiedSlots / totalSlots : 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySessions = await prisma.parkingSession.findMany({
    where: {
      slot: { zone: { lot: { organizationId } } },
      entryTime: { gte: startOfDay },
    },
  });

  const todayEntries = todaySessions.length;
  const todayExits = todaySessions.filter((s) => s.exitTime !== null).length;

  const openAlerts = await prisma.alert.count({
    where: { organizationId, status: "OPEN" },
  });

  const evSlots = allSlots.filter((s) => s.isEvCharging);
  const evAvailable = evSlots.filter((s) => s.chargerStatus === "AVAILABLE").length;
  const evInUse = evSlots.filter((s) => s.chargerStatus === "IN_USE").length;
  const evFault = evSlots.filter((s) => s.chargerStatus === "FAULT").length;

  return {
    totalSlots,
    occupiedSlots,
    emptySlots,
    occupancyRate,
    todayEntries,
    todayExits,
    openAlerts,
    evAvailable,
    evInUse,
    evFault,
  };
}

export async function getZonesSummary(organizationId: string): Promise<ZoneSummary[]> {
  const zones = await prisma.parkingZone.findMany({
    where: { lot: { organizationId } },
    include: { slots: true },
  });

  return zones.map((zone) => {
    const total = zone.slots.length;
    const occupied = zone.slots.filter((s) => s.status === "OCCUPIED").length;
    const rate = total > 0 ? occupied / total : 0;

    let congestionLevel: "NORMAL" | "CAUTION" | "CONGESTED";
    if (rate >= 0.85) congestionLevel = "CONGESTED";
    else if (rate >= 0.6) congestionLevel = "CAUTION";
    else congestionLevel = "NORMAL";

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      floor: zone.floor,
      totalSlots: total,
      occupiedSlots: occupied,
      occupancyRate: rate,
      congestionLevel,
    };
  });
}

export async function getEvSummary(organizationId: string) {
  const slots = await prisma.parkingSlot.findMany({
    where: { zone: { lot: { organizationId } }, isEvCharging: true },
  });

  return {
    totalEvSlots: slots.length,
    available: slots.filter((s) => s.chargerStatus === "AVAILABLE").length,
    inUse: slots.filter((s) => s.chargerStatus === "IN_USE").length,
    fault: slots.filter((s) => s.chargerStatus === "FAULT").length,
  };
}
