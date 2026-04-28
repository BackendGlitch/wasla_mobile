import { io, type Socket } from 'socket.io-client';
import { useRealtimeStore } from '../store/realtimeStore';
import { useStationStore } from '../store/stationStore';
import { resolveCentralServerUrl } from './serverConfig';

let centralSocket: Socket | null = null;

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
    reconnectionDelay: 1000,
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
    useRealtimeStore.setState({ status: 'connected', lastError: null });
  });

  socket.on('disconnect', () => {
    useRealtimeStore.setState({ status: 'disconnected' });
  });

  socket.on('connect_error', (err) => {
    useRealtimeStore.setState({
      status: 'error',
      lastError: err?.message ?? 'Unknown connection error',
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
    useRealtimeStore.setState({
      lastPongAt: new Date().toISOString(),
      lastPong: payload,
    });
  });

  socket.on('station.status.changed', (payload: StationStatusChangedPayload) => {
    const stationId =
      typeof payload?.station_id === 'string' ? payload.station_id.trim() : '';
    const status = normalizeStationStatus(payload?.status);
    if (!stationId || !status) return;

    useStationStore.getState().applyStationStatusUpdate(stationId, status);
  });

  centralSocket = socket;
  return socket;
};

export const disconnectCentralRealtime = () => {
  if (!centralSocket) return;
  centralSocket.disconnect();
  centralSocket = null;
  useRealtimeStore.setState({ status: 'disconnected' });
};
