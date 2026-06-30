"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Bus,
  Clock,
  MapPinOff,
  Plus,
  ArrowRight,
  Ticket,
  TimerOff,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { getStations } from "@/lib/stationsApi";
import { cancelBooking, getMyBookings } from "@/lib/bookingApi";
import {
  useBookingStore,
  useConnectivityStore,
  useRealtimeStore,
  useStationStore,
  type StationWithDistance,
} from "@/store";
import { StationSheet } from "@/components/station-sheet";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────

const MAX_DISTANCE_KM = 999;
const CARD_GAP = 12;

// ─── Helpers ────────────────────────────────────────────────────────

function hasCoords(s: { lat?: unknown; lng?: unknown }) {
  return (
    s.lat != null &&
    s.lng != null &&
    !Number.isNaN(Number(s.lat)) &&
    !Number.isNaN(Number(s.lng))
  );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── Countdown Timer ────────────────────────────────────────────────

function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = dayjs(targetIso).diff(dayjs(now), "second");

  if (diff <= 0) {
    return <span className="text-sm font-bold text-wasla-error">Departed</span>;
  }

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const urgent = diff < 600;

  return (
    <div className="flex items-center gap-1.5">
      <Clock size={12} className={urgent ? "text-wasla-warning" : "text-wasla-success"} />
      <span
        className={cn(
          "text-xs font-bold tabular-nums",
          urgent ? "text-wasla-warning" : "text-wasla-success",
        )}
      >
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

// ─── Ticket Card ────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onPress,
  onCancel,
}: {
  ticket: any;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const state: "active" | "expired" | "used" = ticket.state || "active";
  const from = ticket.departureName || ticket.stationName || "?";
  const to = ticket.destinationName || ticket.routeName || "?";
  const plate = ticket.vehiclePlate || "TBA";
  const seats = ticket.seatCount || 1;
  const etdIso = ticket.etdIso || new Date().toISOString();
  const issued = ticket.issuedAt ? dayjs(ticket.issuedAt).format("HH:mm") : "";

  const isActive = state === "active";
  const isExpired = state === "expired";
  const isUsed = state === "used";

  const accentColor = isActive
    ? "text-wasla-primary"
    : isExpired
      ? "text-wasla-error"
      : "text-wasla-text-muted";
  const cardBorder = isActive
    ? "border-[rgba(212,168,83,0.12)]"
    : isExpired
      ? "border-[rgba(239,68,68,0.15)]"
      : "border-[rgba(255,255,255,0.04)]";
  const bgColor = isExpired
    ? "bg-[#0D1525]"
    : isUsed
      ? "bg-[#0F1119]"
      : "bg-[#0D1525]";
  const statusLabel = isActive ? "Active" : isExpired ? "Expired" : "Used";
  const statusColor = isActive
    ? "text-wasla-success"
    : isExpired
      ? "text-wasla-error"
      : "text-wasla-text-muted";
  const statusBg = isActive
    ? "bg-[rgba(34,197,94,0.06)]"
    : isExpired
      ? "bg-[rgba(239,68,68,0.06)]"
      : "bg-[rgba(85,101,128,0.04)]";
  const iconBg = isActive
    ? "bg-wasla-primary"
    : isExpired
      ? "bg-wasla-error"
      : "bg-[#3A4A60]";

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "min-w-[calc(100vw-40px)] shrink-0 snap-start rounded-2xl border text-left shadow-lg shadow-black/30 transition-opacity hover:opacity-95",
        cardBorder,
        bgColor,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-[30px] w-[30px] items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <Ticket
              size={15}
              className={isUsed ? "text-wasla-text-secondary" : "text-[#0A0F19]"}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "text-xs font-bold",
                isActive
                  ? "text-wasla-text-primary"
                  : isExpired
                    ? "text-wasla-error"
                    : "text-wasla-text-secondary",
              )}
            >
              {statusLabel} Ticket
            </span>
            {isUsed && (
              <span className="text-[10px] text-wasla-text-muted">
                Used {issued}
              </span>
            )}
            {isExpired && (
              <span className="text-[10px] text-wasla-error">
                Departed {dayjs(etdIso).format("HH:mm")}
              </span>
            )}
          </div>
        </div>
        {isActive ? (
          <CountdownTimer targetIso={etdIso} />
        ) : isExpired ? (
          <TimerOff size={20} className="text-wasla-error" />
        ) : (
          <CheckCircle size={20} className="text-wasla-text-muted" />
        )}
      </div>

      {/* Route */}
      <div className="flex items-start gap-2.5 px-5 py-4">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[9px] font-semibold tracking-wider text-wasla-text-muted">
            DEPART
          </span>
          <span
            className={cn(
              "text-xl font-extrabold tracking-tight",
              isActive ? "text-wasla-text-primary" : "text-wasla-text-muted",
            )}
          >
            {from}
          </span>
          <span className="text-xs text-wasla-text-muted">
            {dayjs(etdIso).format("HH:mm")}
          </span>
        </div>

        {/* Route visualization */}
        <div className="flex w-12 flex-col items-center pt-6">
          <div
            className={cn(
              "h-[10px] w-[10px] rounded-full border-2",
              isActive
                ? "border-wasla-success bg-wasla-success"
                : "border-[#0D1525] bg-wasla-text-muted",
            )}
          />
          <div className="h-4 w-0.5 bg-[#1E2D45]" />
          <Bus size={18} className={accentColor} />
          <div className="h-4 w-0.5 bg-[#1E2D45]" />
          <div className="h-[10px] w-[10px] rounded-full border-2 border-[#0D1525] bg-wasla-primary" />
        </div>

        <div className="flex flex-1 flex-col items-end gap-1">
          <span className="text-[9px] font-semibold tracking-wider text-wasla-text-muted">
            ARRIVE
          </span>
          <span
            className={cn(
              "text-xl font-extrabold tracking-tight text-right",
              isActive ? "text-wasla-text-primary" : "text-wasla-text-muted",
            )}
          >
            {to}
          </span>
          <span className="text-xs text-wasla-text-muted">
            ~{Math.floor(Math.random() * 45 + 15)}min ride
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2.5 px-4 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-wasla-text-muted">&#x1F4CB;</span>
          <span className="text-xs font-semibold text-wasla-text-secondary">
            {plate}
          </span>
        </div>
        <div className="h-4 w-px bg-[rgba(255,255,255,0.06)]" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-wasla-text-muted">&#x1F465;</span>
          <span className="text-xs font-semibold text-wasla-text-secondary">
            {seats} seat{seats > 1 ? "s" : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-wasla-accent/10 px-2.5 py-1">
          <span className="text-xs font-bold text-wasla-primary">VIEW</span>
        </div>
      </div>

      {/* Status strip */}
      <div
        className={cn(
          "flex items-center gap-1.5 border-t px-4 py-2",
          statusBg,
          isActive
            ? "border-t-[rgba(34,197,94,0.1)]"
            : isExpired
              ? "border-t-[rgba(239,68,68,0.1)]"
              : "border-t-[rgba(255,255,255,0.02)]",
        )}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isActive
              ? "bg-wasla-success"
              : isExpired
                ? "bg-wasla-error"
                : "bg-wasla-text-muted",
          )}
        />
        <span className={cn("text-[10px] font-semibold", statusColor)}>
          {statusLabel}
        </span>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="ml-auto"
          >
            <XCircle size={16} className="text-wasla-error hover:opacity-80" />
          </button>
        )}
      </div>
    </button>
  );
}

