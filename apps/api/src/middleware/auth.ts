import { FastifyRequest, FastifyReply } from "fastify";

import { Errors } from "../lib/errors.js";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: string;
  email: string;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply
      .code(401)
      .send({ error: "UNAUTHORIZED", message: "Authentication required" });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (!roles.includes(request.user?.role)) {
      reply.code(403).send({ error: "FORBIDDEN", message: "Insufficient permissions" });
    }
  };
}

export async function assertOwnership(
  organizationId: string,
  resourceOrgId: string | null | undefined,
) {
  if (!resourceOrgId || resourceOrgId !== organizationId) {
    throw Errors.forbidden("Resource does not belong to your organization");
  }
}
