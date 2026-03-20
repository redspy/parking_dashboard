import "@fastify/jwt";

interface JwtPayloadShape {
  sub: string;
  organizationId: string;
  role: string;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayloadShape;
    user: JwtPayloadShape;
  }
}
