"use client";
// v2 — server-driven history, always fetches from backend

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Ticket, Loader2, WifiOff, ChevronRight, Clock, TimerOff, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type ServerBooking = {
  id: string;
  station_id: string;
  destination_id: string;
  seats_booked: number;
  vehicle_plate: string | null;
  status: string;
  payment_status: string;
  amount: number;
  price_per_seat: number;
  created_at: string | null;
};

type HistoryTicket = {
  id: string;
  stationId: string;
  stationName: string;
  destinationName: string;
  seatCount: number;
  vehiclePlate: string;
  totalPrice: number;
  pricePerSeat: number;
  createdAt: string;
  etdLabel: string;
  isActive: boolean;
  isExpired: boolean;
};

function normalizeBooking(b: ServerBooking): HistoryTicket {
  const dest = (b.destination_id || "").replace("dest_", "").replace(/_/g, " ");
  const stn = (b.station_id || "").replace(/_/g, " ");
  const age = Date.now() - new Date(b.created_at || Date.now()).getTime();
  const isActive = b.status === "CONFIRMED" && age < 3_600_000;
  const isExpired = b.status === "EXPIRED" || (b.status === "CONFIRMED" && age >= 3_600_000);

  return {
    id: b.id,
    stationId: b.station_id,
    stationName: stn,
    destinationName: dest,
    seatCount: b.seats_booked || 1,
    vehiclePlate: b.vehicle_plate || "TBA",
    totalPrice: b.amount || b.seats_booked * (b.price_per_seat || 0),
    pricePerSeat: b.price_per_seat || 0,
    createdAt: b.created_at || new Date().toISOString(),
    etdLabel: new Date(b.created_at || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isActive,
    isExpired,
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<HistoryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    setNeedsAuth(false);
    try {
      const res = await api.get("/bookings/mine");
      const bookings: ServerBooking[] = Array.isArray(res.data) ? res.data : [];
      const normalized = bookings
        .filter((b) => b.status === "CONFIRMED" || b.status === "EXPIRED" || b.status === "CANCELLED")
        .map(normalizeBooking)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(normalized);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setNeedsAuth(true);
      } else {
        setError("Could not load trips. Pull down to retry.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = {
    trips: tickets.length,
    spent: tickets.reduce((sum, t) => sum + t.totalPrice, 0),
  };

  // Group by date
  const grouped: [string, HistoryTicket[]][] = (() => {
    const map: Record<string, HistoryTicket[]> = {};
    for (const t of tickets) {
      const day = dayjs(t.createdAt).format("ddd, D MMM");
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    return Object.entries(map);
  })();

  return (
    <div className="flex min-h-dvh flex-col bg-wasla-bg">
      <div className="mx-auto w-full max-w-screen-sm flex-1 px-4 pt-12 pb-32">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-wasla-text-primary">
            Trips
          </h1>
          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-wasla-primary transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Loading */}
        {loading && tickets.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={32} className="animate-spin text-wasla-primary" />
            <p className="text-xs text-wasla-text-muted">Loading trips...</p>
          </div>
        )}

        {/* Needs auth */}
        {!loading && needsAuth && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D1525]">
              <Ticket size={28} className="text-[#3A4A60]" />
            </div>
            <h2 className="text-base font-bold text-wasla-text-primary">
              Sign in to see your trips
            </h2>
            <p className="text-center text-xs text-wasla-text-muted">
              Your booking history is tied to your account.
            </p>
            <button
              type="button"
              onClick={() => router.push("/sign-in")}
              className="mt-2 rounded-xl bg-wasla-primary px-5 py-2.5 text-xs font-bold text-[#0A0F19] transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </div>
        )}

        {/* Error */}
        {!loading && !needsAuth && error && tickets.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <WifiOff size={28} className="text-[#3A4A60]" />
            <p className="text-xs text-wasla-text-muted">{error}</p>
            <button
              type="button"
              onClick={fetchTickets}
              className="mt-2 rounded-xl bg-wasla-primary px-5 py-2.5 text-xs font-bold text-[#0A0F19]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !needsAuth && !error && tickets.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D1525]">
              <Ticket size={28} className="text-[#3A4A60]" />
            </div>
            <h2 className="text-base font-bold text-wasla-text-primary">
              No trips yet
            </h2>
            <p className="text-center text-xs text-wasla-text-muted">
              Your completed bookings will appear here.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-2 rounded-xl bg-wasla-primary px-5 py-2.5 text-xs font-bold text-[#0A0F19] transition-opacity hover:opacity-90"
            >
              Book a trip
            </button>
          </div>
        )}

        {/* Ticket list */}
        {tickets.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="mb-5 flex gap-2">
              <div className="flex-1 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0D1525] p-3">
                <p className="text-xl font-bold text-wasla-text-primary">
                  {stats.trips}
                </p>
                <p className="text-[10px] font-semibold text-wasla-text-muted">
                  TRIPS
                </p>
              </div>
              <div className="flex-1 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0D1525] p-3">
                <p className="text-xl font-bold text-wasla-primary">
                  {stats.spent.toFixed(3)}
                </p>
                <p className="text-[10px] font-semibold text-wasla-text-muted">
                  TND SPENT
                </p>
              </div>
            </div>

            {/* Grouped ticket list */}
            {grouped.map(([date, items]) => (
              <div key={date} className="mb-4">
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-wasla-text-muted">
                  {date.toUpperCase()}
                </p>
                {items.map((t) => {
                  const accentColor = t.isActive
                    ? "text-wasla-success"
                    : t.isExpired
                      ? "text-wasla-error"
                      : "text-wasla-text-muted";
                  const bgColor = t.isActive
                    ? "bg-[rgba(34,197,94,0.04)]"
                    : t.isExpired
                      ? "bg-[rgba(239,68,68,0.04)]"
                      : "bg-transparent";
                  const Icon = t.isActive
                    ? Clock
                    : t.isExpired
                      ? TimerOff
                      : CheckCircle;
                  const stateLabel = t.isActive
                    ? "Active"
                    : t.isExpired
                      ? "Expired"
                      : "Used";

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        router.push(`/ticket?ticketId=${t.id}`)
                      }
                      className={cn(
                        "flex w-full items-center gap-3 py-3.5 pr-3.5 pl-0 text-left transition-all hover:opacity-70",
                        "border-b border-[rgba(255,255,255,0.04)]",
                        bgColor,
                      )}
                    >
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <Icon size={12} className={accentColor} />
                            <span className="text-sm font-semibold text-wasla-text-primary">
                              {t.stationName} → {t.destinationName}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              t.isActive
                                ? "text-wasla-success"
                                : t.isExpired
                                  ? "text-wasla-error"
                                  : "text-wasla-text-muted",
                            )}
                          >
                            {t.totalPrice.toFixed(3)} TND
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-xs text-wasla-text-muted">
                            {t.etdLabel}
                          </span>
                          <span className="text-xs text-wasla-text-muted">
                            {t.vehiclePlate}
                          </span>
                          <span className="text-xs text-wasla-text-muted">
                            {t.seatCount} seat{t.seatCount !== 1 ? "s" : ""}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-bold",
                              accentColor,
                              bgColor,
                            )}
                          >
                            {stateLabel}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#3A4A60]" />
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
