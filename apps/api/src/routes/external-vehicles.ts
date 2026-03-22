import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

// 방문차량(실제 주차 세션) + 예약차량(Reservation)을 통합 조회
export async function externalVehicleRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get<{
    Querystring: {
      type?: "ALL" | "VISITOR" | "RESERVATION";
      plateNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: string;
    };
  }>("/api/external-vehicles", async (request) => {
    const {
      type = "ALL",
      plateNumber,
      dateFrom,
      dateTo,
      limit = "100",
    } = request.query;

    const orgId = request.user.organizationId;
    const take = Math.min(parseInt(limit, 10) || 100, 500);
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : undefined;

    const results: {
      type: "VISITOR" | "RESERVATION";
      plateNumber: string;
      vehicleType: string;
      ownerType: string;
      entryTime: string;
      exitTime: string | null;
      slotCode: string | null;
      zoneName: string | null;
      status: string;
    }[] = [];

    // ── 방문차량: ParkingSession ────────────────────────────────────────────────
    if (type === "ALL" || type === "VISITOR") {
      const sessions = await prisma.parkingSession.findMany({
        where: {
          slot: { zone: { lot: { organizationId: orgId } } },
          ...(from || to
            ? { entryTime: { ...(from && { gte: from }), ...(to && { lte: to }) } }
            : {}),
          ...(plateNumber
            ? { vehicle: { plateNumber: { contains: plateNumber } } }
            : {}),
        },
        include: {
          vehicle: { select: { plateNumber: true, vehicleType: true, ownerType: true } },
          slot: {
            select: {
              slotCode: true,
              zone: { select: { name: true } },
            },
          },
        },
        orderBy: { entryTime: "desc" },
        take,
      });

      for (const s of sessions) {
        results.push({
          type: "VISITOR",
          plateNumber: s.vehicle.plateNumber,
          vehicleType: s.vehicle.vehicleType,
          ownerType: s.vehicle.ownerType,
          entryTime: s.entryTime.toISOString(),
          exitTime: s.exitTime?.toISOString() ?? null,
          slotCode: s.slot.slotCode,
          zoneName: s.slot.zone.name,
          status: s.exitTime ? "출차" : "주차 중",
        });
      }
    }

    // ── 예약차량: Reservation ───────────────────────────────────────────────────
    if (type === "ALL" || type === "RESERVATION") {
      const reservations = await prisma.reservation.findMany({
        where: {
          slot: { zone: { lot: { organizationId: orgId } } },
          ...(from || to
            ? { startTime: { ...(from && { gte: from }), ...(to && { lte: to }) } }
            : {}),
          ...(plateNumber
            ? { vehicle: { plateNumber: { contains: plateNumber } } }
            : {}),
        },
        include: {
          vehicle: { select: { plateNumber: true, vehicleType: true, ownerType: true } },
          slot: {
            select: {
              slotCode: true,
              zone: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: "desc" },
        take,
      });

      for (const r of reservations) {
        results.push({
          type: "RESERVATION",
          plateNumber: r.vehicle?.plateNumber ?? "-",
          vehicleType: r.vehicle?.vehicleType ?? "-",
          ownerType: r.vehicle?.ownerType ?? "-",
          entryTime: r.startTime.toISOString(),
          exitTime: r.endTime.toISOString(),
          slotCode: r.slot.slotCode,
          zoneName: r.slot.zone.name,
          status: r.status,
        });
      }
    }

    // 시간 역순 정렬 후 limit 적용
    results.sort((a, b) => (a.entryTime < b.entryTime ? 1 : -1));

    return { vehicles: results.slice(0, take), total: results.length };
  });
}
