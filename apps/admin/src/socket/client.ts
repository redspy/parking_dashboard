import { io, Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@parking/types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    const token = localStorage.getItem("access_token");
    socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => console.log("[Socket] Connected:", socket!.id));
    socket.on("disconnect", () => console.log("[Socket] Disconnected"));
    socket.on("connect_error", (err) => console.error("[Socket] Error:", err.message));
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
