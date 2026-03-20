import { JobType } from "@parking/types";

import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";

export async function enqueue(type: JobType, payload: Record<string, unknown>) {
  return prisma.jobQueue.create({
    data: {
      type,
      payloadJson: JSON.stringify(payload),
      status: "PENDING",
    },
  });
}

export async function processJob(
  jobId: string,
  handler: (payload: Record<string, unknown>) => Promise<void>,
) {
  const job = await prisma.jobQueue.findUnique({ where: { id: jobId } });
  if (!job) return;

  await prisma.jobQueue.update({ where: { id: jobId }, data: { status: "PROCESSING" } });

  try {
    const payload = JSON.parse(job.payloadJson) as Record<string, unknown>;
    await handler(payload);
    await prisma.jobQueue.update({ where: { id: jobId }, data: { status: "DONE" } });
    logger.debug({ jobId, type: job.type }, "Job completed");
  } catch (err) {
    const nextAttempts = job.attempts + 1;
    const failed = nextAttempts >= job.maxAttempts;
    const backoffMs = Math.pow(2, nextAttempts) * 1000; // Exponential backoff

    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: failed ? "FAILED" : "PENDING",
        attempts: nextAttempts,
        nextRunAt: failed ? new Date() : new Date(Date.now() + backoffMs),
      },
    });

    logger.error({ jobId, type: job.type, attempts: nextAttempts, err }, "Job failed");
  }
}
