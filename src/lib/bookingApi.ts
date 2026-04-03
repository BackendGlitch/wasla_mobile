// src/lib/bookingApi.ts
import api from './api';

export const createBooking = async (payload: { station_id: string, destination_id: string, seats_booked: number }) => {
  const response = await api.post('/bookings', payload);
  return response.data;
};

export const cancelBooking = async (bookingId: string) => {
  const response = await api.post(`/bookings/${bookingId}/cancel`);
  return response.data;
};