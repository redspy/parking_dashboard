import { randomBytes } from "crypto";

import { GateEventType, GateState, SimulationStats, VehicleState } from "@parking/types";

import { prisma } from "../db.js";
import { Errors } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { isInPassZone } from "./gate.service.js";

export async function createSimulation(
  organizationId: string,
  name: string,
  lotId: string | undefined,
  tokenExpiresInMinutes = 60,
) {
  const simulation = await prisma.simulation.create({
    data: {
      organizationId,
      lotId: lotId ?? null,
      name,
      status: "RUNNING",
      gateState: "CLOSED",
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + tokenExpiresInMinutes * 60 * 1000);

  const qrToken = await prisma.simulationQrToken.create({
    data: {
      simulationId: simulation.id,
      token,
      expiresAt,
    },
  });

  return { simulation, qrToken };
}

export async function scanQr(token: string, plateNumber?: string) {
  const qrToken = await prisma.simulationQrToken.findUnique({ where: { token } });
  if (!qrToken) throw Errors.notFound("QR token");
  if (new Date() > qrToken.expiresAt) throw Errors.badRequest("QR token expired");

  const simulation = await prisma.simulation.findUnique({
    where: { id: qrToken.simulationId },
  });
  if (!simulation) throw Errors.notFound("Simulation");
  if (simulation.status === "ENDED") throw Errors.badRequest("Simulation has ended");

  // Increment scan count
  await prisma.simulationQrToken.update({
    where: { id: qrToken.id },
    data: { scanCount: { increment: 1 } },
  });

  // Spawn a vehicle
  const vehicleCount = await prisma.simulationVehicle.count({
    where: { simulationId: simulation.id },
  });
  const label = plateNumber?.trim()
    ? plateNumber.trim()
    : `CAR-${String(vehicleCount + 1).padStart(3, "0")}`;

  const vehicle = await prisma.simulationVehicle.create({
    data: {
      simulationId: simulation.id,
      sourceTokenId: qrToken.id,
      label,
      plateNumber: plateNumber?.trim() || null,
      state: "QUEUED",
    },
  });

  await prisma.gateEvent.create({
    data: {
      simulationId: simulation.id,
      vehicleId: vehicle.id,
      eventType: "SPAWNED",
      payloadJson: JSON.stringify({ label, token: token.slice(0, 8) + "..." }),
    },
  });

  logger.info({ simulationId: simulation.id, vehicleId: vehicle.id, label }, "Vehicle spawned");
  return vehicle;
}

export async function processPassAttempt(
  simulationId: string,
  vehicleId: string,
  dropX: number,
  dropY: number,
) {
  const [simulation, vehicle] = await Promise.all([
    prisma.simulation.findUnique({ where: { id: simulationId } }),
    prisma.simulationVehicle.findUnique({ where: { id: vehicleId } }),
  ]);

  if (!simulation) throw Errors.notFound("Simulation");
  if (!vehicle) throw Errors.notFound("Vehicle");
  if (vehicle.simulationId !== simulationId) throw Errors.forbidden();
  if (vehicle.state !== "QUEUED" && vehicle.state !== "DRAGGING") {
    throw Errors.badRequest(`Vehicle is already in state: ${vehicle.state}`);
  }

  const gateOpen = simulation.gateState === GateState.OPEN;
  const inPassZone = isInPassZone(dropX, dropY);
  const passed = gateOpen && inPassZone;

  const newState: VehicleState = passed ? VehicleState.PASSED : VehicleState.FAILED;
  const eventType: GateEventType = passed ? GateEventType.PASSED : GateEventType.REJECTED;
  const reason = !gateOpen
    ? "Gate is not open"
    : !inPassZone
      ? "Drop position outside pass zone"
      : undefined;

  const [updatedVehicle] = await prisma.$transaction([
    prisma.simulationVehicle.update({
      where: { id: vehicleId },
      data: {
        state: newState,
        passedAt: passed ? new Date() : null,
      },
    }),
    prisma.gateEvent.create({
      data: {
        simulationId,
        vehicleId,
        eventType: "DROP_ATTEMPT",
        payloadJson: JSON.stringify({ dropX, dropY, gateOpen, inPassZone }),
      },
    }),
    prisma.gateEvent.create({
      data: {
        simulationId,
        vehicleId,
        eventType,
        payloadJson: JSON.stringify({ reason }),
      },
    }),
  ]);

  const stats = await getSimulationStats(simulationId);
  return { result: passed ? "PASSED" as const : "REJECTED" as const, reason, vehicle: updatedVehicle, stats };
}

export async function getSimulationStats(simulationId: string): Promise<SimulationStats> {
  const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
  if (!simulation) throw Errors.notFound("Simulation");

  const [spawned, passed, failed] = await Promise.all([
    prisma.simulationVehicle.count({ where: { simulationId } }),
    prisma.simulationVehicle.count({ where: { simulationId, state: "PASSED" } }),
    prisma.simulationVehicle.count({ where: { simulationId, state: "FAILED" } }),
  ]);

  return {
    simulationId,
    spawned,
    passed,
    failed,
    gateState: simulation.gateState as GateState,
  };
}
