interface EventItem {
  id: string;
  type: "ENTRY" | "EXIT";
  plateNumber: string;
  slotCode: string;
  zoneName: string;
  timestamp: string;
  paymentStatus?: string;
}

interface Props {
  events: EventItem[];
}

const PAYMENT_COLOR: Record<string, string> = {
  UNPAID: "var(--warning)",
  PAID: "var(--success)",
  EXEMPT: "var(--text-muted)",
};

export function EventFeed({ events }: Props) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>최근 차량 이벤트</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
              <th style={thStyle}>유형</th>
              <th style={thStyle}>번호판</th>
              <th style={thStyle}>슬롯</th>
              <th style={thStyle}>구역</th>
              <th style={thStyle}>결제</th>
              <th style={thStyle}>시간</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                  이벤트 없음
                </td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={tdStyle}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: event.type === "ENTRY" ? "#1d4ed840" : "#14532d40",
                    color: event.type === "ENTRY" ? "#60a5fa" : "#4ade80",
                  }}>
                    {event.type === "ENTRY" ? "입차" : "출차"}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace" }}>{event.plateNumber}</td>
                <td style={tdStyle}>{event.slotCode}</td>
                <td style={tdStyle}>{event.zoneName}</td>
                <td style={tdStyle}>
                  {event.paymentStatus && (
                    <span style={{ color: PAYMENT_COLOR[event.paymentStatus] ?? "var(--text)" }}>
                      {event.paymentStatus === "UNPAID" ? "미납" : event.paymentStatus === "PAID" ? "완납" : "면제"}
                    </span>
                  )}
                </td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>
                  {new Date(event.timestamp).toLocaleString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
  textAlign: "left",
  padding: "8px 12px",
  fontWeight: 500,
  fontSize: 12,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 12px",
};
