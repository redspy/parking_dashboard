import { create } from "zustand";

import type { GateState, SimulationStats, SimulationVehicle } from "@parking/types";

interface SimulatorState {
  simulationId: string | null;
  token: string | null;
  gateState: GateState | null;
  vehicles: SimulationVehicle[];
  stats: SimulationStats | null;
  isConnected: boolean;
  init: (simulationId: string, token: string) => void;
  setGateState: (g: GateState) => void;
  addVehicle: (v: SimulationVehicle) => void;
  updateVehicle: (v: SimulationVehicle) => void;
  removeVehicle: (id: string) => void;
  setStats: (s: SimulationStats) => void;
  setConnected: (v: boolean) => void;
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  simulationId: null,
  token: null,
  gateState: null,
  vehicles: [],
  stats: null,
  isConnected: false,
  init: (simulationId, token) => set({ simulationId, token }),
  setGateState: (gateState) => set({ gateState }),
  addVehicle: (v) =>
    set((state) => ({
      vehicles: state.vehicles.some((x) => x.id === v.id)
        ? state.vehicles
        : [...state.vehicles, v],
    })),
  updateVehicle: (v) =>
    set((state) => ({ vehicles: state.vehicles.map((x) => (x.id === v.id ? v : x)) })),
  removeVehicle: (id) =>
    set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) })),
  setStats: (stats) => set({ stats, gateState: stats.gateState }),
  setConnected: (isConnected) => set({ isConnected }),
}));
