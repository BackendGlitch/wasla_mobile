// src/lib/bookingApi.ts
import api from './api';

export const createBooking = async (
  payload: { station_id: string; destination_id: string; seats_booked: number },
  options?: { signal?: AbortSignal },
) => {
  const response = await api.post('/bookings', payload, { signal: options?.signal });
  return response.data;
};

export const cancelBooking = async (bookingId: string, options?: { signal?: AbortSignal }) => {
  const response = await api.post(`/bookings/${bookingId}/cancel`, undefined, {
    signal: options?.signal,
  });
  return response.data;
};
