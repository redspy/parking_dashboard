import { useEffect, useRef, useState } from "react";

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
import { GateBarrier } from "../components/GateBarrier";
import { VehicleCard } from "../components/VehicleCard";

const API_BASE = "/api";

const ANIMATION_DURATION_MS = 900;

async function callScan(token: string, plateNumber?: string) {
  const res = await fetch(`${API_BASE}/simulations/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, plateNumber: plateNumber?.trim() || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "참여 실패");
  return data;
}

async function passVehicle(simulationId: string, vehicleId: string, token: string, dropX = 0.5, dropY = 0.1) {
  const res = await fetch(`${API_BASE}/simulations/${simulationId}/vehicles/${vehicleId}/pass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropX, dropY, token }),
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

  // Join flow
  const [hasJoined, setHasJoined] = useState(false);
  const [plateInput, setPlateInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Extra vehicle (manual add after initial join)
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [extraPlate, setExtraPlate] = useState("");
  const [adding, setAdding] = useState(false);

  // Approach animation
  const [approachingId, setApproachingId] = useState<string | null>(null);
  const [approachPhase, setApproachPhase] = useState<"idle" | "moving" | "result">("idle");
  const [approachResult, setApproachResult] = useState<"pass" | "fail" | null>(null);

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setJoining(true);
    try {
      await callScan(token, plateInput);
      setHasJoined(true);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "참여 실패");
    } finally {
      setJoining(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await callScan(token, extraPlate);
      setExtraPlate("");
      setShowAddVehicle(false);
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const triggerApproach = async (vehicleId: string) => {
    if (approachPhase !== "idle") return;

    setApproachingId(vehicleId);
    setApproachPhase("moving");
    setApproachResult(null);

    // Wait for animation to reach gate
    await new Promise((res) => setTimeout(res, ANIMATION_DURATION_MS));

    try {
      const result = await passVehicle(simulationId, vehicleId, token, 0.5, 0.1);
      const passed = result.result === "PASSED";
      setApproachResult(passed ? "pass" : "fail");
    } catch {
      setApproachResult("fail");
    }

    setApproachPhase("result");
    await new Promise((res) => setTimeout(res, 800));

    setApproachingId(null);
    setApproachPhase("idle");
    setApproachResult(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || over.id !== "gate-lane") return;
    const vehicleId = active.id as string;
    await triggerApproach(vehicleId);
  };

  const queuedVehicles = vehicles.filter((v) => v.state === "QUEUED" || v.state === "DRAGGING");
  const doneVehicles = vehicles.filter((v) => v.state === "PASSED" || v.state === "FAILED");

  const gateOpen = gateState === GateState.OPEN;
  const approaching = vehicles.find((v) => v.id === approachingId);

  // ─── Join Screen ─────────────────────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        gap: 24,
        background: "var(--bg)",
      }}>
        <style>{`
          @keyframes car-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
        <div style={{ fontSize: 64, animation: "car-bounce 1.6s ease-in-out infinite" }}>🚗</div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>주차 시뮬레이터</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            차량 번호를 입력하면 예약 차량 여부를<br />관리자 화면에서 확인할 수 있습니다.
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            value={plateInput}
            onChange={(e) => setPlateInput(e.target.value)}
            placeholder="차량 번호 (예: 123가4567) — 선택사항"
            style={{
              padding: "14px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
              fontSize: 16,
              outline: "none",
              textAlign: "center",
              letterSpacing: "0.05em",
            }}
          />

          {joinError && (
            <div style={{
              padding: "10px 14px",
              background: "#7f1d1d30",
              border: "1px solid var(--danger)",
              borderRadius: 8,
              fontSize: 13,
              color: "#fca5a5",
              textAlign: "center",
            }}>
              {joinError}
            </div>
          )}

          <button
            type="submit"
            disabled={joining}
            style={{
              padding: "15px 0",
              background: joining ? "var(--border)" : "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: joining ? "not-allowed" : "pointer",
            }}
          >
            {joining ? "참여 중..." : "🚘 시뮬레이션 참여"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: isConnected ? "var(--success)" : "var(--danger)",
          }} />
          {isConnected ? "서버 연결됨" : "서버 연결 중..."}
        </div>
      </div>
    );
  }

  // ─── Simulator Screen ─────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      <style>{`
        @keyframes approach-move {
          0%   { transform: translateY(220px) scale(0.7); opacity: 0.4; }
          60%  { transform: translateY(40px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes result-pass {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          50%  { transform: translateY(-50px) scale(1.3); opacity: 0.9; }
          100% { transform: translateY(-100px) scale(0.3); opacity: 0; }
        }
        @keyframes result-fail {
          0%   { transform: translateX(0) translateY(0); }
          15%  { transform: translateX(-12px) translateY(0); }
          30%  { transform: translateX(12px) translateY(0); }
          45%  { transform: translateX(-10px) translateY(0); }
          60%  { transform: translateX(10px) translateY(0); }
          75%  { transform: translateX(-6px) translateY(0); }
          100% { transform: translateX(0) translateY(30px); opacity: 0; }
        }
        @keyframes gate-flash-pass {
          0%,100% { box-shadow: none; }
          50% { box-shadow: 0 0 32px 8px #22c55e80; }
        }
        @keyframes gate-flash-fail {
          0%,100% { box-shadow: none; }
          50% { box-shadow: 0 0 32px 8px #ef444480; }
        }
      `}</style>

      {/* Stats bar */}
      <div style={{
        display: "flex",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {[
          { label: "생성", value: stats?.spawned ?? vehicles.length, color: "var(--text)" },
          { label: "통과", value: stats?.passed ?? doneVehicles.filter((v) => v.state === "PASSED").length, color: "var(--success)" },
          { label: "실패", value: stats?.failed ?? doneVehicles.filter((v) => v.state === "FAILED").length, color: "var(--danger)" },
        ].map((item, i) => (
          <div key={item.label} style={{
            flex: 1,
            padding: "10px 0",
            textAlign: "center",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.label}</div>
          </div>
        ))}
        <div style={{
          width: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: "1px solid var(--border)",
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isConnected ? "var(--success)" : "var(--danger)",
            display: "inline-block",
          }} />
        </div>
      </div>

      {/* Gate + Road area */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Gate section */}
          <div
            ref={laneRef}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 24px",
              position: "relative",
              animation: approachResult === "pass"
                ? "gate-flash-pass 0.6s ease"
                : approachResult === "fail"
                  ? "gate-flash-fail 0.6s ease"
                  : "none",
            }}
          >
            {/* Road lane lines */}
            <div style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 180,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 0,
              pointerEvents: "none",
            }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  width: 3,
                  height: 20,
                  background: "var(--border)",
                  margin: "8px auto",
                  borderRadius: 2,
                  opacity: 0.4,
                }} />
              ))}
            </div>

            {/* Gate barrier */}
            <div style={{
              width: "100%",
              maxWidth: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 14px",
                borderRadius: 999,
                background: gateOpen ? "var(--success)20" : "var(--danger)20",
                color: gateOpen ? "var(--success)" : "var(--danger)",
                border: `1px solid ${gateOpen ? "var(--success)" : "var(--danger)"}`,
              }}>
                {gateState === GateState.OPEN ? "🟢 게이트 열림"
                  : gateState === GateState.OPENING ? "🟡 열리는 중..."
                    : gateState === GateState.CLOSING ? "🟡 닫히는 중..."
                      : "🔴 게이트 닫힘"}
              </div>
              <GateBarrier state={gateState} />
            </div>

            {/* Approaching car animation */}
            {approaching && approachPhase !== "idle" && (
              <div style={{
                position: "absolute",
                bottom: "30%",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontSize: 48,
                animation: approachPhase === "moving"
                  ? `approach-move ${ANIMATION_DURATION_MS}ms ease-out forwards`
                  : approachResult === "pass"
                    ? "result-pass 0.7s ease forwards"
                    : "result-fail 0.7s ease forwards",
                pointerEvents: "none",
              }}>
                🚗
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text)",
                  marginTop: 4,
                  background: "var(--surface)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}>
                  {approaching.label}
                </span>
              </div>
            )}

            {/* Result overlay */}
            {approachPhase === "result" && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 64,
                pointerEvents: "none",
                animation: "result-pass 0.7s ease forwards",
              }}>
                {approachResult === "pass" ? "✅" : "❌"}
              </div>
            )}
          </div>

          {/* Vehicle queue */}
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "12px 16px",
          }}>
            {/* Add vehicle row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {queuedVehicles.length > 0
                  ? `대기 차량 ${queuedVehicles.length}대`
                  : "대기 차량 없음"}
              </p>
              <button
                onClick={() => setShowAddVehicle((v) => !v)}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                + 차량 추가
              </button>
            </div>

            {/* Inline add form */}
            {showAddVehicle && (
              <form
                onSubmit={handleAddVehicle}
                style={{ display: "flex", gap: 8, marginBottom: 10 }}
              >
                <input
                  value={extraPlate}
                  onChange={(e) => setExtraPlate(e.target.value)}
                  placeholder="번호판 입력 (선택사항)"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    padding: "8px 14px",
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: adding ? "not-allowed" : "pointer",
                  }}
                >
                  {adding ? "..." : "추가"}
                </button>
              </form>
            )}

            {/* Queued vehicle cards */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {queuedVehicles.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
                  [+ 차량 추가]를 눌러 차량을 생성하세요
                </p>
              ) : (
                queuedVehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    onPass={triggerApproach}
                    isApproaching={approachingId === v.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </DndContext>

      {/* Done log */}
      {doneVehicles.length > 0 && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "6px 16px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          flexShrink: 0,
          background: "var(--bg)",
        }}>
          {doneVehicles.slice(-8).reverse().map((v) => (
            <span
              key={v.id}
              style={{
                fontSize: 11,
                padding: "2px 8px",
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
