import api from './api';


export interface RouteData {
  id: string | number;
  name: string;
  available_seats: number;
}

// The clean function to fetch routes
export const getStationRoutes = async (
  stationId: string,
  options?: { signal?: AbortSignal },
): Promise<RouteData[]> => {
  const response = await api.get(`/stations/${stationId}/routes`, { signal: options?.signal });
  return response.data;
};
