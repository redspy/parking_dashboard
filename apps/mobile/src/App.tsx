import { useEffect } from "react";

import { useSimulatorStore } from "./store/simulator.store";
import { SimulatorPage } from "./pages/SimulatorPage";

export default function App() {
  const { simulationId, token, init } = useSimulatorStore();

  useEffect(() => {
    // Parse QR URL params: /simulator?token=xxx&sim=yyy
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const s = params.get("sim");
    if (t && s) init(s, t);
  }, []);

  if (!simulationId || !token) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48 }}>🚗</div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>주차 시뮬레이터</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
          관리자 화면에서 QR 코드를 스캔하면<br />시뮬레이터가 자동으로 시작됩니다.
        </p>
        <p style={{ fontSize: 12, color: "#374151", marginTop: 8 }}>
          URL에 <code style={{ background: "#1a1d27", padding: "2px 6px", borderRadius: 4 }}>?token=xxx&sim=yyy</code> 파라미터가 필요합니다.
        </p>
      </div>
    );
  }

  return <SimulatorPage simulationId={simulationId} token={token} />;
}
