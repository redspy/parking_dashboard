import { useEffect, useState } from "react";

import { api } from "../api/client";

interface BlacklistEntry {
  id: string;
  plateNumber: string;
  reason: string;
  registeredBy: string;
  createdAt: string;
}

export function BlacklistPage() {
  const [list, setList] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [plate, setPlate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get<{ blacklist: BlacklistEntry[] }>(
        `/blacklist${q ? `?plateNumber=${encodeURIComponent(q)}` : ""}`,
      );
      setList(res.blacklist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!plate.trim()) { setFormError("차량 번호를 입력하세요."); return; }
    if (!reason.trim()) { setFormError("등록 사유를 입력하세요."); return; }
    setSaving(true);
    try {
      await api.post("/blacklist", { plateNumber: plate.trim(), reason: reason.trim() });
      setPlate("");
      setReason("");
      setShowForm(false);
      await load(search.trim() || undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, plateNumber: string) => {
    if (!confirm(`[${plateNumber}] 블랙리스트에서 해제하시겠습니까?`)) return;
    try {
      await api.delete(`/blacklist/${id}`);
      setList((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>블랙리스트 차량 관리</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            등록된 차량은 ANPR 인식 시 입차가 차단되고 경비원에게 즉시 알림이 발송됩니다.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          style={{
            padding: "10px 20px",
            background: "var(--danger)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 블랙리스트 등록
        </button>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="차량 번호로 검색"
          style={{
            flex: 1,
            maxWidth: 280,
            padding: "9px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 13,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "9px 18px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          검색
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); load(); }}
            style={{
              padding: "9px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            초기화
          </button>
        )}
      </form>

      {/* 목록 */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
              <th style={th}>차량 번호</th>
              <th style={th}>등록 사유</th>
              <th style={th}>등록자</th>
              <th style={th}>등록일</th>
              <th style={th}>해제</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  로딩 중...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  블랙리스트에 등록된 차량이 없습니다.
                </td>
              </tr>
            )}
            {list.map((entry) => (
              <tr key={entry.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, color: "var(--danger)", fontSize: 14 }}>
                  {entry.plateNumber}
                </td>
                <td style={td}>{entry.reason}</td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{entry.registeredBy}</td>
                <td style={{ ...td, color: "var(--text-muted)" }}>
                  {new Date(entry.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td style={td}>
                  <button
                    onClick={() => handleDelete(entry.id, entry.plateNumber)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    해제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록 모달 */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <form
            onSubmit={handleAdd}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 32,
              width: 400,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>블랙리스트 등록</h2>

            {formError && (
              <div style={{ padding: "10px 14px", background: "#7f1d1d40", border: "1px solid var(--danger)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>
                {formError}
              </div>
            )}

            <label style={label}>
              차량 번호 *
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="예: 12가3456"
                style={input}
                autoFocus
              />
            </label>

            <label style={label}>
              등록 사유 *
              <select value={reason} onChange={(e) => setReason(e.target.value)} style={input}>
                <option value="">-- 사유 선택 --</option>
                <option value="장기 불법주차">장기 불법주차</option>
                <option value="무분별 예약 차량">무분별 예약 차량</option>
                <option value="미등록 외부차량">미등록 외부차량</option>
                <option value="반복 위반 차량">반복 위반 차량</option>
                <option value="직접 입력">직접 입력</option>
              </select>
              {reason === "직접 입력" && (
                <input
                  placeholder="사유 직접 입력"
                  style={{ ...input, marginTop: 6 }}
                  onBlur={(e) => setReason(e.target.value || "직접 입력")}
                />
              )}
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 1, padding: "11px 0", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "등록 중..." : "블랙리스트 등록"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: "11px 0", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 500 };
const td: React.CSSProperties = { padding: "12px 16px" };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)" };
const input: React.CSSProperties = { padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 };
