import { create } from 'zustand';

type NetInfoState = {
  isConnected: boolean;
  isInternetReachable: boolean;
};

type ConnectivityState = {
  isOffline: boolean;
  reconnectEpoch: number;
  applyNetInfo: (state: NetInfoState) => void;
  /** Manual "retry" tap or parent logic (refetch without waiting on transition). */
  bumpReconnectEpoch: () => void;
};

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOffline: false,
  reconnectEpoch: 0,
  applyNetInfo: (net) =>
    set((prev) => {
      const offline = net.isConnected === false || net.isInternetReachable === false;
      const cameOnline = prev.isOffline && !offline;
      return {
        isOffline: offline,
        reconnectEpoch: cameOnline ? prev.reconnectEpoch + 1 : prev.reconnectEpoch,
      };
    }),
  bumpReconnectEpoch: () => set((s) => ({ reconnectEpoch: s.reconnectEpoch + 1 })),
}));
