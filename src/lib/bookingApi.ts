// src/lib/bookingApi.ts
import api from './api';

export const createBooking = async (
  payload: {
    station_id: string;
    destination_id: string;
    seats_booked: number;
    /** Mirrors for Nest/class-transformer / proxies that expect camelCase */
    stationId?: string;
    destinationId?: string;
  },
  options?: { signal?: AbortSignal },
) => {
  const response = await api.post('/bookings', payload, {
    signal: options?.signal,
    __waslaMaxRetries: 0,
  });
  return response.data;
};

export const cancelBooking = async (bookingId: string, options?: { signal?: AbortSignal }) => {
  const response = await api.post(`/bookings/${bookingId}/cancel`, undefined, {
    signal: options?.signal,
    __waslaMaxRetries: 0,
  });
  return response.data;
};

export type ConfirmInAppResponse = {
  booking_id: string;
  ticket: {
    id: string;
    qr_payload: string;
    vehicle_plate?: string | null;
    etd_timestamp?: string | Date | null;
    created_at?: string | Date | null;
    seats_booked: number;
    station_id?: string;
    destination_id?: string;
  };
};

export const confirmBookingInApp = async (
  bookingId: string,
  options?: { signal?: AbortSignal },
): Promise<ConfirmInAppResponse> => {
  const id = encodeURIComponent(bookingId.trim());
  const response = await api.post(`/bookings/${id}/confirm-in-app`, undefined, {
    signal: options?.signal,
    __waslaMaxRetries: 0,
  });
  return response.data;
};
