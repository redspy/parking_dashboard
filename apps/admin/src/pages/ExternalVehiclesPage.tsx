import { useEffect, useState } from "react";

import { api } from "../api/client";

type VehicleType = "ALL" | "VISITOR" | "RESERVATION";

interface VehicleRecord {
  id: string;
  type: "VISITOR" | "RESERVATION";
  plateNumber: string;
  enteredAt?: string;
  exitedAt?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  lotName?: string;
  hostName?: string;
}

export function ExternalVehiclesPage() {
  const [list, setList] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VehicleType>("ALL");
  const [plateSearch, setPlateSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (plateSearch.trim()) params.set("plateNumber", plateSearch.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", "100");

      const res = await api.get<{ vehicles: VehicleRecord[] }>(
        `/external-vehicles?${params.toString()}`,
      );
      setList(res.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleReset = () => {
    setPlateSearch("");
    setDateFrom("");
    setDateTo("");
    setTypeFilter("ALL");
    setTimeout(load, 0);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const typeBadge = (type: "VISITOR" | "RESERVATION") =>
    type === "VISITOR"
      ? { label: "방문", bg: "#1d4ed840", color: "#60a5fa" }
      : { label: "예약", bg: "#15803d40", color: "#4ade80" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>외부차량 통합 조회</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          방문차량(입출차 기록)과 예약차량을 통합 조회합니다.
        </p>
      </div>

      {/* 검색 필터 */}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        {/* 유형 */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as VehicleType)}
          style={selectStyle}
        >
          <option value="ALL">전체 유형</option>
          <option value="VISITOR">방문차량</option>
          <option value="RESERVATION">예약차량</option>
        </select>

        {/* 차량번호 */}
        <input
          value={plateSearch}
          onChange={(e) => setPlateSearch(e.target.value)}
          placeholder="차량 번호 검색"
          style={{ ...inputStyle, width: 180 }}
        />

        {/* 날짜 범위 */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{ ...inputStyle, width: 150 }}
        />
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{ ...inputStyle, width: 150 }}
        />

        <button
          type="submit"
          style={{
            padding: "9px 18px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          조회
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: "9px 14px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          초기화
        </button>
      </form>

      {/* 결과 카운트 */}
      {!loading && (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          총 <strong style={{ color: "var(--text)" }}>{list.length}</strong>건
        </p>
      )}

      {/* 목록 */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
              <th style={th}>유형</th>
              <th style={th}>차량 번호</th>
              <th style={th}>주차장</th>
              <th style={th}>입차 / 예약 시작</th>
              <th style={th}>출차 / 예약 종료</th>
              <th style={th}>상태</th>
              <th style={th}>담당자</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  로딩 중...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  조회된 차량이 없습니다.
                </td>
              </tr>
            )}
            {list.map((v) => {
              const badge = typeBadge(v.type);
              const startTime = v.enteredAt ?? v.startTime;
              const endTime = v.exitedAt ?? v.endTime;
              return (
                <tr key={`${v.type}-${v.id}`} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
                    {v.plateNumber}
                  </td>
                  <td style={{ ...td, color: "var(--text-muted)" }}>{v.lotName ?? "-"}</td>
                  <td style={{ ...td, color: "var(--text-muted)" }}>{formatDateTime(startTime)}</td>
                  <td style={{ ...td, color: "var(--text-muted)" }}>{formatDateTime(endTime)}</td>
                  <td style={td}>
                    {v.status ? (
                      <span style={{ fontSize: 12, color: statusColor(v.status) }}>{v.status}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ ...td, color: "var(--text-muted)" }}>{v.hostName ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "CHECKED_IN":
      return "var(--success, #4ade80)";
    case "CANCELLED":
    case "EXPIRED":
      return "var(--danger)";
    default:
      return "var(--text-muted)";
  }
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 500 };
const td: React.CSSProperties = { padding: "12px 16px" };
const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 13,
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 130,
};
