import { create } from 'zustand';

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
};

export type TicketRecord = BookingDraft & {
  id: string;
  qrValue: string;
  issuedAt: string;
  paymentStatus: 'confirmed';
};

interface BookingState {
  draft: BookingDraft | null;
  tickets: TicketRecord[];
  setDraft: (draft: BookingDraft) => void;
  clearDraft: () => void;
  addTicket: (ticket: TicketRecord) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  draft: null,
  tickets: [],
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
  addTicket: (ticket) =>
    set((state) => ({
      tickets: [ticket, ...state.tickets],
      draft: null,
    })),
}));
