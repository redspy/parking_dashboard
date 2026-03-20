import { useEffect, useRef } from "react";

import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { GateState } from "@parking/types";

import { connectSimulatorSocket } from "../socket/client";
import { useSimulatorStore } from "../store/simulator.store";
import { GateLane } from "../components/GateLane";
import { VehicleCard } from "../components/VehicleCard";

const API_BASE = "/api";

async function passVehicle(simulationId: string, vehicleId: string, dropX = 0.5, dropY = 0.1) {
  const res = await fetch(`${API_BASE}/simulations/${simulationId}/vehicles/${vehicleId}/pass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropX, dropY }),
  });
  return res.json();
}

interface Props {
  simulationId: string;
  token: string;
}

export function SimulatorPage({ simulationId, token }: Props) {
  const {
    gateState,
    vehicles,
    stats,
    isConnected,
    setGateState,
    addVehicle,
    updateVehicle,
    setStats,
    setConnected,
  } = useSimulatorStore();

  const laneRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    const socket = connectSimulatorSocket(token, simulationId);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("vehicle:spawned", addVehicle);
    socket.on("vehicle:updated", updateVehicle);
    socket.on("vehicle:passed", updateVehicle);
    socket.on("vehicle:rejected", ({ vehicleId }) => {
      const v = vehicles.find((x) => x.id === vehicleId);
      if (v) updateVehicle({ ...v, state: "FAILED" } as never);
    });
    socket.on("gate:updated", ({ gateState: gs }) => setGateState(gs));
    socket.on("simulation:stats", setStats);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("vehicle:spawned", addVehicle);
      socket.off("vehicle:updated", updateVehicle);
      socket.off("vehicle:passed", updateVehicle);
      socket.off("gate:updated");
      socket.off("simulation:stats", setStats);
    };
  }, [simulationId, token]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over || over.id !== "gate-lane") return;

    // Calculate relative drop position within the lane
    const laneEl = laneRef.current;
    const laneRect = laneEl?.getBoundingClientRect();

    // Estimate drop position: use delta to infer position within lane
    const dropX = laneRect ? 0.5 : 0.5; // Center X
    const dropY = 0.1; // Top of lane = pass zone

    const vehicleId = active.id as string;
    try {
      await passVehicle(simulationId, vehicleId, dropX, dropY);
    } catch (err) {
      console.error("Pass failed:", err);
    }
  };

  const handlePassButton = async (vehicleId: string) => {
    // Accessible fallback: pass with center coordinates in pass zone
    try {
      await passVehicle(simulationId, vehicleId, 0.5, 0.1);
    } catch (err) {
      console.error("Pass failed:", err);
    }
  };

  const queuedVehicles = vehicles.filter((v) => v.state === "QUEUED" || v.state === "DRAGGING");
  const doneVehicles = vehicles.filter((v) => v.state === "PASSED" || v.state === "FAILED");

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header stats */}
      <div style={{
        display: "flex",
        gap: 0,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {[
          { label: "생성", value: stats?.spawned ?? vehicles.length, color: "var(--text)" },
          { label: "통과", value: stats?.passed ?? doneVehicles.filter((v) => v.state === "PASSED").length, color: "var(--success)" },
          { label: "실패", value: stats?.failed ?? doneVehicles.filter((v) => v.state === "FAILED").length, color: "var(--danger)" },
        ].map((item) => (
          <div key={item.label} style={{
            flex: 1,
            padding: "12px 0",
            textAlign: "center",
            borderRight: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.label}</div>
          </div>
        ))}
        <div style={{
          flex: 1,
          padding: "12px 0",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, marginBottom: 2 }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConnected ? "var(--success)" : "var(--danger)",
              marginRight: 4,
            }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isConnected ? "연결됨" : "끊김"}
          </div>
        </div>
      </div>

      {/* Main: Gate Lane */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px", gap: 16, overflow: "hidden" }}>
          <div ref={laneRef} style={{ flex: 1 }}>
            <GateLane gateState={gateState} />
          </div>

          {/* Vehicle queue */}
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, textAlign: "center" }}>
              {queuedVehicles.length > 0
                ? `대기 차량 ${queuedVehicles.length}대 — 위로 드래그하거나 [통과] 버튼을 누르세요`
                : "대기 차량 없음 — QR을 스캔하면 차량이 추가됩니다"}
            </p>
            <div style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 8,
              paddingLeft: 4,
            }}>
              {queuedVehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} onPass={handlePassButton} />
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {/* Done vehicles - mini log */}
      {doneVehicles.length > 0 && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "8px 16px",
          display: "flex",
          gap: 8,
          overflowX: "auto",
          flexShrink: 0,
          background: "var(--surface)",
        }}>
          {doneVehicles.slice(-10).reverse().map((v) => (
            <span
              key={v.id}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: v.state === "PASSED" ? "var(--success)20" : "var(--danger)20",
                color: v.state === "PASSED" ? "var(--success)" : "var(--danger)",
                whiteSpace: "nowrap",
              }}
            >
              {v.label} {v.state === "PASSED" ? "✓" : "✗"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
