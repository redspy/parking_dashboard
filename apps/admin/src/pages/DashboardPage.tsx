import { useEffect } from "react";

import { api } from "../api/client";
import { getSocket } from "../socket/client";
import { useDashboardStore } from "../store/dashboard.store";
import { useAuthStore } from "../store/auth.store";
import { KPICard } from "../components/kpi/KPICard";
import { ZoneChart } from "../components/zone/ZoneChart";
import { AlertPanel } from "../components/alerts/AlertPanel";
import { EventFeed } from "../components/events/EventFeed";
import type { DashboardSummary, ZoneSummary, Alert } from "@parking/types";

export function DashboardPage() {
  const { summary, zones, alerts, recentEvents, setSummary, setZones, setAlerts, addAlert, updateAlert, setEvents, setConnected } =
    useDashboardStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Fetch initial data
    Promise.all([
      api.get<DashboardSummary>("/dashboard/summary"),
      api.get<{ zones: ZoneSummary[] }>("/dashboard/zones"),
      api.get<{ alerts: Alert[] }>("/alerts?status=OPEN"),
      api.get<{ events: { id: string; type: "ENTRY" | "EXIT"; plateNumber: string; slotCode: string; zoneName: string; timestamp: string; paymentStatus?: string }[] }>("/events?limit=30"),
    ])
      .then(([summaryData, zonesData, alertsData, eventsData]) => {
        setSummary(summaryData);
        setZones(zonesData.zones);
        setAlerts(alertsData.alerts);
        setEvents(eventsData.events);
      })
      .catch(console.error);

    // Socket subscriptions
    const socket = getSocket();
    if (user?.organizationId) {
      socket.emit("room:join_dashboard", user.organizationId);
    }

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("dashboard:summary", setSummary);
    socket.on("dashboard:zones", setZones);
    socket.on("dashboard:alert_created", addAlert);
    socket.on("dashboard:alert_updated", updateAlert);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("dashboard:summary", setSummary);
      socket.off("dashboard:zones", setZones);
      socket.off("dashboard:alert_created", addAlert);
      socket.off("dashboard:alert_updated", updateAlert);
    };
  }, [user?.organizationId]);

  const occupancyPct = summary ? Math.round(summary.occupancyRate * 100) : 0;
  const occupancyColor =
    occupancyPct >= 85 ? "var(--danger)" : occupancyPct >= 60 ? "var(--warning)" : "var(--success)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>대시보드</h1>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {new Date().toLocaleString("ko-KR")}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <KPICard label="전체 주차면" value={summary?.totalSlots ?? "-"} icon="🅿" />
        <KPICard
          label="점유율"
          value={`${occupancyPct}%`}
          sub={`${summary?.occupiedSlots ?? 0}면 사용 중`}
          color={occupancyColor}
          icon="📊"
        />
        <KPICard
          label="빈 자리"
          value={summary?.emptySlots ?? "-"}
          color="var(--success)"
          icon="✅"
        />
        <KPICard label="금일 입차" value={summary?.todayEntries ?? "-"} icon="🚗" />
        <KPICard label="금일 출차" value={summary?.todayExits ?? "-"} icon="🚙" />
        <KPICard
          label="활성 경보"
          value={summary?.openAlerts ?? 0}
          color={summary?.openAlerts ? "var(--danger)" : "var(--success)"}
          icon="🔔"
        />
        <KPICard
          label="EV 충전 가능"
          value={summary?.evAvailable ?? 0}
          color="var(--ev)"
          icon="⚡"
          sub={`고장: ${summary?.evFault ?? 0}`}
        />
      </div>

      {/* Middle Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ZoneChart zones={zones} />
        <AlertPanel />
      </div>

      {/* Event Feed */}
      <EventFeed events={recentEvents} />
    </div>
  );
}
