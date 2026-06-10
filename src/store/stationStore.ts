import { create } from 'zustand';
import type { Station, StationStatus } from '../lib/stationsApi';

const FAVORITES_KEY = 'wasla_favorites';

export type StationWithDistance = Station & {
  distanceKm: number | null;
};

function sortStations(a: StationWithDistance, b: StationWithDistance): number {
  if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
  if (a.distanceKm === null && b.distanceKm !== null) return 1;
  if (a.distanceKm !== null && b.distanceKm === null) return -1;
  if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }
  return a.name.localeCompare(b.name);
}

interface StationState {
  stations: Station[];
  nearbyStations: StationWithDistance[];
  selectedStation: StationWithDistance | null;
  favorites: string[];
  isResolvingLocation: boolean;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  setStations: (stations: Station[]) => void;
  setNearbyStations: (stations: StationWithDistance[]) => void;
  setSelectedStation: (station: StationWithDistance | null) => void;
  toggleFavorite: (stationId: string) => void;
  setIsResolvingLocation: (isResolving: boolean) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'undetermined') => void;
  applyStationStatusUpdate: (stationId: string, status: StationStatus) => void;
}

export const useStationStore = create<StationState>((set) => ({
  stations: [],
  nearbyStations: [],
  selectedStation: null,
  favorites: [],
  isResolvingLocation: true,
  locationPermission: 'undetermined',
  setStations: (stations) => set({ stations }),
  setNearbyStations: (nearbyStations) => set({ nearbyStations }),
  setSelectedStation: (selectedStation) => set({ selectedStation }),
  toggleFavorite: (id) => set((s) => {
    const next = s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id];
    return { favorites: next };
  }),
  setIsResolvingLocation: (isResolvingLocation) => set({ isResolvingLocation }),
  setLocationPermission: (locationPermission) => set({ locationPermission }),
  applyStationStatusUpdate: (stationId, status) =>
    set((state) => {
      let didChange = false;

      const stations = state.stations.map((station) => {
        if (station.id !== stationId || station.status === status) return station;
        didChange = true;
        return { ...station, status };
      });

      const nearbyStations = state.nearbyStations
        .map((station) => {
          if (station.id !== stationId || station.status === status) return station;
          didChange = true;
          return { ...station, status };
        })
        .sort(sortStations);

      const selectedStation =
        state.selectedStation?.id === stationId && state.selectedStation.status !== status
          ? { ...state.selectedStation, status }
          : state.selectedStation;

      if (!didChange && selectedStation === state.selectedStation) return state;

      return {
        stations,
        nearbyStations,
        selectedStation,
      };
    }),
}));
