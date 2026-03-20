import { GateState } from "@parking/types";

import { prisma } from "../db.js";
import { Errors } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const TRANSITION_DELAY_MS = 1500; // Time for OPENING/CLOSING animation

// Valid transitions: from → allowed nexts
const TRANSITIONS: Record<string, string[]> = {
  CLOSED: ["OPENING"],
  OPENING: ["OPEN"],
  OPEN: ["CLOSING"],
  CLOSING: ["CLOSED"],
};

export async function getGateState(simulationId: string): Promise<GateState> {
  const sim = await prisma.simulation.findUnique({ where: { id: simulationId } });
  if (!sim) throw Errors.notFound("Simulation");
  return sim.gateState as GateState;
}

export async function transitionGate(
  simulationId: string,
  targetState: GateState,
  emitFn: (simulationId: string, gateState: GateState) => void,
): Promise<GateState> {
  const sim = await prisma.simulation.findUnique({ where: { id: simulationId } });
  if (!sim) throw Errors.notFound("Simulation");

  const allowed = TRANSITIONS[sim.gateState] ?? [];
  if (!allowed.includes(targetState)) {
    throw Errors.badRequest(
      `Cannot transition gate from ${sim.gateState} to ${targetState}`,
    );
  }

  // Intermediate state
  await prisma.simulation.update({
    where: { id: simulationId },
    data: { gateState: targetState },
  });

  emitFn(simulationId, targetState);
  logger.info({ simulationId, gateState: targetState }, "Gate state changed");

  return targetState;
}

export async function openGate(
  simulationId: string,
  emitFn: (simulationId: string, gateState: GateState) => void,
): Promise<void> {
  await transitionGate(simulationId, GateState.OPENING, emitFn);
  setTimeout(async () => {
    await prisma.simulation.update({
      where: { id: simulationId },
      data: { gateState: GateState.OPEN },
    });
    emitFn(simulationId, GateState.OPEN);
  }, TRANSITION_DELAY_MS);
}

export async function closeGate(
  simulationId: string,
  emitFn: (simulationId: string, gateState: GateState) => void,
): Promise<void> {
  await transitionGate(simulationId, GateState.CLOSING, emitFn);
  setTimeout(async () => {
    await prisma.simulation.update({
      where: { id: simulationId },
      data: { gateState: GateState.CLOSED },
    });
    emitFn(simulationId, GateState.CLOSED);
  }, TRANSITION_DELAY_MS);
}

// Pass zone: top 30% of the lane area (y < 0.3 relative)
const PASS_ZONE_Y_THRESHOLD = 0.3;
const PASS_ZONE_X_MIN = 0.2;
const PASS_ZONE_X_MAX = 0.8;

export function isInPassZone(dropX: number, dropY: number): boolean {
  return (
    dropY < PASS_ZONE_Y_THRESHOLD &&
    dropX >= PASS_ZONE_X_MIN &&
    dropX <= PASS_ZONE_X_MAX
  );
}
