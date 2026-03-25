import type { User } from '../store/authStore';

// ─── Mock User ───────────────────────────────────────────────
export const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Ahmed Ben Ali',
  phone: '+216 XX XXX XXX',
  email: 'ahmed@wasla.tn',
};

export const MOCK_OTP = '123456';

export const MOCK_TOKEN = 'mock-jwt-token-wasla-2026';

// ─── Mock Stations ───────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const MOCK_STATIONS: Station[] = [
  { id: 'st_06', name: 'Sousse Louage Station', city: 'Sousse', lat: 35.8256, lng: 10.6369 },
  { id: 'st_07', name: 'Monastir Louage Station', city: 'Monastir', lat: 35.7778, lng: 10.8262 },
  { id: 'st_08', name: 'Ksar Hellal Louage Station', city: 'Ksar Hellal', lat: 35.6477, lng: 10.8905 },
  { id: 'st_09', name: 'Jammel Louage Station', city: 'Jammel', lat: 35.6223, lng: 10.756 },
];

// ─── Mock Routes ─────────────────────────────────────────────
export interface Route {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
}

export const MOCK_ROUTES: Route[] = [
  {
    id: 'rt_01',
    from: 'Tunis',
    to: 'Sousse',
    departureTime: '08:00',
    arrivalTime: '10:00',
    price: 15,
    currency: 'TND',
    seatsAvailable: 12,
    totalSeats: 45,
  },
  {
    id: 'rt_02',
    from: 'Tunis',
    to: 'Sfax',
    departureTime: '09:30',
    arrivalTime: '13:00',
    price: 25,
    currency: 'TND',
    seatsAvailable: 8,
    totalSeats: 45,
  },
  {
    id: 'rt_03',
    from: 'Sousse',
    to: 'Monastir',
    departureTime: '07:00',
    arrivalTime: '07:30',
    price: 5,
    currency: 'TND',
    seatsAvailable: 22,
    totalSeats: 30,
  },
  {
    id: 'rt_04',
    from: 'Sfax',
    to: 'Gabès',
    departureTime: '10:00',
    arrivalTime: '12:30',
    price: 18,
    currency: 'TND',
    seatsAvailable: 15,
    totalSeats: 30,
  },
  {
    id: 'rt_05',
    from: 'Sousse',
    to: 'Tunis',
    departureTime: '16:00',
    arrivalTime: '18:00',
    price: 15,
    currency: 'TND',
    seatsAvailable: 5,
    totalSeats: 45,
  },
];

// ─── Mock Bookings / Tickets ─────────────────────────────────
export type TicketStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Ticket {
  id: string;
  routeId: string;
  from: string;
  to: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  seat: number;
  price: number;
  currency: string;
  status: TicketStatus;
  passengerName: string;
  qrCode: string;
}

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tkt_001',
    routeId: 'rt_01',
    from: 'Tunis',
    to: 'Sousse',
    date: '2026-03-10',
    departureTime: '08:00',
    arrivalTime: '10:00',
    seat: 14,
    price: 15,
    currency: 'TND',
    status: 'confirmed',
    passengerName: 'Ahmed Ben Ali',
    qrCode: 'WASLA-TKT001-2026',
  },
  {
    id: 'tkt_002',
    routeId: 'rt_03',
    from: 'Sousse',
    to: 'Monastir',
    date: '2026-02-28',
    departureTime: '07:00',
    arrivalTime: '07:30',
    seat: 7,
    price: 5,
    currency: 'TND',
    status: 'completed',
    passengerName: 'Ahmed Ben Ali',
    qrCode: 'WASLA-TKT002-2026',
  },
  {
    id: 'tkt_003',
    routeId: 'rt_02',
    from: 'Tunis',
    to: 'Sfax',
    date: '2026-02-15',
    departureTime: '09:30',
    arrivalTime: '13:00',
    seat: 22,
    price: 25,
    currency: 'TND',
    status: 'cancelled',
    passengerName: 'Ahmed Ben Ali',
    qrCode: 'WASLA-TKT003-2026',
  },
];
