import { createHash } from "crypto";

import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { Errors } from "../lib/errors.js";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string } }>("/api/auth/login", async (request) => {
    const { email, password } = request.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.passwordHash !== hashPassword(password)) {
      throw Errors.unauthorized();
    }

    const token = app.jwt.sign({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
    };
  });
}
