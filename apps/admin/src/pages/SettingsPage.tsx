import { useAuthStore } from "../store/auth.store";

export function SettingsPage() {
  const { user } = useAuthStore();

  if (user?.role !== "ADMIN") {
    return (
      <div style={{ color: "var(--text-muted)", padding: 32 }}>
        관리자 권한이 필요합니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>설정</h1>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>시스템 정보</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
          {[
            { label: "조직 ID", value: user?.organizationId },
            { label: "계정 이메일", value: user?.email },
            { label: "역할", value: user?.role },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", gap: 16 }}>
              <span style={{ color: "var(--text-muted)", minWidth: 100 }}>{item.label}</span>
              <span style={{ fontFamily: "monospace" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>요금 정책</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          기본 요금: 1,000원/시간 · 혼잡 요금(80% 이상): ×1.5배 적용
        </p>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>경보 임계치</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          혼잡도 주의: 60% · 혼잡: 85% · ANPR 신뢰도 최소: 90%
        </p>
      </div>
    </div>
  );
}
