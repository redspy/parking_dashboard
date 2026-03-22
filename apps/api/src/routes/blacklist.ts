import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";

export async function blacklistRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // 블랙리스트 목록 조회
  app.get<{ Querystring: { plateNumber?: string } }>(
    "/api/blacklist",
    async (request) => {
      const { plateNumber } = request.query;
      const list = await prisma.blacklistVehicle.findMany({
        where: {
          organizationId: request.user.organizationId,
          ...(plateNumber && {
            plateNumber: { contains: plateNumber },
          }),
        },
        orderBy: { createdAt: "desc" },
      });
      return { blacklist: list };
    },
  );

  // 블랙리스트 등록
  app.post<{ Body: { plateNumber: string; reason: string } }>(
    "/api/blacklist",
    async (request, reply) => {
      const { plateNumber, reason } = request.body;
      if (!plateNumber?.trim()) throw Errors.badRequest("plateNumber is required");
      if (!reason?.trim()) throw Errors.badRequest("reason is required");

      const existing = await prisma.blacklistVehicle.findUnique({
        where: {
          organizationId_plateNumber: {
            organizationId: request.user.organizationId,
            plateNumber: plateNumber.trim().toUpperCase(),
          },
        },
      });
      if (existing) throw Errors.badRequest("이미 블랙리스트에 등록된 차량입니다.");

      const entry = await prisma.blacklistVehicle.create({
        data: {
          organizationId: request.user.organizationId,
          plateNumber: plateNumber.trim().toUpperCase(),
          reason: reason.trim(),
          registeredBy: request.user.email,
        },
      });
      return reply.code(201).send({ entry });
    },
  );

  // 블랙리스트 해제
  app.delete<{ Params: { id: string } }>(
    "/api/blacklist/:id",
    async (request, reply) => {
      const entry = await prisma.blacklistVehicle.findUnique({
        where: { id: request.params.id },
      });
      if (!entry) throw Errors.notFound("BlacklistVehicle");
      if (entry.organizationId !== request.user.organizationId) throw Errors.forbidden();

      await prisma.blacklistVehicle.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    },
  );
}
