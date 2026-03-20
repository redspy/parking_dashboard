import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { auditLog } from "../middleware/audit-log.js";
import { assertOwnership, requireAuth } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";
import {
  createSimulation,
  getSimulationStats,
  processPassAttempt,
  scanQr,
} from "../services/simulation.service.js";
import { closeGate, openGate } from "../services/gate.service.js";
import {
  emitGateUpdated,
  emitSimulationStats,
  emitVehicleSpawned,
  emitVehicleUpdated,
} from "../socket/index.js";
import { GateState } from "@parking/types";

export async function simulationRoutes(app: FastifyInstance) {
  // Public QR scan endpoint (auth by token, not JWT)
  app.post<{ Body: { token: string } }>("/api/simulations/scan", async (request) => {
    const { token } = request.body;
    const vehicle = await scanQr(token);

    // Get simulation to find room
    const sim = await prisma.simulationQrToken.findUnique({
      where: { token },
      include: { simulation: true },
    });

    if (sim) {
      emitVehicleSpawned(sim.simulationId, vehicle);
      const stats = await getSimulationStats(sim.simulationId);
      emitSimulationStats(sim.simulationId, stats);
    }

    return { vehicle };
  });

  // Authenticated routes below
  app.addHook("onRequest", requireAuth);

  app.post<{ Body: { name: string; lotId?: string; tokenExpiresInMinutes?: number } }>(
    "/api/simulations",
    async (request) => {
      const { name, lotId, tokenExpiresInMinutes } = request.body;
      const result = await createSimulation(
        request.user.organizationId,
        name,
        lotId,
        tokenExpiresInMinutes,
      );
      return result;
    },
  );

  app.get<{ Params: { id: string } }>("/api/simulations/:id", async (request) => {
    const simulation = await prisma.simulation.findUnique({
      where: { id: request.params.id },
      include: { qrTokens: true },
    });
    if (!simulation) throw Errors.notFound("Simulation");
    await assertOwnership(request.user.organizationId, simulation.organizationId);

    const stats = await getSimulationStats(simulation.id);
    return { simulation, stats };
  });

  app.get("/api/simulations", async (request) => {
    const simulations = await prisma.simulation.findMany({
      where: { organizationId: request.user.organizationId },
      include: { qrTokens: { orderBy: { expiresAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    return { simulations };
  });

  app.post<{ Params: { id: string; vehicleId: string }; Body: { dropX: number; dropY: number } }>(
    "/api/simulations/:id/vehicles/:vehicleId/pass",
    async (request) => {
      const { id, vehicleId } = request.params;
      const { dropX, dropY } = request.body;

      const simulation = await prisma.simulation.findUnique({ where: { id } });
      if (!simulation) throw Errors.notFound("Simulation");
      await assertOwnership(request.user.organizationId, simulation.organizationId);

      const result = await processPassAttempt(id, vehicleId, dropX, dropY);

      emitVehicleUpdated(id, result.vehicle);
      emitSimulationStats(id, result.stats);

      return result;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/simulations/:id/gate/open",
    { preHandler: [auditLog("GATE_OPEN", "Simulation")] },
    async (request) => {
      const simulation = await prisma.simulation.findUnique({ where: { id: request.params.id } });
      if (!simulation) throw Errors.notFound("Simulation");
      await assertOwnership(request.user.organizationId, simulation.organizationId);

      await openGate(request.params.id, emitGateUpdated);
      return { success: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/simulations/:id/gate/close",
    { preHandler: [auditLog("GATE_CLOSE", "Simulation")] },
    async (request) => {
      const simulation = await prisma.simulation.findUnique({ where: { id: request.params.id } });
      if (!simulation) throw Errors.notFound("Simulation");
      await assertOwnership(request.user.organizationId, simulation.organizationId);

      await closeGate(request.params.id, emitGateUpdated);
      return { success: true };
    },
  );

  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    "/api/simulations/:id/end",
    async (request) => {
      const simulation = await prisma.simulation.findUnique({ where: { id: request.params.id } });
      if (!simulation) throw Errors.notFound("Simulation");
      await assertOwnership(request.user.organizationId, simulation.organizationId);

      const updated = await prisma.simulation.update({
        where: { id: request.params.id },
        data: { status: "ENDED", endedAt: new Date() },
      });
      return { simulation: updated };
    },
  );
}
