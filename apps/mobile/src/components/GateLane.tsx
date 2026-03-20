import { useDroppable } from "@dnd-kit/core";

import { GateState } from "@parking/types";
import { GateBarrier } from "./GateBarrier";

interface Props {
  gateState: GateState | null;
}

export function GateLane({ gateState }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "gate-lane" });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: isOver && gateState === GateState.OPEN
          ? "#22c55e10"
          : isOver
            ? "#ef444410"
            : "transparent",
        transition: "background 0.2s",
        borderRadius: 16,
        border: `2px dashed ${isOver ? (gateState === GateState.OPEN ? "#22c55e" : "#ef4444") : "var(--border)"}`,
        minHeight: 200,
        padding: 20,
      }}
      aria-label="차단기 영역 - 여기로 차량을 드래그하세요"
      role="region"
    >
      <GateBarrier state={gateState} />
      <p style={{
        fontSize: 12,
        color: "var(--text-muted)",
        textAlign: "center",
        marginTop: 8,
      }}>
        {gateState === GateState.OPEN
          ? "게이트가 열려 있습니다. 차량을 드래그하여 통과시키세요."
          : "게이트가 닫혀 있습니다."}
      </p>
    </div>
  );
}
