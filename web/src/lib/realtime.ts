import { io, type Socket } from 'socket.io-client';
import { useBookingRoutesLiveStore } from '../store/bookingRoutesLiveStore';
import { useBookingStore, type TicketRecord } from '../store/bookingStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { useStationStore } from '../store/stationStore';
import { getCentralServerUrl } from './serverConfig';

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

  const url = getCentralServerUrl();
  if (!url) {
    useRealtimeStore.setState({
      status: 'error',
      lastError: 'Central server URL is not configured.',
    });
    return null;
  }

  const namespaceUrl = `${url}/realtime`;

  useRealtimeStore.setState({
    status: 'connecting',
    lastError: null,
  });

  // Resolve the current JWT for the handshake (non-blocking; null if not signed in).
  const authPromise = Promise.resolve(
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  ).then((token) => (token ? { token } : undefined));

  const socket = io(namespaceUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.5,
    timeout: 10_000,
    auth: (cb: (data: Record<string, unknown>) => void) => {
      void authPromise.then((authData) => cb(authData ?? {}));
    },
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
    console.error('[realtime] Connection error', { namespace: namespaceUrl, error: msg });
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
      source: 'wasla_web',
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
    socket.emit('ping', { source: 'wasla_web', timestamp: Date.now() });
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

  // Booking confirmation pushed after successful NexaPay webhook
  socket.on(
    'booking.confirmed',
    (payload: {
      booking_id?: string;
      ticket?: {
        id?: string;
        qr_payload?: string;
        vehicle_plate?: string | null;
        etd_timestamp?: string | null;
        created_at?: string | null;
        seats_booked?: number;
        station_id?: string;
        destination_id?: string;
      };
    }) => {
      const t = payload?.ticket;
      if (!t?.id || !t.qr_payload) return;

      const store = useBookingStore.getState();
      // Avoid adding duplicate tickets
      if (store.tickets.some((existing) => existing.id === t.id)) return;

      store.addTicket({
        id: t.id!,
        qrValue: t.qr_payload!,
        issuedAt: t.created_at ?? new Date().toISOString(),
        paymentStatus: 'confirmed', state: 'active',
        stationId: t.station_id ?? '',
        stationName: '',
        routeId: '',
        routeName: '',
        departureName: '',
        destinationName: t.destination_id ?? '',
        availableSeats: 0,
        seatCount: t.seats_booked ?? 0,
        pricePerSeat: 0,
        totalPrice: 0,
        etdIso: t.etd_timestamp ?? new Date().toISOString(),
        etdLabel: t.etd_timestamp
          ? new Date(t.etd_timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '--:--',
        vehiclePlate: t.vehicle_plate ?? 'Assigned',
      });
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
