import { useEffect, useState } from "react";

import { api } from "../api/client";

interface Slot {
  id: string;
  slotCode: string;
  status: string;
  isEvCharging: boolean;
  chargerStatus: string | null;
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
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<{ slots: Slot[]; zone: Zone }>("/zones")
      .catch(() => null);

    // Use the parking lots/zones structure
    api
      .get<{ zones: { zoneId: string; zoneName: string; floor: string }[] }>("/dashboard/zones")
      .then(async (res) => {
        // Fetch zone slots - for MVP use the zones summary
        const zoneMapped: Zone[] = res.zones.map((z) => ({
          id: z.zoneId,
          name: z.zoneName,
          floor: z.floor,
          slots: [],
        }));
        setZones(zoneMapped);
        if (zoneMapped.length > 0) setSelectedZone(zoneMapped[0].id);
      })
      .catch(console.error);
  }, []);

  const activeZone = zones.find((z) => z.id === selectedZone);
  const filteredSlots = (activeZone?.slots ?? []).filter(
    (s) => !search || s.slotCode.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>주차 현황</h1>

      {/* Zone tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => setSelectedZone(zone.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${selectedZone === zone.id ? "var(--primary)" : "var(--border)"}`,
              background: selectedZone === zone.id ? "var(--primary)20" : "var(--surface)",
              color: selectedZone === zone.id ? "var(--primary)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: selectedZone === zone.id ? 600 : 400,
            }}
          >
            {zone.name} <span style={{ fontSize: 12 }}>({zone.floor})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="슬롯 코드 검색 (예: A-01)"
        style={{
          maxWidth: 280,
          padding: "8px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text)",
          fontSize: 14,
        }}
      />

      {/* Legend */}
      <div style={{ display: "flex", gap: 16 }}>
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: STATUS_COLOR[status],
              display: "inline-block",
            }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Slot Grid */}
      {filteredSlots.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {zones.length === 0 ? "데이터 로딩 중..." : "슬롯 없음"}
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        gap: 8,
      }}>
        {filteredSlots.map((slot) => (
          <div
            key={slot.id}
            title={`${slot.slotCode}: ${STATUS_LABEL[slot.status]}`}
            style={{
              padding: "12px 8px",
              borderRadius: 8,
              background: `${STATUS_COLOR[slot.status]}20`,
              border: `1px solid ${STATUS_COLOR[slot.status]}40`,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color: STATUS_COLOR[slot.status],
              cursor: "default",
              position: "relative",
            }}
          >
            {slot.isEvCharging && (
              <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10 }}>⚡</span>
            )}
            {slot.slotCode}
          </div>
        ))}
      </div>
    </div>
  );
}
