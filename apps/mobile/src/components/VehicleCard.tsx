import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { SimulationVehicle } from "@parking/types";

interface Props {
  vehicle: SimulationVehicle;
  onPass: (vehicleId: string) => void;
}

export function VehicleCard({ vehicle, onPass }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: vehicle.id,
    disabled: vehicle.state !== "QUEUED" && vehicle.state !== "DRAGGING",
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
    userSelect: "none",
  };

  const isPassed = vehicle.state === "PASSED";
  const isFailed = vehicle.state === "FAILED";
  const isDone = isPassed || isFailed;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.85 : isDone ? 0.4 : 1,
        background: isDragging
          ? "var(--primary)30"
          : isPassed
            ? "var(--success)20"
            : isFailed
              ? "var(--danger)20"
              : "var(--surface)",
        border: `1px solid ${isDragging ? "var(--primary)" : isPassed ? "var(--success)" : isFailed ? "var(--danger)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: isDone ? "default" : "grab",
        flexShrink: 0,
        minWidth: 120,
        transition: isDragging ? "none" : "all 0.3s",
      }}
      {...(!isDone ? listeners : {})}
      {...(!isDone ? attributes : {})}
    >
      <div style={{ fontSize: 24, textAlign: "center" }}>🚗</div>
      <div style={{ fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: 6 }}>
        {vehicle.label}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 2 }}>
        {vehicle.state === "QUEUED" ? "드래그하세요" : vehicle.state === "PASSED" ? "✅ 통과" : vehicle.state === "FAILED" ? "❌ 실패" : "이동 중"}
      </div>

      {/* WCAG 2.2 accessible pass button */}
      {!isDone && (
        <button
          onClick={() => onPass(vehicle.id)}
          aria-label={`${vehicle.label} 차량 통과 요청`}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid var(--primary)",
            background: "var(--primary)20",
            color: "var(--primary)",
            fontSize: 12,
            cursor: "pointer",
            minHeight: 36, // WCAG 2.2: minimum touch target
          }}
        >
          통과
        </button>
      )}
    </div>
  );
}
