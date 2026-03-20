import { networkInterfaces } from "os";

import { FastifyInstance } from "fastify";

function getLanIp(): string | null {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

export async function serverInfoRoute(app: FastifyInstance) {
  app.get("/api/server-info", async () => {
    return { lanIp: getLanIp() };
  });
}
