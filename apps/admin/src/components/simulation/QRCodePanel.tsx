import { QRCodeSVG } from "qrcode.react";

interface Props {
  token: string;
  simulationId: string;
  mobileBaseUrl?: string;
}

export function QRCodePanel({ token, simulationId, mobileBaseUrl = "http://localhost:5174" }: Props) {
  const url = `${mobileBaseUrl}/simulator?token=${token}&sim=${simulationId}`;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
      padding: 24,
      background: "var(--bg)",
      borderRadius: 12,
      border: "1px solid var(--border)",
    }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>QR 코드를 스캔하면 차량이 생성됩니다</p>
      <div style={{ background: "#fff", padding: 16, borderRadius: 12 }}>
        <QRCodeSVG value={url} size={200} />
      </div>
      <code style={{
        fontSize: 11,
        color: "var(--text-muted)",
        wordBreak: "break-all",
        textAlign: "center",
        maxWidth: 260,
      }}>
        {url}
      </code>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{
        fontSize: 13,
        color: "var(--primary)",
        textDecoration: "none",
      }}>
        모바일 화면 열기 →
      </a>
    </div>
  );
}
