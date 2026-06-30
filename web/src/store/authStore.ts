import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasOnboarded: boolean;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setHasOnboarded: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasOnboarded: false,
  isLoading: true,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setHasOnboarded: (value) => set({ hasOnboarded: value }),
  setLoading: (value) => set({ isLoading: value }),
  logout: () => set({ token: null, user: null }),
}));
