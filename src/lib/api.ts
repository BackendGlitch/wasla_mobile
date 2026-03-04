import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { MOCK_USER, MOCK_TOKEN, MOCK_OTP, MOCK_ROUTES, MOCK_STATIONS, MOCK_TICKETS } from './mockData';
import type { Ticket } from './mockData';

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.wasla.tn/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject Bearer token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401 clear token & redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      router.replace('/(auth)');
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Mock API Service (no backend needed) ────────────────────
// These simulate network calls with a small delay

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  /** Send OTP to phone number — always succeeds */
  sendOtp: async (_phone: string) => {
    await delay(800);
    return { success: true, message: 'OTP sent (mock)' };
  },

  /** Verify OTP — accepts MOCK_OTP ("123456") */
  verifyOtp: async (_phone: string, otp: string) => {
    await delay(1000);
    if (otp === MOCK_OTP) {
      await SecureStore.setItemAsync('auth_token', MOCK_TOKEN);
      return { success: true, token: MOCK_TOKEN, user: MOCK_USER };
    }
    throw new Error('Invalid OTP. Hint: use 123456');
  },

  /** Get current user profile */
  getProfile: async () => {
    await delay();
    return MOCK_USER;
  },

  /** Get all stations */
  getStations: async () => {
    await delay();
    return MOCK_STATIONS;
  },

  /** Search routes */
  getRoutes: async (_from?: string, _to?: string) => {
    await delay();
    return MOCK_ROUTES;
  },

  /** Book a seat — returns a new ticket */
  bookSeat: async (routeId: string, seat: number): Promise<Ticket> => {
    await delay(1200);
    const route = MOCK_ROUTES.find((r) => r.id === routeId);
    if (!route) throw new Error('Route not found');
    const ticket: Ticket = {
      id: `tkt_${Date.now()}`,
      routeId,
      from: route.from,
      to: route.to,
      date: new Date().toISOString().split('T')[0],
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      seat,
      price: route.price,
      currency: route.currency,
      status: 'confirmed',
      passengerName: MOCK_USER.name,
      qrCode: `WASLA-${Date.now()}`,
    };
    return ticket;
  },

  /** Get booking history */
  getTickets: async () => {
    await delay();
    return MOCK_TICKETS;
  },

  /** Get single ticket */
  getTicket: async (id: string) => {
    await delay();
    const ticket = MOCK_TICKETS.find((t) => t.id === id);
    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  },

  /** Logout — clear token */
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
  },
};
