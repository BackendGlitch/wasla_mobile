import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useRealtimeStore } from '../store/realtimeStore';

let centralSocket: Socket | null = null;

const getCentralServerUrl = () => {
  // Must be the backend host reachable from the device.
  // - Android emulator: use `10.0.2.2` for host machine loopback.
  // - Physical device: use your dev machine LAN IP (or an Expo tunnel).
  // - iOS simulator usually supports `localhost`.
  const fallback =
    Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

  return process.env.EXPO_PUBLIC_CENTRAL_SERVER_URL || fallback;
};

export const initCentralRealtime = (): Socket => {
  if (centralSocket) return centralSocket;

  const baseUrl = getCentralServerUrl().replace(/\/+$/, '');
  const namespaceUrl = `${baseUrl}/realtime`;

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

  centralSocket = socket;
  return socket;
};

export const disconnectCentralRealtime = () => {
  if (!centralSocket) return;
  centralSocket.disconnect();
  centralSocket = null;
  useRealtimeStore.setState({ status: 'disconnected' });
};

