import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { auditLog } from "../middleware/audit-log.js";
import { assertOwnership, requireAuth } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";
import { acknowledgeAlert, getOpenAlerts, resolveAlert } from "../services/alert.service.js";
import { emitDashboardAlert } from "../socket/index.js";

export async function alertRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get<{ Querystring: { status?: string; lotId?: string } }>(
    "/api/alerts",
    async (request) => {
      const { status, lotId } = request.query;
      const alerts = await prisma.alert.findMany({
        where: {
          organizationId: request.user.organizationId,
          ...(status && { status }),
          ...(lotId && { lotId }),
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 100,
      });
      return { alerts };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/alerts/:id/ack",
    { preHandler: [auditLog("ALERT_ACK", "Alert")] },
    async (request) => {
      const alert = await prisma.alert.findUnique({ where: { id: request.params.id } });
      if (!alert) throw Errors.notFound("Alert");
      await assertOwnership(request.user.organizationId, alert.organizationId);

      const updated = await acknowledgeAlert(request.params.id);
      emitDashboardAlert(request.user.organizationId, updated);
      return { alert: updated };
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/alerts/:id/resolve",
    { preHandler: [auditLog("ALERT_RESOLVE", "Alert")] },
    async (request) => {
      const alert = await prisma.alert.findUnique({ where: { id: request.params.id } });
      if (!alert) throw Errors.notFound("Alert");
      await assertOwnership(request.user.organizationId, alert.organizationId);

      const updated = await resolveAlert(request.params.id);
      emitDashboardAlert(request.user.organizationId, updated);
      return { alert: updated };
    },
  );
}
