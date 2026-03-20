import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuthStore } from "../store/auth.store";

export function LoginPage() {
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ accessToken: string; user: { id: string; email: string; role: string; organizationId: string } }>(
        "/auth/login",
        { email, password },
      );
      setAuth(res.user, res.accessToken);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "40px 32px",
          width: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>🅿 주차관리 시스템</h1>

        {error && (
          <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "var(--text-muted)" }}>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "var(--text-muted)" }}>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "12px 0",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          admin@demo.com / admin123
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
};
