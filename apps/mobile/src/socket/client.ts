import { io, Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@parking/types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function connectSimulatorSocket(qrToken: string, simulationId: string): AppSocket {
  if (socket?.connected) return socket;

  socket = io("/", {
    query: { qrToken },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected");
    socket!.emit("room:join_simulation", simulationId);
  });

  socket.on("connect_error", (err) => console.error("[Socket] Error:", err.message));
  return socket;
}

export function getSimulatorSocket(): AppSocket | null {
  return socket;
}
