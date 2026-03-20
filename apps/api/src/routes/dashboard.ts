import { FastifyInstance } from "fastify";

import { requireAuth } from "../middleware/auth.js";
import {
  getDashboardSummary,
  getEvSummary,
  getZonesSummary,
} from "../services/dashboard.service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/api/dashboard/summary", async (request) => {
    return getDashboardSummary(request.user.organizationId);
  });

  app.get("/api/dashboard/zones", async (request) => {
    const zones = await getZonesSummary(request.user.organizationId);
    return { zones };
  });

  app.get("/api/dashboard/ev-summary", async (request) => {
    return getEvSummary(request.user.organizationId);
  });
}
