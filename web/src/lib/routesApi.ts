import api from './api';

export interface RouteData {
  id: string | number;
  name: string;
  available_seats: number;
  /** From local node public `/routes` (central proxies as GET /stations/:id/routes) */
  vehicles_count?: number;
  /** Per-seat price in TND when the station's API provides it (`routes.base_price`). */
  base_price?: number;
}

function clampNonNegPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const n = Number(value.trim().replace(',', '.'));
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return null;
}

function clampNonNegInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return null;
}

/** Maps central proxy + legacy mock shapes onto `RouteData`. */
export function normalizeRouteData(raw: unknown): RouteData | null {
  const record =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const idRaw =
    record.destination_id ??
    record.route_id ??
    record.id ??
    record.routeId ??
    record.DestinationID;
  const id =
    typeof idRaw === 'string' ? idRaw.trim()
    : typeof idRaw === 'number' && Number.isFinite(idRaw) ? idRaw
    : '';

  const nameRaw =
    record.destination_name ??
    record.route_name ??
    record.name ??
    record.DestinationName;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : 'Destination';

  const seatsRaw =
    record.available_seats_total ??
    record.available_seats ??
    record.availableSeats ??
    record.AvailableSeatsTotal;
  const seats = clampNonNegInt(seatsRaw);

  const vehiclesRaw =
    record.vehicles_count ?? record.vehicle_count ?? record.VehicleCount ?? record.VehiclesCount;
  const vehicles = clampNonNegInt(vehiclesRaw);

  const priceRaw =
    record.base_price ??
    record.price_per_seat ??
    record.pricePerSeat ??
    record.BasePrice;
  const basePrice = clampNonNegPrice(priceRaw);

  if (typeof id !== 'number' && (id === '' || id == null)) return null;

  return {
    id,
    name,
    available_seats: seats ?? 0,
    ...(vehicles != null ? { vehicles_count: vehicles } : {}),
    ...(basePrice != null && basePrice > 0 ? { base_price: basePrice } : {}),
  };
}

export const getStationRoutes = async (
  stationId: string,
  options?: { signal?: AbortSignal },
): Promise<RouteData[]> => {
  const id = typeof stationId === 'string' ? stationId.trim() : '';
  if (!id) return [];

  const response = await api.get(`/stations/${encodeURIComponent(id)}/routes`, {
    signal: options?.signal,
  });
  if (!Array.isArray(response.data)) return [];
  return response.data.map(normalizeRouteData).filter((row): row is RouteData => row !== null);
};
