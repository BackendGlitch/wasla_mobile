import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BookingDraft = {
  stationId: string;
  stationName: string;
  routeId: string;
  routeName: string;
  departureName: string;
  destinationName: string;
  availableSeats: number;
  seatCount: number;
  pricePerSeat: number;
  totalPrice: number;
  etdIso: string;
  etdLabel: string;
  vehiclePlate: string;
  /** Set after create-booking; the payment page reads it from here instead of the URL */
  paymentUrl?: string;
};

export type TicketState = 'active' | 'expired' | 'used';

export type TicketRecord = BookingDraft & {
  id: string;
  qrValue: string;
  issuedAt: string;
  paymentStatus: 'confirmed';
  state: TicketState;
};

interface BookingState {
  draft: BookingDraft | null;
  tickets: TicketRecord[];
  setDraft: (draft: BookingDraft) => void;
  clearDraft: () => void;
  addTicket: (ticket: TicketRecord) => void;
  markTicketUsed: (ticketId: string) => void;
  expireTickets: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      draft: null,
      tickets: [],
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
      addTicket: (ticket) =>
        set((state) => ({
          tickets: [{ ...ticket, state: 'active' as const }, ...state.tickets],
          draft: null,
        })),
      markTicketUsed: (id) =>
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id && t.state === 'active' ? { ...t, state: 'used' as const } : t,
          ),
        })),
      expireTickets: () =>
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.state === 'active' && new Date(t.etdIso).getTime() < Date.now()
              ? { ...t, state: 'expired' as const }
              : t,
          ),
        })),
    }),
    {
      name: 'wasla-tickets',
      partialize: (state) => ({
        tickets: state.tickets,
        // Don't persist draft — it should be rebuilt fresh each booking flow
      }),
    },
  ),
);
