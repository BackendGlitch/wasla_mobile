import { create } from 'zustand';
import { normalizeRouteData, type RouteData } from '../lib/routesApi';

/** Live fields merged onto the HTTP baseline row (rest of modal stays stable). */
export type RouteLiveMetrics = {
  available_seats: number;
  vehicles_count: number;
};

type MetricsMap = Record<string, RouteLiveMetrics>;

interface BookingRoutesLiveState {
  metricsByStation: Record<string, MetricsMap>;
  /**
   * Applies a central `station.routes.updated` payload — only touches seat/vehicle
   * counters so FlatList data (`fetchedRoutes`) can stay referentially stable.
   */
  applyLiveRoutesPayload: (stationId: string, rawRoutes: unknown[]) => void;
  clearLiveMetricsForStation: (stationId: string) => void;
}

function mergePayloadMetrics(prev: MetricsMap | undefined, normalized: RouteData[]): MetricsMap | null {
  const base = prev ? { ...prev } : {};
  let changed = false;

  const payloadIds = new Set<string>();

  for (const r of normalized) {
    const rid = String(r.id);
    payloadIds.add(rid);
    const next = {
      available_seats: r.available_seats,
      vehicles_count: typeof r.vehicles_count === 'number' ? r.vehicles_count : 0,
    };
    const old = prev?.[rid];
    if (
      old &&
      old.available_seats === next.available_seats &&
      old.vehicles_count === next.vehicles_count
    ) {
      continue;
    }
    base[rid] = next;
    changed = true;
  }

  if (prev) {
    for (const rid of Object.keys(prev)) {
      if (!payloadIds.has(rid)) {
        const old = prev[rid];
        if (old.available_seats !== 0 || old.vehicles_count !== 0) {
          base[rid] = { available_seats: 0, vehicles_count: 0 };
          changed = true;
        }
      }
    }
  }

  if (!changed) return null;
  return base;
}

export const useBookingRoutesLiveStore = create<BookingRoutesLiveState>((set) => ({
  metricsByStation: {},
  applyLiveRoutesPayload(stationId, rawRoutes) {
    const id = stationId.trim();
    if (!id) return;

    const normalized = Array.isArray(rawRoutes)
      ? rawRoutes
          .map(normalizeRouteData)
          .filter((row): row is RouteData => row != null)
      : [];

    set((state) => {
      const prev = state.metricsByStation[id];
      const merged = mergePayloadMetrics(prev, normalized);
      if (merged == null) return state;
      return {
        metricsByStation: {
          ...state.metricsByStation,
          [id]: merged,
        },
      };
    });
  },
  clearLiveMetricsForStation(stationId) {
    const id = stationId.trim();
    if (!id) return;
    set((state) => {
      if (!state.metricsByStation[id]) return state;
      const next = { ...state.metricsByStation };
      delete next[id];
      return { metricsByStation: next };
    });
  },
}));
