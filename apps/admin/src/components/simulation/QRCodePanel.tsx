import { useEffect, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  token: string;
  simulationId: string;
}

export function QRCodePanel({ token, simulationId }: Props) {
  const [mobileBase, setMobileBase] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // API 서버에서 실제 LAN IP를 받아와서 QR URL 구성
    fetch("/api/server-info")
      .then((r) => r.json())
      .then(({ lanIp }: { lanIp: string | null }) => {
        const ip = lanIp ?? window.location.hostname;
        setMobileBase(`http://${ip}:5174`);
      })
      .catch(() => {
        setMobileBase(`http://${window.location.hostname}:5174`);
      });
  }, []);

  const url = mobileBase ? `${mobileBase}/?token=${token}&sim=${simulationId}` : "";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: 24,
      background: "var(--bg)",
      borderRadius: 12,
      border: "1px solid var(--border)",
    }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>QR 코드를 스캔하면 차량이 생성됩니다</p>

      {url ? (
        <div style={{ background: "#fff", padding: 14, borderRadius: 12 }}>
          <QRCodeSVG value={url} size={180} />
        </div>
      ) : (
        <div style={{ width: 180, height: 180, background: "var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>IP 감지 중...</span>
        </div>
      )}

      {/* 모바일 URL 편집 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>모바일 서버 주소</span>
          <button
            onClick={() => setEditing((v) => !v)}
            style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
          >
            {editing ? "완료" : "수정"}
          </button>
        </div>
        {editing ? (
          <input
            value={mobileBase}
            onChange={(e) => setMobileBase(e.target.value)}
            placeholder="http://192.168.x.x:5174"
            style={{
              padding: "6px 10px",
              background: "var(--surface)",
              border: "1px solid var(--primary)",
              borderRadius: 6,
              color: "var(--text)",
              fontSize: 12,
              width: "100%",
            }}
          />
        ) : (
          <code style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>
            {mobileBase || "감지 중..."}
          </code>
        )}
      </div>

      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 13,
          color: "var(--primary)",
          textDecoration: "none",
        }}>
          모바일 화면 열기 →
        </a>
      )}
    </div>
  );
}
