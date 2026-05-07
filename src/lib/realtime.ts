import { io, type Socket } from 'socket.io-client';
import { useBookingRoutesLiveStore } from '../store/bookingRoutesLiveStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { useStationStore } from '../store/stationStore';
import { resolveCentralServerUrl } from './serverConfig';
import { captureException } from './observability';

let centralSocket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let staleCheckInterval: ReturnType<typeof setInterval> | null = null;
let lastPongTs = 0;
let connectedTs = 0;

const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;

type StationStatusChangedPayload = {
  station_id?: string;
  status?: string;
  checked_at?: string;
};

function normalizeStationStatus(value: unknown): 'online' | 'offline' | null {
  if (value === 'online' || value === 'offline') return value;
  return null;
}

export const initCentralRealtime = (): Socket | null => {
  if (centralSocket) return centralSocket;

  const resolved = resolveCentralServerUrl();
  if (!resolved.url) {
    useRealtimeStore.setState({
      status: 'error',
      lastError: resolved.error ?? 'Central server URL is not configured.',
    });
    return null;
  }

  const namespaceUrl = `${resolved.url}/realtime`;

  useRealtimeStore.setState({
    status: 'connecting',
    lastError: null,
  });

  const socket = io(namespaceUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.5,
    timeout: 10_000,
  });

  // Socket.IO reconnection lifecycle events happen on the underlying manager.
  socket.io.on('reconnect_attempt', () => {
    useRealtimeStore.setState({ status: 'connecting', lastError: null });
  });

  socket.io.on('reconnect_failed', () => {
    useRealtimeStore.setState({
      status: 'error',
      lastError: 'Failed to reconnect to central server.',
    });
  });

  socket.on('connect', () => {
    connectedTs = Date.now();
    lastPongTs = 0;
    useRealtimeStore.setState({ status: 'connected', lastError: null });
  });

  socket.on('disconnect', () => {
    useRealtimeStore.setState({ status: 'disconnected' });
  });

  socket.on('connect_error', (err: unknown) => {
    const msg =
      typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err ?? 'unknown');
    const wrapped = err instanceof Error ? err : new Error(msg);
    captureException(wrapped, { kind: 'realtime_connect_error', namespace: namespaceUrl });
    useRealtimeStore.setState({
      status: 'error',
      lastError: msg !== 'unknown' ? msg : 'Unknown connection error',
    });
  });

  // Server emits `ready` immediately after connection.
  socket.on('ready', (_payload: unknown) => {
    useRealtimeStore.setState({
      lastReadyAt: new Date().toISOString(),
    });

    // Ask for a pong to confirm we can send + receive messages.
    socket.emit('ping', {
      source: 'wasla_mobile',
      timestamp: Date.now(),
    });

  });

  socket.on('pong', (payload: unknown) => {
    lastPongTs = Date.now();
    useRealtimeStore.setState({
      lastPongAt: new Date().toISOString(),
      lastPong: payload,
    });
  });

  heartbeatInterval = setInterval(() => {
    if (!socket.connected) return;
    socket.emit('ping', { source: 'wasla_mobile', timestamp: Date.now() });
  }, HEARTBEAT_INTERVAL_MS);

  staleCheckInterval = setInterval(() => {
    if (!socket.connected) return;

    const now = Date.now();
    const baseline = lastPongTs || connectedTs;
    if (!baseline) return;

    if (now - baseline > STALE_AFTER_MS) {
      useRealtimeStore.setState({
        status: 'disconnected',
        lastError: 'Live connection went stale. Reconnecting...',
      });

      // Force a reconnect cycle.
      socket.disconnect();
      socket.connect();
      connectedTs = now;
      lastPongTs = 0;
    }
  }, 5_000);

  socket.on('station.status.changed', (payload: StationStatusChangedPayload) => {
    const stationId =
      typeof payload?.station_id === 'string' ? payload.station_id.trim() : '';
    const status = normalizeStationStatus(payload?.status);
    if (!stationId || !status) return;

    useStationStore.getState().applyStationStatusUpdate(stationId, status);
  });

  socket.on(
    'station.routes.updated',
    (payload: { station_id?: string; routes?: unknown[]; updated_at?: string }) => {
      const stationId =
        typeof payload?.station_id === 'string' ? payload.station_id.trim() : '';
      if (!stationId || !Array.isArray(payload.routes)) return;
      useBookingRoutesLiveStore.getState().applyLiveRoutesPayload(stationId, payload.routes);
    },
  );

  centralSocket = socket;
  return socket;
};

export const disconnectCentralRealtime = () => {
  if (!centralSocket) return;
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (staleCheckInterval) {
    clearInterval(staleCheckInterval);
    staleCheckInterval = null;
  }
  lastPongTs = 0;
  connectedTs = 0;
  centralSocket.disconnect();
  centralSocket = null;
  useRealtimeStore.setState({ status: 'disconnected' });
};
