import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get<{ Querystring: { date?: string; lotId?: string } }>(
    "/api/reports/daily",
    async (request) => {
      const dateStr = request.query.date ?? new Date().toISOString().split("T")[0];
      const { lotId } = request.query;

      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const sessions = await prisma.parkingSession.findMany({
        where: {
          slot: {
            zone: {
              lot: {
                organizationId: request.user.organizationId,
                ...(lotId && { id: lotId }),
              },
            },
          },
          entryTime: { gte: startOfDay, lte: endOfDay },
        },
        include: { paymentTransactions: true },
      });

      const entries = sessions.length;
      const exits = sessions.filter((s) => s.exitTime !== null).length;
      const revenue = sessions.reduce((sum, s) => sum + (s.feeAmount ?? 0), 0);

      const completedSessions = sessions.filter((s) => s.exitTime !== null);
      const avgDurationMinutes =
        completedSessions.length === 0
          ? 0
          : completedSessions.reduce((sum, s) => {
              const ms = s.exitTime!.getTime() - s.entryTime.getTime();
              return sum + ms / (1000 * 60);
            }, 0) / completedSessions.length;

      // Find peak hour
      const hourCounts = new Array(24).fill(0);
      sessions.forEach((s) => {
        hourCounts[s.entryTime.getHours()]++;
      });
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

      return { date: dateStr, entries, exits, revenue, avgDurationMinutes, peakHour };
    },
  );

  // CSV download
  app.get<{ Querystring: { startDate: string; endDate: string; lotId?: string } }>(
    "/api/reports/export",
    { preHandler: [requireRole("ADMIN", "BILLING")] },
    async (request, reply) => {
      const { startDate, endDate, lotId } = request.query;

      const sessions = await prisma.parkingSession.findMany({
        where: {
          slot: {
            zone: { lot: { organizationId: request.user.organizationId, ...(lotId && { id: lotId }) } },
          },
          entryTime: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        include: { vehicle: true, slot: { include: { zone: true } } },
        orderBy: { entryTime: "asc" },
      });

      const rows = [
        "id,plateNumber,slotCode,zone,entryTime,exitTime,durationMin,fee,paymentStatus",
        ...sessions.map((s) => {
          const duration = s.exitTime
            ? Math.round((s.exitTime.getTime() - s.entryTime.getTime()) / 60000)
            : "";
          return [
            s.id,
            s.vehicle.plateNumber,
            s.slot.slotCode,
            s.slot.zone.name,
            s.entryTime.toISOString(),
            s.exitTime?.toISOString() ?? "",
            duration,
            s.feeAmount ?? "",
            s.paymentStatus,
          ].join(",");
        }),
      ].join("\n");

      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="report-${startDate}-${endDate}.csv"`)
        .send(rows);
    },
  );
}
