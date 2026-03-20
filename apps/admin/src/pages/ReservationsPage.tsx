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
  vehicle?: { plateNumber: string };
  slot?: { slotCode: string };
}

interface Zone {
  id: string;
  name: string;
  floor: string;
  slots: { id: string; slotCode: string; status: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "var(--text-muted)",
  CONFIRMED: "var(--primary)",
  CHECKED_IN: "var(--success)",
  CANCELLED: "var(--danger)",
  EXPIRED: "var(--text-muted)",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  CONFIRMED: "확정",
  CHECKED_IN: "입차완료",
  CANCELLED: "취소",
  EXPIRED: "만료",
};

const now = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};
const oneHourLater = () => {
  const d = new Date(Date.now() + 3600_000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // 폼 상태
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [ownerType, setOwnerType] = useState("VISITOR");
  const [startTime, setStartTime] = useState(now());
  const [endTime, setEndTime] = useState(oneHourLater());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, zonesData] = await Promise.all([
        api.get<{ reservations: Reservation[] }>("/reservations"),
        api.get<{ zones: Zone[] }>("/zones"),
      ]);
      setReservations(resData.reservations);
      setZones(zonesData.zones);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = zones
    .find((z) => z.id === selectedZone)
    ?.slots.filter((s) => s.status === "EMPTY") ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!selectedSlot) { setFormError("슬롯을 선택하세요."); return; }
    if (!plateNumber.trim()) { setFormError("차량 번호를 입력하세요."); return; }
    if (new Date(endTime) <= new Date(startTime)) { setFormError("종료 시간이 시작 시간보다 늦어야 합니다."); return; }

    try {
      await api.post("/reservations", {
        slotId: selectedSlot,
        plateNumber: plateNumber.trim(),
        vehicleType,
        ownerType,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "예약 생성 실패");
    }
  };

  const resetForm = () => {
    setSelectedZone("");
    setSelectedSlot("");
    setPlateNumber("");
    setVehicleType("CAR");
    setOwnerType("VISITOR");
    setStartTime(now());
    setEndTime(oneHourLater());
    setFormError("");
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/reservations/${id}/cancel`);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await api.post(`/reservations/${id}/check-in`, {});
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>예약 관리</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{
            padding: "10px 20px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 예약 추가
        </button>
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
                  예약이 없습니다. [+ 예약 추가] 버튼을 눌러 예약을 생성하세요.
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
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${STATUS_COLOR[r.status]}20`,
                    color: STATUS_COLOR[r.status],
                  }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                  {r.status === "CONFIRMED" && (
                    <button onClick={() => handleCheckIn(r.id)} style={actionBtn("var(--success)")}>
                      입차
                    </button>
                  )}
                  {["PENDING", "CONFIRMED"].includes(r.status) && (
                    <button onClick={() => handleCancel(r.id)} style={actionBtn("var(--danger)")}>
                      취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 예약 생성 모달 */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "#00000080",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <form
            onSubmit={handleCreate}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 32,
              width: 440,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>예약 추가</h2>

            {formError && (
              <div style={{ padding: "10px 14px", background: "#7f1d1d40", border: "1px solid var(--danger)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>
                {formError}
              </div>
            )}

            <label style={labelStyle}>
              구역 선택
              <select value={selectedZone} onChange={(e) => { setSelectedZone(e.target.value); setSelectedSlot(""); }} required style={inputStyle}>
                <option value="">-- 구역 선택 --</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name} ({z.floor})</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              슬롯 선택 (빈 자리만 표시)
              <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} required style={inputStyle} disabled={!selectedZone}>
                <option value="">-- 슬롯 선택 --</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>{s.slotCode}</option>
                ))}
              </select>
              {selectedZone && availableSlots.length === 0 && (
                <span style={{ fontSize: 11, color: "var(--warning)" }}>해당 구역에 빈 자리가 없습니다.</span>
              )}
            </label>

            <label style={labelStyle}>
              차량 번호
              <input
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="예: 123가4567"
                required
                style={inputStyle}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                차종
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} style={inputStyle}>
                  <option value="CAR">승용차</option>
                  <option value="MOTORCYCLE">오토바이</option>
                  <option value="TRUCK">트럭</option>
                </select>
              </label>
              <label style={labelStyle}>
                고객 유형
                <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} style={inputStyle}>
                  <option value="VISITOR">방문객</option>
                  <option value="MEMBER">회원</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                예약 시작
                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                예약 종료
                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={inputStyle} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="submit" style={{
                flex: 1, padding: "11px 0", background: "var(--primary)", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                예약 확정
              </button>
              <button type="button" onClick={() => setShowModal(false)} style={{
                flex: 1, padding: "11px 0", background: "transparent",
                border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 14, cursor: "pointer",
              }}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "12px 16px" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)" };
const inputStyle: React.CSSProperties = {
  padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", fontSize: 13,
};
function actionBtn(color: string): React.CSSProperties {
  return { padding: "4px 10px", borderRadius: 6, border: `1px solid ${color}`, background: `${color}15`, color, cursor: "pointer", fontSize: 12 };
}
