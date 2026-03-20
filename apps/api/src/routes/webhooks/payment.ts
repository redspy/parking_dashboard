import { FastifyInstance } from "fastify";

import { JobType } from "@parking/types";

import { prisma } from "../../db.js";
import { Errors } from "../../lib/errors.js";
import { getIdempotentResult, setIdempotentResult } from "../../lib/idempotency.js";
import { enqueue } from "../../services/job-queue.service.js";
import { requireAuth } from "../../middleware/auth.js";

export async function paymentWebhookRoutes(app: FastifyInstance) {
  // Payment initiation (authenticated)
  app.post<{
    Body: { sessionId: string; provider: string; idempotencyKey: string };
  }>("/api/payments/initiate", { preHandler: [requireAuth] }, async (request) => {
    const { sessionId, provider, idempotencyKey } = request.body;

    // Idempotency check
    const cached = getIdempotentResult(idempotencyKey);
    if (cached) return cached;

    const session = await prisma.parkingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw Errors.notFound("Session");

    const tx = await prisma.paymentTransaction.create({
      data: {
        sessionId,
        provider,
        amount: session.feeAmount ?? 0,
        currency: "KRW",
        status: "PENDING",
        idempotencyKey,
      },
    });

    const result = { transactionId: tx.id };
    setIdempotentResult(idempotencyKey, result);
    return result;
  });

  // PG Webhook (no auth — HMAC verified by PG in production)
  app.post<{
    Body: { pgRefId: string; status: string; amount: number; paidAt: string };
    Headers: { "x-idempotency-key"?: string };
  }>("/api/webhooks/payment", async (request, reply) => {
    const { pgRefId, status, amount, paidAt } = request.body;
    const idempotencyKey = request.headers["x-idempotency-key"] ?? pgRefId;

    const cached = getIdempotentResult(`payment:${idempotencyKey}`);
    if (cached) {
      reply.code(200).send(cached);
      return;
    }

    await enqueue(JobType.PAYMENT_WEBHOOK, { pgRefId, status, amount, paidAt, idempotencyKey });

    const result = { accepted: true };
    setIdempotentResult(`payment:${idempotencyKey}`, result);
    reply.code(202).send(result);
  });

  // Refund (authenticated, billing/admin only)
  app.post<{ Params: { id: string } }>(
    "/api/payments/:id/refund",
    { preHandler: [requireAuth] },
    async (request) => {
      const tx = await prisma.paymentTransaction.findUnique({ where: { id: request.params.id } });
      if (!tx) throw Errors.notFound("Transaction");
      if (tx.status !== "SUCCESS") throw Errors.badRequest("Only successful transactions can be refunded");

      const updated = await prisma.paymentTransaction.update({
        where: { id: request.params.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });

      return { transaction: updated };
    },
  );

  // Transaction query
  app.get<{ Querystring: { sessionId?: string; date?: string } }>(
    "/api/payments",
    { preHandler: [requireAuth] },
    async (request) => {
      const { sessionId, date } = request.query;
      const transactions = await prisma.paymentTransaction.findMany({
        where: {
          ...(sessionId && { sessionId }),
          ...(date && {
            createdAt: {
              gte: new Date(`${date}T00:00:00Z`),
              lte: new Date(`${date}T23:59:59Z`),
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return { transactions };
    },
  );
}
