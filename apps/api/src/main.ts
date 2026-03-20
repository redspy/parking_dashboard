import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { isAppError } from "./lib/errors.js";
import { createSocketServer } from "./socket/index.js";
import { startQueuePoller } from "./workers/queue-poller.js";

// Routes
import { healthRoute } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { alertRoutes } from "./routes/alerts.js";
import { eventRoutes } from "./routes/events.js";
import { reportRoutes } from "./routes/reports.js";
import { simulationRoutes } from "./routes/simulations.js";
import { reservationRoutes } from "./routes/reservations.js";
import { sensorWebhookRoutes } from "./routes/webhooks/sensor.js";
import { anprWebhookRoutes } from "./routes/webhooks/anpr.js";
import { paymentWebhookRoutes } from "./routes/webhooks/payment.js";

async function bootstrap() {
  const app = Fastify({
    logger: false, // Use pino directly
    trustProxy: true,
  });

  // ─── Plugins ───────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(","),
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      error: "RATE_LIMITED",
      message: "Too many requests, please try again later",
    }),
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.setErrorHandler((err, _request, reply) => {
    if (isAppError(err)) {
      reply.code(err.statusCode).send({ error: err.code, message: err.message });
      return;
    }
    logger.error(err, "Unhandled error");
    reply.code(500).send({ error: "INTERNAL_ERROR", message: "Something went wrong" });
  });

  // ─── Routes ────────────────────────────────────────────────────────────────
  await app.register(healthRoute);
  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(alertRoutes);
  await app.register(eventRoutes);
  await app.register(reportRoutes);
  await app.register(simulationRoutes);
  await app.register(reservationRoutes);
  await app.register(sensorWebhookRoutes);
  await app.register(anprWebhookRoutes);
  await app.register(paymentWebhookRoutes);

  // ─── Socket.IO ────────────────────────────────────────────────────────────
  await app.ready();
  createSocketServer(app.server);

  // ─── Start ────────────────────────────────────────────────────────────────
  await app.listen({ port: config.PORT, host: config.HOST });
  logger.info({ port: config.PORT }, "API server started");

  // ─── Job Queue Poller ─────────────────────────────────────────────────────
  startQueuePoller();
}

bootstrap().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
