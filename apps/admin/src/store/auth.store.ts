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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  setAuth: (user, token) => {
    localStorage.setItem("access_token", token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null });
  },
}));
