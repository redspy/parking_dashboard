import { useEffect, useState } from "react";

import { api } from "../api/client";

interface Reservation {
  id: string;
  slotId: string;
  vehicleId: string;
  reservedBy: string;
  startTime: string;
  endTime: string;
  status: string;
  vehicle: { plateNumber: string };
  slot: { slotCode: string };
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "var(--text-muted)",
  CONFIRMED: "var(--primary)",
  CHECKED_IN: "var(--success)",
  CANCELLED: "var(--danger)",
  EXPIRED: "var(--text-muted)",
};

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ reservations: Reservation[] }>("/reservations");
      setReservations(res.reservations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/reservations/${id}/cancel`);
      await loadReservations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>예약 관리</h1>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>로딩 중...</p>}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
              <th style={thStyle}>슬롯</th>
              <th style={thStyle}>번호판</th>
              <th style={thStyle}>예약 시작</th>
              <th style={thStyle}>예약 종료</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                  예약 없음
                </td>
              </tr>
            )}
            {reservations.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={tdStyle}>{r.slot?.slotCode ?? r.slotId.slice(0, 8)}</td>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 600 }}>
                  {r.vehicle?.plateNumber ?? "-"}
                </td>
                <td style={tdStyle}>{new Date(r.startTime).toLocaleString("ko-KR")}</td>
                <td style={tdStyle}>{new Date(r.endTime).toLocaleString("ko-KR")}</td>
                <td style={tdStyle}>
                  <span style={{ color: STATUS_COLOR[r.status] ?? "var(--text)" }}>{r.status}</span>
                </td>
                <td style={tdStyle}>
                  {["PENDING", "CONFIRMED"].includes(r.status) && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--danger)",
                        background: "var(--danger)10",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
};
