import { Alert, DashboardSummary, GateEvent, SimulationStats, SimulationVehicle, ZoneSummary } from "./models.js";
import { GateState } from "./enums.js";

// ─── Server → Client events ───────────────────────────────────────────────────
export interface ServerToClientEvents {
  // Dashboard room (dashboard:${orgId})
  "dashboard:summary": (data: DashboardSummary) => void;
  "dashboard:zones": (data: ZoneSummary[]) => void;
  "dashboard:alert_created": (alert: Alert) => void;
  "dashboard:alert_updated": (alert: Alert) => void;

  // Simulation room (sim:${simulationId})
  "vehicle:spawned": (vehicle: SimulationVehicle) => void;
  "vehicle:updated": (vehicle: SimulationVehicle) => void;
  "vehicle:passed": (vehicle: SimulationVehicle) => void;
  "vehicle:rejected": (data: { vehicleId: string; reason: string }) => void;
  "gate:updated": (data: { simulationId: string; gateState: GateState }) => void;
  "simulation:stats": (stats: SimulationStats) => void;
  "gate:event": (event: GateEvent) => void;
}

// ─── Client → Server events ───────────────────────────────────────────────────
export interface ClientToServerEvents {
  // Join rooms
  "room:join_dashboard": (orgId: string) => void;
  "room:join_simulation": (simulationId: string) => void;

  // Simulation interactions (from mobile)
  "vehicle:drag_start": (data: { simulationId: string; vehicleId: string }) => void;
}

// ─── Inter-server events (for future Redis adapter) ───────────────────────────
export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket data attached per socket ─────────────────────────────────────────
export interface SocketData {
  userId: string;
  organizationId: string;
  role: string;
}
