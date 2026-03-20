import { useEffect, useState } from "react";

import { api } from "../api/client";

interface SlotSession {
  vehicle: { plateNumber: string } | null;
}

interface Slot {
  id: string;
  slotCode: string;
  status: string;
  isEvCharging: boolean;
  chargerStatus: string | null;
  zone: { name: string; floor: string };
  sessions: SlotSession[];
}

interface Zone {
  id: string;
  name: string;
  floor: string;
  slots: Slot[];
}

const STATUS_COLOR: Record<string, string> = {
  EMPTY: "var(--success)",
  OCCUPIED: "var(--danger)",
  RESERVED: "var(--warning)",
  OUT_OF_SERVICE: "var(--text-muted)",
};

const STATUS_LABEL: Record<string, string> = {
  EMPTY: "빈 자리",
  OCCUPIED: "사용 중",
  RESERVED: "예약됨",
  OUT_OF_SERVICE: "사용 불가",
};

export function ZonePage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ zones: Zone[] }>("/zones")
      .then((res) => {
        setZones(res.zones);
        if (res.zones.length > 0) setSelectedZone("all");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allSlots = zones.flatMap((z) => z.slots);
  const displaySlots = selectedZone === "all"
    ? allSlots
    : zones.find((z) => z.id === selectedZone)?.slots ?? [];

  // 슬롯 코드 또는 현재 점유 차량 번호판으로 검색
  const filteredSlots = search.trim()
    ? displaySlots.filter((s) => {
        const q = search.toLowerCase();
        const plateMatch = s.sessions[0]?.vehicle?.plateNumber?.toLowerCase().includes(q);
        return s.slotCode.toLowerCase().includes(q) || plateMatch;
      })
    : displaySlots;

  const occupied = displaySlots.filter((s) => s.status === "OCCUPIED").length;
  const total = displaySlots.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>주차 현황</h1>

      {/* 구역 탭 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedZone("all")}
          style={tabStyle(selectedZone === "all")}
        >
          전체 <span style={{ fontSize: 12 }}>({allSlots.length})</span>
        </button>
        {zones.map((zone) => {
          const occ = zone.slots.filter((s) => s.status === "OCCUPIED").length;
          const rate = zone.slots.length > 0 ? Math.round(occ / zone.slots.length * 100) : 0;
          return (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              style={tabStyle(selectedZone === zone.id)}
            >
              {zone.name}
              <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>
                ({zone.floor}) {rate}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 요약 + 검색 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-muted)" }}>
          <span>전체 <strong style={{ color: "var(--text)" }}>{total}</strong>면</span>
          <span>사용 중 <strong style={{ color: "var(--danger)" }}>{occupied}</strong>면</span>
          <span>빈 자리 <strong style={{ color: "var(--success)" }}>{total - occupied}</strong>면</span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="슬롯 코드 또는 번호판 검색"
          style={{
            width: 240,
            padding: "8px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[status], display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>⚡</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>EV 충전</span>
        </div>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>로딩 중...</p>}

      {/* 검색 결과 없음 */}
      {!loading && search && filteredSlots.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          "{search}"에 해당하는 슬롯이 없습니다.
        </p>
      )}

      {/* 슬롯 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
        gap: 8,
      }}>
        {filteredSlots.map((slot) => {
          const plate = slot.sessions[0]?.vehicle?.plateNumber;
          return (
            <div
              key={slot.id}
              title={`${slot.slotCode} (${slot.zone.name} ${slot.zone.floor})\n상태: ${STATUS_LABEL[slot.status]}${plate ? `\n차량: ${plate}` : ""}`}
              style={{
                padding: "10px 6px",
                borderRadius: 8,
                background: `${STATUS_COLOR[slot.status]}18`,
                border: `1px solid ${STATUS_COLOR[slot.status]}50`,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: STATUS_COLOR[slot.status],
                cursor: "default",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {slot.isEvCharging && (
                <span style={{ position: "absolute", top: 3, right: 4, fontSize: 9 }}>⚡</span>
              )}
              <span>{slot.slotCode}</span>
              {plate && (
                <span style={{ fontSize: 9, fontWeight: 400, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {plate}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "var(--primary)20" : "var(--surface)",
    color: active ? "var(--primary)" : "var(--text-muted)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    whiteSpace: "nowrap",
  };
}
