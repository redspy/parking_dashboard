import { QRCodeSVG } from "qrcode.react";

interface Props {
  token: string;
  simulationId: string;
  mobileBaseUrl?: string;
}

export function QRCodePanel({ token, simulationId, mobileBaseUrl }: Props) {
  // 현재 브라우저의 실제 IP/호스트를 기반으로 모바일 URL 생성
  // localhost → 실제 LAN IP로 자동 치환되어 QR 스캔 시 모바일 접속 가능
  const hostname = window.location.hostname;
  const resolvedBase = mobileBaseUrl ?? `http://${hostname}:5174`;
  const url = `${resolvedBase}/?token=${token}&sim=${simulationId}`;

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
