interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export function KPICard({ label, value, sub, color = "var(--primary)", icon }: KPICardProps) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}
