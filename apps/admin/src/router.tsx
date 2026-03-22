import { createBrowserRouter, Navigate } from "react-router-dom";

import { useAuthStore } from "./store/auth.store";
import { Layout } from "./components/shared/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ZonePage } from "./pages/ZonePage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SimulationPage } from "./pages/SimulationPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BlacklistPage } from "./pages/BlacklistPage";
import { ExternalVehiclesPage } from "./pages/ExternalVehiclesPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth><DashboardPage /></RequireAuth>,
  },
  {
    path: "/zones",
    element: <RequireAuth><ZonePage /></RequireAuth>,
  },
  {
    path: "/reservations",
    element: <RequireAuth><ReservationsPage /></RequireAuth>,
  },
  {
    path: "/reports",
    element: <RequireAuth><ReportsPage /></RequireAuth>,
  },
  {
    path: "/simulation",
    element: <RequireAuth><SimulationPage /></RequireAuth>,
  },
  {
    path: "/settings",
    element: <RequireAuth><SettingsPage /></RequireAuth>,
  },
  {
    path: "/blacklist",
    element: <RequireAuth><BlacklistPage /></RequireAuth>,
  },
  {
    path: "/vehicles",
    element: <RequireAuth><ExternalVehiclesPage /></RequireAuth>,
  },
]);
