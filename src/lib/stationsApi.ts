import api from './api';

export type StationStatus = 'online' | 'offline';

export interface Station {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  status: StationStatus;
}

export interface StationDetails extends Station {
  base_url: string | null;
  created_at: string | null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStationStatus(value: unknown): StationStatus {
  return value === 'online' ? 'online' : 'offline';
}

function normalizeStation(raw: unknown): Station {
  const record = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const idRaw = record.id;
  const fallbackId =
    typeof idRaw === 'string'
      ? idRaw
      : typeof record.station_id === 'string'
        ? record.station_id
        : '';
  return {
    id: fallbackId,
    name: typeof record.name === 'string' ? record.name : 'Unknown station',
    lat: toNullableNumber(record.lat),
    lng: toNullableNumber(record.lng),
    status: toStationStatus(record.status),
  };
}

function normalizeStationDetails(raw: unknown): StationDetails {
  const record = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const station = normalizeStation(record);
  return {
    ...station,
    base_url: typeof record.base_url === 'string' ? record.base_url : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : null,
  };
}

export async function getStations(options?: { signal?: AbortSignal }): Promise<Station[]> {
  const response = await api.get('/stations', { signal: options?.signal });
  if (!Array.isArray(response.data)) return [];
  return response.data.map(normalizeStation).filter((station) => station.id);
}

export async function getStation(
  stationId: string,
  options?: { signal?: AbortSignal },
): Promise<StationDetails> {
  const response = await api.get(`/stations/${stationId}`, { signal: options?.signal });
  return normalizeStationDetails(response.data);
}
