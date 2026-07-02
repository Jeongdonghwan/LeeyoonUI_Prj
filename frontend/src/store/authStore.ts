import axios from 'axios';
import { create } from 'zustand';

interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'distributor' | 'user';
  company: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setToken: (token: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  setAuth: (token, user) => set({ accessToken: token, user }),
  setToken: (token) => set({ accessToken: token }),
  logout: () => {
    set({ accessToken: null, user: null });
    axios.post('/api/auth/logout', {}, { withCredentials: true }).catch(() => {});
  },
  isLoggedIn: () => !!get().accessToken,
}));
