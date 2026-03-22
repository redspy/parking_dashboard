import { FastifyInstance } from "fastify";

import { AlertSeverity, AlertType, AnprDirection, JobType } from "@parking/types";

import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { hmacVerify } from "../../middleware/hmac-verify.js";
import { Errors } from "../../lib/errors.js";
import { createAlert } from "../../services/alert.service.js";
import { enqueue } from "../../services/job-queue.service.js";

export async function anprWebhookRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      plateNumber: string;
      gateId: string;
      direction: AnprDirection;
      confidence: number;
      timestamp: string;
      imageUrl?: string;
    };
  }>(
    "/api/webhooks/anpr",
    { preHandler: [hmacVerify(config.ANPR_WEBHOOK_SECRET)] },
    async (request, reply) => {
      const { plateNumber, gateId, direction, confidence, timestamp, imageUrl } = request.body;

      // Find the lot associated with this gate (gateId maps to lot in real setup)
      const lot = await prisma.parkingLot.findFirst({
        where: { id: gateId },
      });

      const confidenceThreshold = lot?.anprConfidenceThreshold ?? 0.9;

      // Low confidence → create alert and enqueue for manual review
      if (confidence < confidenceThreshold) {
        if (lot) {
          await createAlert({
            organizationId: lot.organizationId,
            lotId: lot.id,
            type: AlertType.ANPR_LOW_CONFIDENCE,
            severity: AlertSeverity.WARN,
            message: `Low confidence ANPR read: ${plateNumber} (${(confidence * 100).toFixed(1)}%) at gate ${gateId}`,
          });
        }
        reply.code(202).send({ accepted: true, action: "manual_review" });
        return;
      }

      // 블랙리스트 차량 체크
      if (lot && direction === AnprDirection.IN) {
        const blacklisted = await prisma.blacklistVehicle.findUnique({
          where: {
            organizationId_plateNumber: {
              organizationId: lot.organizationId,
              plateNumber: plateNumber.toUpperCase(),
            },
          },
        });

        if (blacklisted) {
          await createAlert({
            organizationId: lot.organizationId,
            lotId: lot.id,
            type: AlertType.BLACKLIST_HIT,
            severity: AlertSeverity.ERROR,
            message: `블랙리스트 차량 입차 시도: ${plateNumber} — 사유: ${blacklisted.reason}`,
          });
          reply.code(202).send({ accepted: true, action: "blacklist_blocked" });
          return;
        }
      }

      // Enqueue for processing
      await enqueue(JobType.ANPR_EVENT, {
        plateNumber,
        gateId,
        direction,
        confidence,
        timestamp,
        imageUrl: imageUrl ?? null,
        lotId: lot?.id ?? null,
      });

      reply.code(202).send({ accepted: true, action: "queued" });
    },
  );

  app.get<{ Querystring: { gateId?: string; date?: string; limit?: string } }>(
    "/api/anpr/logs",
    async (request) => {
      const { gateId, date, limit = "50" } = request.query;
      // ANPR logs are stored in sensor_events or gate_events
      // For MVP, return gate events with ANPR type from job queue
      const jobs = await prisma.jobQueue.findMany({
        where: {
          type: "ANPR_EVENT",
          ...(date && {
            createdAt: {
              gte: new Date(`${date}T00:00:00Z`),
              lte: new Date(`${date}T23:59:59Z`),
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });

      return {
        logs: jobs.map((j) => ({ id: j.id, ...JSON.parse(j.payloadJson), status: j.status })),
      };
    },
  );
}
