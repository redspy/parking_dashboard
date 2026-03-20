import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";

export async function healthRoute(app: FastifyInstance) {
  app.get("/health", async (_request, _reply) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {}

    const pendingJobs = await prisma.jobQueue
      .count({ where: { status: "PENDING" } })
      .catch(() => -1);

    return {
      status: dbOk ? "ok" : "degraded",
      db: dbOk,
      queueDepth: pendingJobs,
      ts: new Date().toISOString(),
    };
  });
}
