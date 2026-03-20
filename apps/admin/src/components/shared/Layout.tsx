import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/auth.store";
import { disconnectSocket } from "../../socket/client";

const NAV_ITEMS = [
  { path: "/", label: "대시보드", icon: "📊" },
  { path: "/zones", label: "주차 현황", icon: "🅿" },
  { path: "/reservations", label: "예약 관리", icon: "📅" },
  { path: "/reports", label: "리포트", icon: "📈" },
  { path: "/simulation", label: "시뮬레이터", icon: "🎮" },
  { path: "/settings", label: "설정", icon: "⚙️" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>🅿 주차관리</h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{user?.email}</p>
          <span style={{
            display: "inline-block",
            marginTop: 6,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: user?.role === "ADMIN" ? "#1d4ed840" : "#15803d40",
            color: user?.role === "ADMIN" ? "#60a5fa" : "#4ade80",
          }}>
            {user?.role}
          </span>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--primary)20" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "8px 0",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 220, flex: 1, padding: "28px 32px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
