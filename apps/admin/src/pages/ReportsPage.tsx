import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { api } from "../api/client";

interface DailyReport {
  date: string;
  entries: number;
  exits: number;
  revenue: number;
  avgDurationMinutes: number;
  peakHour: number;
}

export function ReportsPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  useEffect(() => {
    loadReport();
  }, [date]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get<DailyReport>(`/reports/daily?date=${date}`);
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportStart || !exportEnd) return;
    try {
      const blob = await api.get<Blob>(`/reports/export?startDate=${exportStart}&endDate=${exportEnd}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${exportStart}-${exportEnd}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = report
    ? [
        { name: "입차", value: report.entries, fill: "#3b82f6" },
        { name: "출차", value: report.exits, fill: "#22c55e" },
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>리포트</h1>

      {/* Date picker */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 14,
          }}
        />
        <button
          onClick={loadReport}
          style={{
            padding: "8px 16px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          조회
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>로딩 중...</p>}

      {report && (
        <>
          {/* KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {[
              { label: "입차 수", value: report.entries, icon: "🚗" },
              { label: "출차 수", value: report.exits, icon: "🚙" },
              { label: "일 매출 (원)", value: report.revenue.toLocaleString("ko-KR"), icon: "💰" },
              { label: "평균 주차 시간", value: `${Math.round(report.avgDurationMinutes)}분`, icon: "⏱" },
              { label: "피크 시간대", value: `${report.peakHour}시`, icon: "📈" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "20px 24px",
              }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>입출차 현황</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* CSV Export */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>CSV 내보내기</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={exportStart}
            onChange={(e) => setExportStart(e.target.value)}
            style={inputStyle}
            placeholder="시작일"
          />
          <span style={{ color: "var(--text-muted)" }}>~</span>
          <input
            type="date"
            value={exportEnd}
            onChange={(e) => setExportEnd(e.target.value)}
            style={inputStyle}
            placeholder="종료일"
          />
          <button
            onClick={handleExport}
            disabled={!exportStart || !exportEnd}
            style={{
              padding: "8px 20px",
              background: "var(--success)20",
              border: "1px solid var(--success)",
              borderRadius: 8,
              color: "var(--success)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            CSV 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
};
