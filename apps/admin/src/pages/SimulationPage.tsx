import { useEffect, useState } from "react";

import { GateState } from "@parking/types";

import { api } from "../api/client";
import { getSocket } from "../socket/client";
import { useSimulationStore } from "../store/simulation.store";
import { QRCodePanel } from "../components/simulation/QRCodePanel";

interface Simulation {
  id: string;
  name: string;
  status: string;
  gateState: string;
  qrTokens: Array<{ id: string; token: string; expiresAt: string; scanCount: number }>;
}

export function SimulationPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [newSimName, setNewSimName] = useState("새 시뮬레이션");
  const [loading, setLoading] = useState(false);
  const { activeSimulationId, qrToken, stats, vehicles, gateState, setActiveSimulation, setStats, addVehicle, updateVehicle, setGateState } =
    useSimulationStore();

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = async () => {
    try {
      const res = await api.get<{ simulations: Simulation[] }>("/simulations");
      setSimulations(res.simulations);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ simulation: Simulation; qrToken: { token: string } }>(
        "/simulations",
        { name: newSimName },
      );
      setActiveSimulation(res.simulation.id, res.qrToken.token);
      await loadSimulations();
      subscribeToSimulation(res.simulation.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSimulation = (simId: string) => {
    const socket = getSocket();
    socket.emit("room:join_simulation", simId);
    socket.on("vehicle:spawned", addVehicle);
    socket.on("vehicle:updated", updateVehicle);
    socket.on("vehicle:passed", updateVehicle);
    socket.on("simulation:stats", setStats);
    socket.on("gate:updated", ({ gateState: gs }) => setGateState(gs));
  };

  const handleSelectSim = (sim: Simulation) => {
    const token = sim.qrTokens[0]?.token ?? "";
    setActiveSimulation(sim.id, token);
    subscribeToSimulation(sim.id);
  };

  const handleGate = async (action: "open" | "close") => {
    if (!activeSimulationId) return;
    try {
      await api.post(`/simulations/${activeSimulationId}/gate/${action}`, {});
    } catch (err) {
      console.error(err);
    }
  };

  const gateColor: Record<string, string> = {
    CLOSED: "var(--danger)",
    OPENING: "var(--warning)",
    OPEN: "var(--success)",
    CLOSING: "var(--warning)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>QR 시뮬레이터</h1>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left: Simulation list + create */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>새 시뮬레이션</h3>
            <input
              value={newSimName}
              onChange={(e) => setNewSimName(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 10,
              }}
            />
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {loading ? "생성 중..." : "시뮬레이션 생성"}
            </button>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>시뮬레이션 목록</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {simulations.map((sim) => (
                <button
                  key={sim.id}
                  onClick={() => handleSelectSim(sim)}
                  style={{
                    padding: "10px 12px",
                    background: activeSimulationId === sim.id ? "var(--primary)20" : "var(--bg)",
                    border: `1px solid ${activeSimulationId === sim.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 8,
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{sim.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {sim.status} · {sim.qrTokens[0]?.scanCount ?? 0}회 스캔
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Active simulation */}
        {activeSimulationId && qrToken ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "생성된 차량", value: stats?.spawned ?? 0 },
                { label: "통과 성공", value: stats?.passed ?? 0, color: "var(--success)" },
                { label: "통과 실패", value: stats?.failed ?? 0, color: "var(--danger)" },
                {
                  label: "게이트",
                  value: gateState ?? "CLOSED",
                  color: gateColor[gateState ?? "CLOSED"],
                },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: item.color ?? "var(--text)", marginTop: 4 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Gate Controls + QR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>게이트 제어</h3>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => handleGate("open")}
                    style={gateBtn("var(--success)")}
                  >
                    게이트 열기
                  </button>
                  <button
                    onClick={() => handleGate("close")}
                    style={gateBtn("var(--danger)")}
                  >
                    게이트 닫기
                  </button>
                </div>
              </div>

              <QRCodePanel token={qrToken} simulationId={activeSimulationId} />
            </div>

            {/* Vehicle Log */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>차량 로그</h3>
              <div style={{ overflowY: "auto", maxHeight: 240 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>차량</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>상태</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>생성 시각</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>통과 시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{v.label}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            color: v.state === "PASSED" ? "var(--success)" : v.state === "FAILED" ? "var(--danger)" : "var(--text-muted)",
                          }}>
                            {v.state}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                          {new Date(v.spawnedAt).toLocaleTimeString("ko-KR")}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                          {v.passedAt ? new Date(v.passedAt).toLocaleTimeString("ko-KR") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            color: "var(--text-muted)",
            fontSize: 14,
          }}>
            시뮬레이션을 선택하거나 새로 생성하세요
          </div>
        )}
      </div>
    </div>
  );
}

function gateBtn(color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "12px 0",
    background: `${color}20`,
    border: `1px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };
}
