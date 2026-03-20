import { FastifyInstance } from "fastify";

import { JobType } from "@parking/types";

import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { hmacVerify } from "../../middleware/hmac-verify.js";
import { Errors } from "../../lib/errors.js";
import { enqueue } from "../../services/job-queue.service.js";

export async function sensorWebhookRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      serialNumber: string;
      eventType: string;
      slotCode?: string;
      occupied?: boolean;
      payload?: Record<string, unknown>;
      timestamp: string;
    };
  }>(
    "/api/webhooks/sensor",
    { preHandler: [hmacVerify(config.SENSOR_WEBHOOK_SECRET)] },
    async (request, reply) => {
      const { serialNumber, eventType, slotCode, occupied, payload, timestamp } = request.body;

      // Find sensor by serial number
      const sensor = await prisma.sensorDevice.findFirst({ where: { serialNumber } });
      if (!sensor) throw Errors.notFound("Sensor device");

      // Write sensor event
      await prisma.sensorEvent.create({
        data: {
          sensorId: sensor.id,
          eventType,
          payloadJson: JSON.stringify({ slotCode, occupied, payload, timestamp }),
        },
      });

      // Update heartbeat
      await prisma.sensorDevice.update({
        where: { id: sensor.id },
        data: { lastHeartbeatAt: new Date(), status: "ONLINE" },
      });

      // Enqueue for async processing
      if (eventType === "OCCUPANCY_CHANGE" && sensor.slotId) {
        await enqueue(JobType.SENSOR_EVENT, { slotId: sensor.slotId, occupied });
      }

      reply.code(202).send({ accepted: true });
    },
  );
}
