import { create } from "zustand";

import type { Alert, DashboardSummary, ZoneSummary } from "@parking/types";

interface EventItem {
  id: string;
  type: "ENTRY" | "EXIT";
  plateNumber: string;
  slotCode: string;
  zoneName: string;
  timestamp: string;
  paymentStatus?: string;
}

interface DashboardState {
  summary: DashboardSummary | null;
  zones: ZoneSummary[];
  alerts: Alert[];
  recentEvents: EventItem[];
  isConnected: boolean;
  setSummary: (s: DashboardSummary) => void;
  setZones: (z: ZoneSummary[]) => void;
  setAlerts: (a: Alert[]) => void;
  addAlert: (a: Alert) => void;
  updateAlert: (a: Alert) => void;
  setEvents: (e: EventItem[]) => void;
  setConnected: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  zones: [],
  alerts: [],
  recentEvents: [],
  isConnected: false,
  setSummary: (summary) => set({ summary }),
  setZones: (zones) => set({ zones }),
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 100) })),
  updateAlert: (alert) =>
    set((state) => ({ alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)) })),
  setEvents: (recentEvents) => set({ recentEvents }),
  setConnected: (isConnected) => set({ isConnected }),
}));
