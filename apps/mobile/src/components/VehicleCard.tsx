import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { SimulationVehicle } from "@parking/types";

interface Props {
  vehicle: SimulationVehicle;
  onPass: (vehicleId: string) => void;
  isApproaching?: boolean;
}

export function VehicleCard({ vehicle, onPass, isApproaching }: Props) {
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
  const isActive = isDragging || isApproaching;

  // Extract plate number from vehicle (may be stored in label or plateNumber field)
  const plateNumber = (vehicle as SimulationVehicle & { plateNumber?: string }).plateNumber;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDone ? 0.35 : isApproaching ? 0.5 : 1,
        background: isActive
          ? "var(--primary)30"
          : isPassed
            ? "var(--success)20"
            : isFailed
              ? "var(--danger)20"
              : "var(--bg)",
        border: `1px solid ${
          isActive ? "var(--primary)"
            : isPassed ? "var(--success)"
              : isFailed ? "var(--danger)"
                : "var(--border)"
        }`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: isDone ? "default" : "grab",
        flexShrink: 0,
        minWidth: 110,
        maxWidth: 140,
        transition: isActive ? "none" : "all 0.25s",
        textAlign: "center",
      }}
      {...(!isDone ? listeners : {})}
      {...(!isDone ? attributes : {})}
    >
      <div style={{ fontSize: 28 }}>🚗</div>

      {/* Label (plate number if set, else CAR-XXX) */}
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        marginTop: 6,
        color: isPassed ? "var(--success)" : isFailed ? "var(--danger)" : "var(--text)",
        fontFamily: plateNumber ? "monospace" : "inherit",
        letterSpacing: plateNumber ? "0.05em" : "normal",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {vehicle.label}
      </div>

      {/* Secondary label: if label is plate number, show nothing; if label is CAR-XXX and has plate, show plate */}
      {plateNumber && vehicle.label !== plateNumber && (
        <div style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "monospace",
          marginTop: 2,
        }}>
          {plateNumber}
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
        {isPassed ? "✅ 통과" : isFailed ? "❌ 실패" : isApproaching ? "🚀 접근 중" : "대기"}
      </div>

      {/* Pass button */}
      {!isDone && !isApproaching && (
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
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 36,
          }}
        >
          통과 ▶
        </button>
      )}
    </div>
  );
}
