import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";

export async function applyPricingToSession(sessionId: string, lotId: string, zoneId: string) {
  // Calculate current occupancy for the lot
  const [totalSlots, occupiedSlots] = await Promise.all([
    prisma.parkingSlot.count({ where: { zone: { lotId } } }),
    prisma.parkingSlot.count({ where: { zone: { lotId }, status: "OCCUPIED" } }),
  ]);
  const occupancyRate = totalSlots > 0 ? occupiedSlots / totalSlots : 0;

  // Find applicable active pricing rule (zone-specific first, then lot-wide)
  const rule = await prisma.pricingRule.findFirst({
    where: {
      lotId,
      isActive: true,
      validFrom: { lte: new Date() },
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      occupancyThreshold: { lte: occupancyRate },
    },
    orderBy: [{ zoneId: "asc" }, { occupancyThreshold: "desc" }],
  });

  if (!rule) return null;

  const appliedRate = rule.baseRate * rule.rateMultiplier;

  await prisma.pricingHistory.create({
    data: {
      ruleId: rule.id,
      sessionId,
      appliedRate,
      occupancyAtEntry: occupancyRate,
    },
  });

  logger.info(
    { sessionId, ruleId: rule.id, appliedRate, occupancyRate },
    "Pricing rule applied",
  );

  return { rule, appliedRate, occupancyAtEntry: occupancyRate };
}

export async function calculateFee(sessionId: string): Promise<number> {
  const session = await prisma.parkingSession.findUnique({
    where: { id: sessionId },
    include: { pricingHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!session) return 0;

  const durationMs = (session.exitTime ?? new Date()).getTime() - session.entryTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  const ratePerHour = session.pricingHistory[0]?.appliedRate ?? 1000; // Default 1000 KRW/hr
  return Math.ceil(durationHours * ratePerHour);
}
