"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Share2,
  Bus,
  Clock,
  Home,
  History,
  CreditCard,
  Users,
  Banknote,
  Loader2,
  Ticket,
} from "lucide-react";
import { useBookingStore, type TicketRecord } from "@/store";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";

export default function TicketPage() {
  return (
    <Suspense>
      <TicketScreen />
    </Suspense>
  );
}

function TicketScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tid = searchParams.get("ticketId") || "";
  const bid = searchParams.get("bookingId") || "";

  const storedTicket = useBookingStore((s) =>
    s.tickets.find((t: any) => t.id === tid || t.id === bid),
  );
  const addTicket = useBookingStore((s) => s.addTicket);

  const [ticket, setTicket] = useState<TicketRecord | null>(storedTicket ?? null);
  const [fetching, setFetching] = useState(!storedTicket);

  // Ticket lookup priority:
  // 1. In-memory store (Zustand + localStorage persistence)
  // 2. Public API by ticket UUID
  // 3. Public API by booking UUID
  // 4. Authenticated bookings list
  useEffect(() => {
    if (storedTicket) {
      setTicket(storedTicket);
      setFetching(false);
      return;
    }
    let cancelled = false;

    function buildRecord(t: any): TicketRecord {
      return {
        id: t.id,
        qrValue: t.qr_payload || t.id?.slice?.(0, 8)?.toUpperCase() || "WASLA",
        issuedAt: t.created_at || new Date().toISOString(),
        paymentStatus: "confirmed",
        state: "active",
        stationId: t.station_id || "",
        stationName: t.station_id || "",
        routeId: t.destination_id || "",
        routeName: t.destination_name || t.destination_id || "",
        departureName: t.station_id || "",
        destinationName: t.destination_name || t.destination_id || "",
        availableSeats: 0,
        seatCount: t.seats_booked || 1,
        pricePerSeat: 0,
        totalPrice: 0,
        etdIso: t.etd_timestamp || new Date().toISOString(),
        etdLabel: t.etd_timestamp ? dayjs(t.etd_timestamp).format("HH:mm") : "--:--",
        vehiclePlate: t.vehicle_plate || "TBA",
      };
    }

    async function load() {
      // Try public endpoint by ticket UUID
      if (tid) {
        try {
          const pub = await api.get(`/tickets/public/${encodeURIComponent(tid)}`);
          if (pub.data && !cancelled) {
            const rec = buildRecord(pub.data);
            addTicket(rec);
            setTicket(rec);
            setFetching(false);
            return;
          }
        } catch { /* continue */ }
      }
      // Try public endpoint by booking UUID
      const lookupByBooking = bid || tid;
      if (lookupByBooking) {
        try {
          const pub = await api.get(`/tickets/public/by-booking/${encodeURIComponent(lookupByBooking)}`);
          if (pub.data && !cancelled) {
            const rec = buildRecord(pub.data);
            addTicket(rec);
            setTicket(rec);
            setFetching(false);
            return;
          }
        } catch { /* continue */ }
      }
      // Fallback: authenticated bookings list
      try {
        const res = await api.get("/bookings/mine");
        const bookings = Array.isArray(res.data) ? res.data : [];
        const match = bookings.find(
          (b: any) => b.id === tid || b.id === bid || b.booking_id === tid || b.booking_id === bid,
        );
        if (match && !cancelled) {
          const rec = buildRecord({
            id: match.id,
            station_id: match.station_id,
            destination_id: match.destination_id,
            destination_name: match.destination_id,
            seats_booked: match.seats_booked || 1,
            vehicle_plate: match.vehicle_plate || "TBA",
            created_at: match.created_at,
          });
          addTicket(rec);
          setTicket(rec);
        }
      } catch { /* not authenticated or server unreachable */ }
      if (!cancelled) setFetching(false);
    }
    load();
    return () => { cancelled = true; };
  }, [tid, bid, storedTicket, addTicket]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!ticket) return;

    const text = [
      `Wasla Ticket`,
      `From: ${ticket.stationName}`,
      `To: ${ticket.destinationName}`,
      `Plate: ${ticket.vehiclePlate}`,
      `ETD: ${ticket.etdLabel}`,
      `Seats: ${ticket.seatCount}`,
      `Ref: ${ticket.id}`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Wasla Ticket", text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      // Could show a toast here
    }
  }, [ticket]);

  // Loading state — fetching from server
  if (fetching) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-wasla-bg">
        <Loader2 size={32} className="animate-spin text-wasla-primary" />
        <p className="text-sm text-wasla-text-muted">Loading ticket...</p>
      </div>
    );
  }

  // Not found state
  if (!ticket) {
    return (
      <div className="flex min-h-dvh flex-col bg-wasla-bg px-5 pt-12">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-1.5 self-start rounded-lg p-1.5 text-wasla-text-secondary transition-colors hover:text-wasla-text-primary"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Ticket size={48} className="text-[#3A4A60]" />
          <h2 className="text-lg font-bold text-wasla-text-primary">
            Ticket not found
          </h2>
          <p className="max-w-xs text-center text-xs leading-relaxed text-wasla-text-muted">
            Sign in to view your tickets, or create a new booking.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-2 rounded-xl bg-wasla-primary px-6 py-3 text-sm font-bold text-[#0A0F19] transition-opacity hover:opacity-90"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const etdTime =
    ticket.etdLabel || dayjs(ticket.etdIso).format("HH:mm");
  const qrValue = ticket.qrValue || ticket.id;

  return (
    <div className="flex min-h-dvh flex-col bg-wasla-bg">
      <div className="mx-auto w-full max-w-screen-sm flex-1 px-4 pt-12 pb-16">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg p-1.5 text-wasla-text-secondary transition-colors hover:text-wasla-text-primary"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-[15px] font-bold text-wasla-text-primary">
              Your Ticket
            </h1>
            <span className="text-xs font-semibold text-wasla-success">
              Confirmed
            </span>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-lg p-1.5 text-wasla-text-secondary transition-colors hover:text-wasla-text-primary"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Main Ticket Card */}
        <div className="overflow-hidden rounded-3xl border border-[rgba(212,168,83,0.12)] bg-[#0D1525] shadow-2xl shadow-black/40">
          {/* Top gold bar */}
          <div className="bg-[rgba(212,168,83,0.06)] border-b border-[rgba(212,168,83,0.08)]">
            <div className="mx-[30%] h-[3px] rounded-b-xl bg-wasla-primary" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Bus size={20} className="text-wasla-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-wasla-text-primary">
                    {ticket.stationName}
                  </span>
                  <span className="text-[10px] text-wasla-text-muted">
                    {dayjs(ticket.issuedAt).format("DD MMM · HH:mm")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-[rgba(34,197,94,0.1)] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-wasla-success" />
                <span className="text-[10px] font-bold text-wasla-success">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="flex items-start gap-2 px-5 py-4">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[9px] font-semibold tracking-wider text-wasla-text-muted">
                FROM
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-wasla-text-primary">
                {ticket.stationName}
              </span>
            </div>
            <div className="flex w-10 flex-col items-center pt-[26px]">
              <div className="h-2 w-2 rounded-full border-2 border-[#0D1525] bg-wasla-success" />
              <div className="h-3.5 w-0.5 bg-[#1E2D45]" />
              <Bus size={14} className="text-wasla-primary" />
              <div className="h-3.5 w-0.5 bg-[#1E2D45]" />
              <div className="h-2 w-2 rounded-full border-2 border-[#0D1525] bg-wasla-primary" />
            </div>
            <div className="flex flex-1 flex-col items-end gap-0.5">
              <span className="text-[9px] font-semibold tracking-wider text-wasla-text-muted">
                TO
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-right text-wasla-text-primary">
                {ticket.destinationName}
              </span>
            </div>
          </div>

          {/* Dotted divider */}
          <DottedDivider />

          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-2xl border border-[rgba(212,168,83,0.15)] bg-[rgba(212,168,83,0.1)] p-3">
              <div className="overflow-hidden rounded-xl bg-[#F0F4FF] p-2.5">
                <QRCodeSVG
                  value={qrValue}
                  size={160}
                  level="M"
                />
              </div>
            </div>
            <span className="text-[10px] tracking-wider text-wasla-text-muted">
              {ticket.id?.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Dotted divider */}
          <DottedDivider />

          {/* Info Grid */}
          <div className="flex flex-wrap gap-2.5 p-4">
            <InfoCell
              icon={CreditCard}
              label="PLATE"
              value={ticket.vehiclePlate}
              valueClass="text-wasla-text-primary"
            />
            <InfoCell
              icon={Users}
              label="SEATS"
              value={String(ticket.seatCount)}
              valueClass="text-wasla-text-primary"
            />
            <InfoCell
              icon={Clock}
              label="DEPARTURE"
              value={etdTime}
              valueClass="text-wasla-primary"
            />
            <InfoCell
              icon={Banknote}
              label="PAID"
              value={`${ticket.totalPrice} TND`}
              valueClass="text-wasla-success"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D1525] py-3.5 text-sm font-semibold text-wasla-text-secondary transition-opacity hover:opacity-80"
          >
            <Home size={18} />
            Home
          </button>
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-wasla-primary py-3.5 text-sm font-bold text-[#0A0F19] transition-opacity hover:opacity-80"
          >
            <History size={18} />
            History
          </button>
        </div>

        {/* Tip */}
        <p className="mt-5 text-center text-[10px] text-[#3A4A60]">
          Show the QR code to the staff when boarding the vehicle.
        </p>
      </div>
    </div>
  );
}

// ─── Dotted Divider ─────────────────────────────────────────────────

function DottedDivider() {
  return (
    <div className="relative flex items-center h-[1px] px-1">
      <div className="absolute left-[-10px] top-[-10px] h-5 w-5 rounded-full bg-wasla-bg" />
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="h-px flex-1"
            style={{ backgroundColor: "rgba(212,168,83,0.2)" }}
          />
        ))}
      </div>
      <div className="absolute right-[-10px] top-[-10px] h-5 w-5 rounded-full bg-wasla-bg" />
    </div>
  );
}

// ─── Info Cell ─────────────────────────────────────────────────────

function InfoCell({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex w-[calc(50%-5px)] flex-col gap-0.5 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.03)] p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-wasla-text-muted" />
        <span className="text-[10px] font-semibold text-wasla-text-muted">
          {label}
        </span>
      </div>
      <span className={cn("text-base font-bold", valueClass)}>{value}</span>
    </div>
  );
}
