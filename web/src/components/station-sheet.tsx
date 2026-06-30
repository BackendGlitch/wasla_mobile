"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowLeft,
  ChevronRight,
  MapPin,
  Bus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getStationRoutes, type RouteData } from "@/lib/routesApi";
import { buildBookingRouteMeta, formatCurrency } from "@/lib/bookingFlow";
import { useStationStore, type StationWithDistance } from "@/store";
import { cn } from "@/lib/utils";

// ─── Route Row ─────────────────────────────────────────────────────

function RouteRow({
  route,
  stationId,
  stationName,
  isSelected,
  onSelect,
}: {
  route: RouteData;
  stationId: string;
  stationName: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const routeKey = String(route.id);
  const meta = buildBookingRouteMeta(route, stationName);
  const isFull = route.available_seats <= 0;

  return (
    <button
      type="button"
      disabled={isFull}
      onClick={() => !isFull && onSelect(routeKey)}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all duration-150",
        isSelected
          ? "border-wasla-primary bg-wasla-accent/10"
          : "border-wasla-border bg-wasla-surface-elevated",
        isFull && "opacity-55",
        !isFull && "hover:border-wasla-border-strong hover:brightness-110",
      )}
    >
      <div className="flex flex-col gap-3">
        <p className="text-lg font-extrabold tracking-tight text-wasla-text-primary">
          {meta.destinationName}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-wasla-text-muted">Base (per seat)</span>
          <span className="text-base font-bold text-wasla-text-primary">
            {formatCurrency(meta.pricePerSeat)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-wasla-text-muted">Total (1 seat)</span>
          <span className="text-base font-extrabold text-wasla-primary">
            {formatCurrency(meta.pricePerSeat)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-wasla-text-muted">Seats left</span>
          <span
            className={cn(
              "text-lg font-extrabold",
              isFull ? "text-red-300" : "text-wasla-text-primary",
            )}
          >
            {isFull ? "0" : String(route.available_seats)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Station Sheet Props ───────────────────────────────────────────

interface StationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Station Sheet ─────────────────────────────────────────────────

export function StationSheet({ open, onOpenChange }: StationSheetProps) {
  const router = useRouter();
  const nearbyStations = useStationStore((s) => s.nearbyStations);

  const [bookingStep, setBookingStep] = useState<"station" | "routes">("station");
  const [stationSearch, setStationSearch] = useState("");
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteData[] | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [draftStation, setDraftStation] = useState<StationWithDistance | null>(null);
  const routesAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when sheet opens/closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setBookingStep("station");
        setFetchedRoutes(null);
        setSelectedRouteId("");
        setDraftStation(null);
        setStationSearch("");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Filtered stations
  const filteredStations = useMemo(() => {
    if (!stationSearch.trim()) return nearbyStations;
    const q = stationSearch.toLowerCase();
    return nearbyStations.filter((s) => s.name.toLowerCase().includes(q));
  }, [nearbyStations, stationSearch]);

  // Fetch routes for a station
  const fetchRoutes = useCallback(async (station: StationWithDistance) => {
    setLoadingRoutes(true);
    setBookingStep("routes");
    setDraftStation(station);
    setSelectedRouteId("");

    routesAbortRef.current?.abort();
    const ac = new AbortController();
    routesAbortRef.current = ac;

    try {
      const r = await getStationRoutes(station.id, { signal: ac.signal });
      if (!ac.signal.aborted) setFetchedRoutes(r);
    } catch {
      if (!ac.signal.aborted) setFetchedRoutes([]);
    } finally {
      if (!ac.signal.aborted) setLoadingRoutes(false);
    }
  }, []);

  // Continue to booking
  const continueToBooking = useCallback(() => {
    if (!selectedRouteId || !draftStation || !fetchedRoutes) return;
    const route = fetchedRoutes.find((r) => String(r.id) === selectedRouteId);
    if (!route) return;

    const meta = buildBookingRouteMeta(route, draftStation.name);

    const params = new URLSearchParams({
      stationId: draftStation.id,
      stationName: draftStation.name,
      routeId: meta.routeId,
      routeName: meta.routeName,
      departureName: meta.departureName,
      destinationName: meta.destinationName,
      availableSeats: String(meta.availableSeats),
      pricePerSeat: String(meta.pricePerSeat),
      etdIso: meta.etdIso,
      etdLabel: meta.etdLabel,
    });

    handleOpenChange(false);
    router.push(`/booking?${params.toString()}`);
  }, [selectedRouteId, draftStation, fetchedRoutes, router, handleOpenChange]);

  // Go back to station list
  const handleBack = useCallback(() => {
    setBookingStep("station");
    setFetchedRoutes(null);
    setSelectedRouteId("");
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[90dvh] flex-col gap-0 rounded-t-2xl border-t border-wasla-border bg-wasla-surface p-0"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full bg-wasla-text-muted/20" />
        </div>

        {bookingStep === "station" ? (
          <>
            {/* Header */}
            <div className="px-5 pt-2 pb-3">
              <h2 className="text-lg font-bold text-wasla-text-primary">
                Pick departure station
              </h2>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-wasla-border bg-wasla-surface-elevated px-3">
                <Search size={18} className="shrink-0 text-wasla-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search stations..."
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted/50 outline-none"
                />
                {stationSearch && (
                  <button
                    type="button"
                    onClick={() => setStationSearch("")}
                    className="shrink-0"
                  >
                    <X size={16} className="text-wasla-text-muted" />
                  </button>
                )}
              </div>
            </div>

            {/* Station list */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1">
              {filteredStations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <MapPin size={28} className="text-wasla-text-muted/40" />
                  <p className="text-sm text-wasla-text-muted">No stations found</p>
                </div>
              ) : (
                filteredStations.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => fetchRoutes(s)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-wasla-surface-elevated/80"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wasla-accent/10">
                      <Bus size={18} className="text-wasla-primary" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="text-[15px] font-semibold text-wasla-text-primary">
                        {s.name}
                      </p>
                      <p className="text-xs text-wasla-text-muted">
                        {s.distanceKm != null && Number.isFinite(s.distanceKm)
                          ? s.distanceKm < 1
                            ? `${Math.round(s.distanceKm * 1000)}m`
                            : `${s.distanceKm.toFixed(1)}km`
                          : ""}
                        {" · "}
                        {s.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        s.status === "online" ? "bg-wasla-success" : "bg-wasla-error",
                      )}
                    />
                    <ChevronRight size={18} className="shrink-0 text-wasla-text-muted/50" />
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Header with back */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-wasla-text-secondary transition-colors hover:text-wasla-text-primary"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 className="text-lg font-bold text-wasla-text-primary">
                {draftStation?.name ?? "Routes"}
              </h2>
            </div>

            {/* Routes list or loading */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
              {loadingRoutes ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2 size={32} className="animate-spin text-wasla-primary" />
                  <p className="text-sm text-wasla-text-muted">Loading routes...</p>
                </div>
              ) : fetchedRoutes && fetchedRoutes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <AlertCircle size={28} className="text-wasla-text-muted/40" />
                  <p className="text-sm text-wasla-text-muted">No routes available</p>
                </div>
              ) : (
                (fetchedRoutes ?? []).map((route) => (
                  <RouteRow
                    key={route.id}
                    route={route}
                    stationId={draftStation?.id ?? ""}
                    stationName={draftStation?.name ?? ""}
                    isSelected={selectedRouteId === String(route.id)}
                    onSelect={(id) => setSelectedRouteId(id)}
                  />
                ))
              )}
            </div>

            {/* Continue button */}
            {selectedRouteId && (
              <div className="border-t border-wasla-border px-5 py-4">
                <button
                  type="button"
                  onClick={continueToBooking}
                  className="w-full rounded-xl bg-wasla-primary py-4 text-center text-base font-bold text-wasla-bg transition-opacity hover:opacity-90 active:scale-[0.99]"
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
