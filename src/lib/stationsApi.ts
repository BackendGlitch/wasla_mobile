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
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStationStatus(value: unknown): StationStatus {
  return value === 'online' ? 'online' : 'offline';
}

function normalizeStation(raw: unknown): Station {
  const record = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  return {
    id: typeof record.id === 'string' ? record.id : '',
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

export async function getStations(): Promise<Station[]> {
  const response = await api.get('/stations');
  if (!Array.isArray(response.data)) return [];
  return response.data.map(normalizeStation).filter((station) => station.id);
}

export async function getStation(stationId: string): Promise<StationDetails> {
  const response = await api.get(`/stations/${stationId}`);
  return normalizeStationDetails(response.data);
}