// ─── Book Ride Prompt ───────────────────────────────────────────────

function BookRidePrompt({
  stationsCount,
  onPress,
}: {
  stationsCount: number;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="relative w-full overflow-hidden rounded-2xl border border-wasla-border bg-[#0D1525] p-7 text-center shadow-lg shadow-black/20 transition-all hover:opacity-90"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute top-[-60px] left-[20%] h-[200px] w-[200px] rounded-full bg-wasla-accent/5" />

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-wasla-accent/10">
          <Bus size={32} className="text-wasla-primary" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-bold tracking-tight text-wasla-text-primary">
            Ready to ride?
          </h2>
          <p className="max-w-xs text-center text-xs leading-relaxed text-wasla-text-secondary">
            {stationsCount > 0
              ? `${stationsCount} stations available — tap to book your seat`
              : "Browse stations and book your next trip"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-wasla-primary px-5 py-3">
          <span className="text-[15px] font-bold text-[#0A0F19]">Find a ride</span>
          <ArrowRight size={18} className="text-[#0A0F19]" />
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

function StationSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0D1525] px-4 py-3.5"
        >
          <div className="h-10 w-10 rounded-xl bg-[rgba(255,255,255,0.04)]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-28 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-2.5 w-20 rounded bg-[rgba(255,255,255,0.04)]" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const ticketListRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Stores
  const tickets = useBookingStore((s) => s.tickets).filter(
    (t: any) => t.state === "active",
  );
  const { stations, nearbyStations, setStations, setNearbyStations } =
    useStationStore();
  const { isOffline, bumpReconnectEpoch } = useConnectivityStore();
  const realtimeStatus = useRealtimeStore((s) => s.status);

  // Fetch tickets on mount
  useEffect(() => {
    let cancelled = false;
    getMyBookings()
      .then((bookings) => {
        if (cancelled || !Array.isArray(bookings)) return;
        const existingIds = new Set(
          useBookingStore.getState().tickets.map((t: any) => t.id),
        );
        const now = Date.now();
        const newTickets = bookings
          .filter((b: any) => b.status === "CONFIRMED" && !existingIds.has(b.id))
          .map((b: any) => {
            const created = new Date(b.created_at).getTime();
            const age = now - created;
            const state =
              age < 3_600_000 ? "active" : age < 86_400_000 ? "expired" : "used";
            const dest = (b.destination_id || "")
              .replace("dest_", "")
              .replace(/_/g, " ");
            const stn = (b.station_id || "").replace(/_/g, " ");
            return {
              id: b.id,
              qrValue: b.id,
              issuedAt: b.created_at,
              paymentStatus: "confirmed" as const,
              state: state as any,
              stationId: b.station_id,
              stationName: stn,
              routeId: b.destination_id,
              routeName: dest,
              departureName: stn,
              destinationName: dest,
              availableSeats: 0,
              seatCount: b.seats_booked || 1,
              pricePerSeat: b.price_per_seat || 5.0,
              totalPrice: b.amount || b.seats_booked * 5.0,
              etdIso: b.created_at,
              etdLabel: new Date(b.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              vehiclePlate: b.vehicle_plate || "TBA",
            };
          });
        if (newTickets.length > 0) {
          useBookingStore.setState((s) => ({
            tickets: [...newTickets, ...s.tickets],
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Geolocation
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(true);

  const resolveLocation = useCallback(async () => {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 10 * 60 * 1000,
          });
        },
      );
      setUserCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch {
      // Permission denied or unavailable — use default
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void resolveLocation();
  }, [resolveLocation]);

  // Stations query
  const stationsQuery = useQuery({
    queryKey: ["central-stations", "v2"],
    queryFn: async () => {
      const list = await getStations();
      setStations(list);
      return list;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
    enabled: !isOffline,
  });

  // Compute nearby stations
  useEffect(() => {
    if (stations.length === 0) {
      setNearbyStations([]);
      return;
    }
    const sorted = stations
      .filter((s) => s.status === "online")
      .map((s) => ({
        ...s,
        distanceKm:
          userCoords && hasCoords(s)
            ? haversineKm(
                userCoords.lat,
                userCoords.lng,
                Number(s.lat),
                Number(s.lng),
              )
            : MAX_DISTANCE_KM,
      }))
      .sort(
        (a, b) =>
          (a.distanceKm ?? MAX_DISTANCE_KM) -
            (b.distanceKm ?? MAX_DISTANCE_KM) ||
          a.name.localeCompare(b.name),
      );
    setNearbyStations(sorted);
  }, [stations, userCoords, setNearbyStations]);

  // Cancel ticket
  const handleCancelTicket = useCallback((ticketId: string) => {
    if (
      !window.confirm("Cancel this trip?\nThe seat hold will be released.")
    )
      return;

    cancelBooking(ticketId)
      .then(() => {
        useBookingStore.setState((s) => ({
          tickets: s.tickets.filter((t: any) => t.id !== ticketId),
        }));
      })
      .catch(() => {
        window.alert("Could not cancel. Try again.");
      });
  }, []);

  const stationCount = nearbyStations.length;
  const hasTickets = tickets.length > 0;

  // Track scroll position for dots
  const handleScroll = useCallback(() => {
    if (!ticketListRef.current) return;
    const scrollLeft = ticketListRef.current.scrollLeft;
    const cardWidth = window.innerWidth - 40 + CARD_GAP;
    const idx = Math.round(scrollLeft / cardWidth);
    setPageIndex(idx);
  }, []);

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-wasla-bg">
        {/* Offline banner */}
        {isOffline && (
          <div className="flex items-center justify-center gap-2 border-b border-wasla-warning/20 bg-wasla-warning/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-wasla-warning" />
            <span className="text-xs font-semibold text-wasla-warning">
              You are offline — showing cached data
            </span>
          </div>
        )}

        <div className="mx-auto w-full max-w-screen-sm flex-1 px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between pt-12 pb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold tracking-[1.5px] text-wasla-text-muted">
                WASLA
              </span>
              <h1 className="text-[26px] font-bold tracking-tight text-wasla-text-primary">
                {hasTickets ? "Your trips" : "Where to?"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {locating && (
                <Loader2 size={14} className="animate-spin text-wasla-primary" />
              )}
              {realtimeStatus === "connected" && (
                <span className="h-[7px] w-[7px] rounded-full bg-wasla-success" />
              )}
              <Link
                href="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-wasla-primary/15 text-sm font-bold text-wasla-primary hover:bg-wasla-primary/20"
              >
                W
              </Link>
            </div>
          </div>

          {/* Ticket Carousel or Book Prompt */}
          {hasTickets ? (
            <div className="mb-6">
              <div
                ref={ticketListRef}
                onScroll={handleScroll}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" }}
              >
                {tickets.map((t: any) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onPress={() => router.push(`/ticket?ticketId=${t.id}`)}
                    onCancel={() => handleCancelTicket(t.id)}
                  />
                ))}
              </div>

              {/* Page dots */}
              {tickets.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5">
                  {tickets.map((_: any, i: number) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === pageIndex
                          ? "w-5 bg-wasla-primary"
                          : "w-[6px] bg-[#1E2D45]",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <BookRidePrompt
                stationsCount={stationCount}
                onPress={() => setSheetOpen(true)}
              />
            </div>
          )}

          {/* Nearby Stations */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[1.2px] text-wasla-text-secondary">
                NEARBY STATIONS
              </span>
              {stationCount > 3 && (
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="text-[11px] font-semibold text-wasla-primary hover:underline"
                >
                  View all
                </button>
              )}
            </div>

            {stationsQuery.isLoading ? (
              <StationSkeleton />
            ) : stationCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <MapPinOff size={24} className="text-[#3A4A60]" />
                <span className="text-xs text-wasla-text-muted">
                  No stations nearby
                </span>
              </div>
            ) : (
              nearbyStations.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0D1525] px-4 py-3.5 text-left transition-all hover:opacity-70"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <Bus size={18} className="text-wasla-text-secondary" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-wasla-text-primary">
                      {s.name}
                    </span>
                    <span className="text-xs text-wasla-text-muted">
                      {formatKm((s as StationWithDistance).distanceKm)}
                      {" · "}
                      {s.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      s.status === "online"
                        ? "bg-wasla-success"
                        : "bg-wasla-error",
                    )}
                  />
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#3A4A60]" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* FAB — Quick Book */}
        {hasTickets && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-24 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-2xl bg-wasla-primary shadow-lg shadow-wasla-primary/40 transition-all hover:scale-105 active:scale-95"
            style={{ width: 52, height: 52 }}
          >
            <Plus size={24} className="text-[#0A0F19]" />
          </button>
        )}
      </div>

      {/* Station Sheet */}
      <StationSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
