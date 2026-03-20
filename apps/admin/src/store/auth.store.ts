import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem("access_token");
  const user = token ? decodeToken(token) : null;
  return {
    user,
    token,
    setAuth: (user, token) => {
      localStorage.setItem("access_token", token);
      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem("access_token");
      set({ user: null, token: null });
    },
  };
});
