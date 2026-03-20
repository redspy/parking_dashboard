import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { ZoneSummary } from "@parking/types";

interface Props {
  zones: ZoneSummary[];
}

const CONGESTION_COLORS: Record<string, string> = {
  NORMAL: "#22c55e",
  CAUTION: "#f59e0b",
  CONGESTED: "#ef4444",
};

export function ZoneChart({ zones }: Props) {
  const data = zones.map((z) => ({
    name: z.zoneName,
    rate: Math.round(z.occupancyRate * 100),
    congestion: z.congestionLevel,
  }));

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>구역별 점유율</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            formatter={(value) => [`${value}%`, "점유율"]}
          />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={CONGESTION_COLORS[entry.congestion] ?? "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {Object.entries(CONGESTION_COLORS).map(([level, color]) => (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {level === "NORMAL" ? "정상" : level === "CAUTION" ? "주의" : "혼잡"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
