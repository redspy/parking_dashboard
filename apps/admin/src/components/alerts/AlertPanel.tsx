import { Alert } from "@parking/types";

import { api } from "../../api/client";
import { useDashboardStore } from "../../store/dashboard.store";

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "var(--danger)",
  WARN: "var(--warning)",
  INFO: "var(--primary)",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "미확인",
  ACK: "확인됨",
  RESOLVED: "해결됨",
};

export function AlertPanel() {
  const { alerts, updateAlert } = useDashboardStore();
  const openAlerts = alerts.filter((a) => a.status !== "RESOLVED").slice(0, 10);

  const handleAck = async (alert: Alert) => {
    if (alert.status !== "OPEN") return;
    try {
      const res = await api.patch<{ alert: Alert }>(`/alerts/${alert.id}/ack`);
      updateAlert(res.alert);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (alert: Alert) => {
    if (alert.status === "RESOLVED") return;
    try {
      const res = await api.patch<{ alert: Alert }>(`/alerts/${alert.id}/resolve`);
      updateAlert(res.alert);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
      height: "100%",
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
        경보 패널
        {openAlerts.filter((a) => a.status === "OPEN").length > 0 && (
          <span style={{
            marginLeft: 8,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 12,
            background: "var(--danger)30",
            color: "var(--danger)",
          }}>
            {openAlerts.filter((a) => a.status === "OPEN").length}
          </span>
        )}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 360 }}>
        {openAlerts.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            활성 경보 없음
          </p>
        )}
        {openAlerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--bg)",
              borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] ?? "var(--border)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: SEVERITY_COLOR[alert.severity],
                    textTransform: "uppercase",
                  }}>
                    {alert.severity}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {STATUS_LABEL[alert.status]}
                  </span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.4 }}>{alert.message}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(alert.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {alert.status === "OPEN" && (
                  <button
                    onClick={() => handleAck(alert)}
                    style={btnStyle("#1d4ed840", "#60a5fa")}
                  >
                    확인
                  </button>
                )}
                {alert.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleResolve(alert)}
                    style={btnStyle("#14532d40", "#4ade80")}
                  >
                    해결
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    background: bg,
    color,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
