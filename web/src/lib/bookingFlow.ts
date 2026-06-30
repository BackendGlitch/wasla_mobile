import dayjs from 'dayjs';
import type { RouteData } from './routesApi';

export type BookingRouteMeta = {
  routeId: string;
  routeName: string;
  departureName: string;
  destinationName: string;
  availableSeats: number;
  pricePerSeat: number;
  etdIso: string;
  etdLabel: string;
  vehiclePlate: string;
};

function hashString(value: string): number {
  return value.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function splitRouteName(routeName: string, fallbackDepartureName: string) {
  const separators = ['->', ' to ', '-', '>', '/', '|'];

  for (const separator of separators) {
    const parts = routeName.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        departureName: parts[0],
        destinationName: parts[parts.length - 1],
      };
    }
  }

  return {
    departureName: fallbackDepartureName,
    destinationName: routeName.trim() || 'Destination',
  };
}

export function buildBookingRouteMeta(route: RouteData, stationName: string): BookingRouteMeta {
  const routeId = String(route.id);
  const hash = hashString(`${routeId}:${route.name}:${stationName}`);
  const names = splitRouteName(route.name, stationName);
  const fromApi =
    typeof route.base_price === 'number' && Number.isFinite(route.base_price) && route.base_price > 0
      ? route.base_price
      : null;
  const pricePerSeat = fromApi ?? 15 + (hash % 6) * 5;
  const etdIso = dayjs().add(10 + (hash % 8) * 5, 'minute').second(0).millisecond(0).toISOString();

  return {
    routeId,
    routeName: route.name,
    departureName: names.departureName,
    destinationName: names.destinationName,
    availableSeats: route.available_seats,
    pricePerSeat,
    etdIso,
    etdLabel: dayjs(etdIso).format('HH:mm'),
    vehiclePlate: `WSL-${1000 + (hash % 9000)}`,
  };
}

export function createTicketCode(): string {
  const stamp = dayjs().format('DDHHmm');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `WS-${stamp}-${random}`;
}

/** Tunisian dinar — amounts are assumed to be in TND (not millimes). */
export function formatCurrency(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${n.toFixed(2)} TND`;
}

export function formatIssuedAt(iso: string): string {
  return dayjs(iso).format('DD MMM YYYY, HH:mm');
}
