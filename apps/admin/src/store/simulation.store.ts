import { create } from "zustand";

import type { GateState, SimulationStats, SimulationVehicle } from "@parking/types";

interface SimulationState {
  activeSimulationId: string | null;
  qrToken: string | null;
  stats: SimulationStats | null;
  vehicles: SimulationVehicle[];
  gateState: GateState | null;
  setActiveSimulation: (id: string, token: string) => void;
  setStats: (s: SimulationStats) => void;
  addVehicle: (v: SimulationVehicle) => void;
  updateVehicle: (v: SimulationVehicle) => void;
  setGateState: (g: GateState) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  activeSimulationId: null,
  qrToken: null,
  stats: null,
  vehicles: [],
  gateState: null,
  setActiveSimulation: (id, token) => set({ activeSimulationId: id, qrToken: token }),
  setStats: (stats) => set({ stats, gateState: stats.gateState }),
  addVehicle: (v) =>
    set((state) => ({
      vehicles: state.vehicles.some((x) => x.id === v.id)
        ? state.vehicles
        : [v, ...state.vehicles].slice(0, 100),
    })),
  updateVehicle: (v) =>
    set((state) => ({ vehicles: state.vehicles.map((x) => (x.id === v.id ? v : x)) })),
  setGateState: (gateState) => set({ gateState }),
  reset: () => set({ activeSimulationId: null, qrToken: null, stats: null, vehicles: [], gateState: null }),
}));
