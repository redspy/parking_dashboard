import { GateState } from "@parking/types";

interface Props {
  state: GateState | null;
}

const GATE_CONFIG: Record<string, { color: string; label: string; angle: number }> = {
  CLOSED: { color: "#ef4444", label: "닫힘", angle: 0 },
  OPENING: { color: "#f59e0b", label: "열리는 중...", angle: -45 },
  OPEN: { color: "#22c55e", label: "열림", angle: -90 },
  CLOSING: { color: "#f59e0b", label: "닫히는 중...", angle: -45 },
};

export function GateBarrier({ state }: Props) {
  const cfg = GATE_CONFIG[state ?? "CLOSED"] ?? GATE_CONFIG.CLOSED;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "20px 0",
      }}
      role="status"
      aria-live="polite"
      aria-label={`게이트 상태: ${cfg.label}`}
    >
      {/* Gate post */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{
          width: 16,
          height: 60,
          background: "#374151",
          borderRadius: "4px 4px 0 0",
        }} />
        {/* Barrier arm */}
        <div style={{
          width: 120,
          height: 10,
          background: cfg.color,
          borderRadius: 5,
          transformOrigin: "left center",
          transform: `rotate(${cfg.angle}deg)`,
          transition: "transform 1.5s ease, background 0.3s",
          boxShadow: `0 0 12px ${cfg.color}80`,
        }} />
      </div>

      {/* Pass zone indicator */}
      <div style={{
        width: 160,
        height: 4,
        background: state === "OPEN" ? "#22c55e40" : "transparent",
        borderRadius: 2,
        border: `1px dashed ${state === "OPEN" ? "#22c55e" : "transparent"}`,
        transition: "all 0.3s",
        marginTop: 4,
      }} />

      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: cfg.color,
        transition: "color 0.3s",
      }}>
        {cfg.label}
      </span>
    </div>
  );
}
