import { JobType } from "@parking/types";

import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";
import { processJob } from "../services/job-queue.service.js";

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 10;

// ─── Job Handlers ─────────────────────────────────────────────────────────────
async function handleSensorEvent(payload: Record<string, unknown>) {
  // Update slot status based on sensor reading
  const { slotId, occupied } = payload as { slotId: string; occupied: boolean };
  if (!slotId) return;

  await prisma.parkingSlot.update({
    where: { id: slotId },
    data: { status: occupied ? "OCCUPIED" : "EMPTY", lastChangedAt: new Date() },
  });
}

async function handlePaymentWebhook(payload: Record<string, unknown>) {
  const { transactionId, status, pgRefId, paidAt } = payload as {
    transactionId: string;
    status: string;
    pgRefId: string;
    paidAt: string;
  };

  await prisma.paymentTransaction.update({
    where: { id: transactionId },
    data: {
      status,
      pgRefId,
      paidAt: status === "SUCCESS" ? new Date(paidAt) : null,
    },
  });
}

async function handleAnprEvent(payload: Record<string, unknown>) {
  // ANPR events are processed by anpr.service — here we just log for now
  logger.info({ payload }, "ANPR event processed from queue");
}

async function handleReservationExpiry(payload: Record<string, unknown>) {
  const { reservationId } = payload as { reservationId: string };

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status !== "PENDING") return;
  if (new Date() < reservation.endTime) return; // Not yet expired

  await prisma.$transaction([
    prisma.reservation.update({ where: { id: reservationId }, data: { status: "EXPIRED" } }),
    prisma.parkingSlot.update({
      where: { id: reservation.slotId },
      data: { status: "EMPTY" },
    }),
  ]);
}

const HANDLERS: Record<string, (payload: Record<string, unknown>) => Promise<void>> = {
  [JobType.SENSOR_EVENT]: handleSensorEvent,
  [JobType.PAYMENT_WEBHOOK]: handlePaymentWebhook,
  [JobType.ANPR_EVENT]: handleAnprEvent,
  [JobType.RESERVATION_EXPIRY]: handleReservationExpiry,
};

// ─── Poller ───────────────────────────────────────────────────────────────────
async function poll() {
  const jobs = await prisma.jobQueue.findMany({
    where: { status: "PENDING", nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: "asc" },
    take: BATCH_SIZE,
  });

  if (jobs.length === 0) return;

  logger.debug({ count: jobs.length }, "Processing job batch");

  await Promise.allSettled(
    jobs.map((job) => {
      const handler = HANDLERS[job.type];
      if (!handler) {
        logger.warn({ jobId: job.id, type: job.type }, "No handler for job type");
        return prisma.jobQueue.update({ where: { id: job.id }, data: { status: "FAILED" } });
      }
      return processJob(job.id, handler);
    }),
  );
}

export function startQueuePoller() {
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Job queue poller started");
  const interval = setInterval(() => {
    poll().catch((err) => logger.error(err, "Queue poll error"));
  }, POLL_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGTERM", () => clearInterval(interval));
  process.on("SIGINT", () => clearInterval(interval));
}
