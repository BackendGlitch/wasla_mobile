import { create } from 'zustand';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RealtimeState {
  status: RealtimeStatus;
  lastReadyAt: string | null;
  lastPongAt: string | null;
  lastPong: unknown | null;
  lastError: string | null;
}

export const useRealtimeStore = create<RealtimeState>(() => ({
  // Avoid an initial "offline" flash before the socket initialization effect runs.
  status: 'connecting',
  lastReadyAt: null,
  lastPongAt: null,
  lastPong: null,
  lastError: null,
}));

