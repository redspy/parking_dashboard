import { Server as HttpServer } from "http";

import {
  ClientToServerEvents,
  GateState,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@parking/types";
import { Server } from "socket.io";

import { config } from "../config.js";
import { logger } from "../lib/logger.js";

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function createSocketServer(httpServer: HttpServer) {
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: config.CORS_ORIGIN.split(","),
        methods: ["GET", "POST"],
      },
    },
  );

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      // Allow unauthenticated mobile simulator connections via QR token query param
      const qrToken = socket.handshake.query?.qrToken as string | undefined;
      if (qrToken) {
        socket.data.userId = "guest";
        socket.data.organizationId = "guest";
        socket.data.role = "guest";
        return next();
      }
      return next(new Error("Authentication required"));
    }

    // For authenticated users, we trust the token verified at HTTP layer
    // In production, verify the JWT here as well
    try {
      // Minimal decode without full fastify jwt context
      const [, payload] = token.split(".");
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
        sub: string;
        organizationId: string;
        role: string;
      };
      socket.data.userId = decoded.sub;
      socket.data.organizationId = decoded.organizationId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.data.userId }, "Socket connected");

    socket.on("room:join_dashboard", (orgId) => {
      if (socket.data.organizationId !== orgId && socket.data.role !== "SUPER_ADMIN") {
        socket.emit("dashboard:summary" as never);
        return;
      }
      socket.join(`dashboard:${orgId}`);
      logger.debug({ socketId: socket.id, orgId }, "Joined dashboard room");
    });

    socket.on("room:join_simulation", (simulationId) => {
      socket.join(`sim:${simulationId}`);
      logger.debug({ socketId: socket.id, simulationId }, "Joined simulation room");
    });

    socket.on("vehicle:drag_start", ({ simulationId, vehicleId }) => {
      io.to(`sim:${simulationId}`).emit("vehicle:updated", {
        id: vehicleId,
        state: "DRAGGING",
      } as never);
    });

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket.IO server not initialized");
  return io;
}

// ─── Emit helpers ─────────────────────────────────────────────────────────────
export function emitGateUpdated(simulationId: string, gateState: GateState) {
  getIo()
    .to(`sim:${simulationId}`)
    .emit("gate:updated", { simulationId, gateState });
}

export function emitVehicleSpawned(simulationId: string, vehicle: unknown) {
  getIo()
    .to(`sim:${simulationId}`)
    .emit("vehicle:spawned", vehicle as never);
}

export function emitVehicleUpdated(simulationId: string, vehicle: unknown) {
  getIo()
    .to(`sim:${simulationId}`)
    .emit("vehicle:updated", vehicle as never);
}

export function emitSimulationStats(simulationId: string, stats: unknown) {
  getIo()
    .to(`sim:${simulationId}`)
    .emit("simulation:stats", stats as never);
}

export function emitDashboardAlert(orgId: string, alert: unknown) {
  getIo()
    .to(`dashboard:${orgId}`)
    .emit("dashboard:alert_created", alert as never);
}

export function emitDashboardSummary(orgId: string, summary: unknown) {
  getIo()
    .to(`dashboard:${orgId}`)
    .emit("dashboard:summary", summary as never);
}
