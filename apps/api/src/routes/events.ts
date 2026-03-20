import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export async function eventRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get<{ Querystring: { type?: "entry" | "exit"; limit?: string; lotId?: string } }>(
    "/api/events",
    async (request) => {
      const { type, limit = "50", lotId } = request.query;
      const limitNum = Math.min(Number(limit), 200);

      const sessions = await prisma.parkingSession.findMany({
        where: {
          slot: { zone: { lot: { organizationId: request.user.organizationId, ...(lotId && { id: lotId }) } } },
          ...(type === "entry" && { exitTime: null }),
          ...(type === "exit" && { exitTime: { not: null } }),
        },
        include: {
          vehicle: true,
          slot: { include: { zone: true } },
        },
        orderBy: { entryTime: "desc" },
        take: limitNum,
      });

      const events = sessions.map((s) => ({
        id: s.id,
        type: s.exitTime ? "EXIT" : "ENTRY",
        plateNumber: s.vehicle.plateNumber,
        slotCode: s.slot.slotCode,
        zoneName: s.slot.zone.name,
        timestamp: (s.exitTime ?? s.entryTime).toISOString(),
        paymentStatus: s.paymentStatus,
      }));

      return { events };
    },
  );
}
