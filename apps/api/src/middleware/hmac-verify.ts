import { createHmac, timingSafeEqual } from "crypto";

import { FastifyRequest, FastifyReply } from "fastify";

export function hmacVerify(secret: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["x-signature-256"] as string | undefined;
    if (!signature) {
      reply.code(401).send({ error: "UNAUTHORIZED", message: "Missing signature" });
      return;
    }

    const body =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);
    const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
        reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid signature" });
      }
    } catch {
      reply.code(401).send({ error: "UNAUTHORIZED", message: "Signature verification failed" });
    }
  };
}
