import { create } from 'zustand';
import type { Station } from '../lib/mockData';

export type StationWithDistance = Station & {
  distanceKm: number;
};

interface StationState {
  stations: Station[];
  nearbyStations: StationWithDistance[];
  selectedStation: StationWithDistance | null;
  isResolvingLocation: boolean;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  setStations: (stations: Station[]) => void;
  setNearbyStations: (stations: StationWithDistance[]) => void;
  setSelectedStation: (station: StationWithDistance | null) => void;
  setIsResolvingLocation: (isResolving: boolean) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'undetermined') => void;
}

export const useStationStore = create<StationState>((set) => ({
  stations: [],
  nearbyStations: [],
  selectedStation: null,
  isResolvingLocation: true,
  locationPermission: 'undetermined',
  setStations: (stations) => set({ stations }),
  setNearbyStations: (nearbyStations) => set({ nearbyStations }),
  setSelectedStation: (selectedStation) => set({ selectedStation }),
  setIsResolvingLocation: (isResolvingLocation) => set({ isResolvingLocation }),
  setLocationPermission: (locationPermission) => set({ locationPermission }),
}));
