import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";

export async function slotRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // 구역 목록 (슬롯 포함)
  app.get<{ Querystring: { lotId?: string } }>("/api/zones", async (request) => {
    const zones = await prisma.parkingZone.findMany({
      where: { lot: { organizationId: request.user.organizationId, ...(request.query.lotId && { id: request.query.lotId }) } },
      include: { slots: { orderBy: { slotCode: "asc" } } },
      orderBy: [{ floor: "asc" }, { name: "asc" }],
    });
    return { zones };
  });

  // 슬롯 목록 (구역 필터, 번호판 검색 포함)
  app.get<{ Querystring: { zoneId?: string; status?: string; plateNumber?: string } }>(
    "/api/slots",
    async (request) => {
      const { zoneId, status, plateNumber } = request.query;

      // 번호판 검색: 해당 차량이 점유 중인 슬롯 찾기
      let occupiedSlotIds: string[] | undefined;
      if (plateNumber) {
        const sessions = await prisma.parkingSession.findMany({
          where: {
            vehicle: { plateNumber: { contains: plateNumber } },
            exitTime: null,
          },
          select: { slotId: true },
        });
        occupiedSlotIds = sessions.map((s) => s.slotId);
      }

      const slots = await prisma.parkingSlot.findMany({
        where: {
          zone: {
            lot: { organizationId: request.user.organizationId },
            ...(zoneId && { id: zoneId }),
          },
          ...(status && { status }),
          ...(occupiedSlotIds && { id: { in: occupiedSlotIds } }),
        },
        include: {
          zone: { select: { name: true, floor: true } },
          sessions: {
            where: { exitTime: null },
            include: { vehicle: { select: { plateNumber: true } } },
            take: 1,
          },
        },
        orderBy: [{ zone: { floor: "asc" } }, { slotCode: "asc" }],
      });
      return { slots };
    },
  );

  // 충전기 상태 수동 갱신
  app.patch<{ Params: { id: string }; Body: { chargerStatus: string } }>(
    "/api/slots/:id/charger-status",
    async (request) => {
      const slot = await prisma.parkingSlot.findUnique({ where: { id: request.params.id } });
      if (!slot) throw Errors.notFound("Slot");

      const updated = await prisma.parkingSlot.update({
        where: { id: request.params.id },
        data: { chargerStatus: request.body.chargerStatus, lastChangedAt: new Date() },
      });
      return { slot: updated };
    },
  );
}
