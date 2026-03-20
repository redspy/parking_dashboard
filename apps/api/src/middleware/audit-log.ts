import { FastifyRequest, FastifyReply } from "fastify";

import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";

export function auditLog(action: string, resourceType: string) {
  return async (
    request: FastifyRequest<{ Params: { id?: string } }>,
    _reply: FastifyReply,
  ) => {
    const userId = request.user?.sub ?? null;
    const resourceId = request.params?.id ?? "unknown";

    prisma.auditLog
      .create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          payloadJson: JSON.stringify(request.body ?? {}),
        },
      })
      .catch((err) => logger.error(err, "Failed to write audit log"));
  };
}
