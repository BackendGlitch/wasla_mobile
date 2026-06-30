"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Minus, Plus, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import { createBooking } from "@/lib/bookingApi";
import { formatCurrency } from "@/lib/bookingFlow";
import {
  useBookingRoutesLiveStore,
  useBookingStore,
  useStationStore,
} from "@/store";
import { cn } from "@/lib/utils";

export default function BookingPage() {
  return (
    <Suspense>
      <BookingScreen />
    </Suspense>
  );
}

function BookingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setDraft = useBookingStore((state) => state.setDraft);
  const selectedStation = useStationStore((s) => s.selectedStation);

  // Read params
  const stationId =
    searchParams.get("stationId") || selectedStation?.id?.trim() || "";
  const stationName =
    searchParams.get("stationName") || selectedStation?.name?.trim() || "Depart station";
  const routeId = searchParams.get("routeId") || "";
  const routeName = searchParams.get("routeName") || "Selected route";
  const departureName = searchParams.get("departureName") || stationName;
  const destinationName = searchParams.get("destinationName") || routeName;
  const pricePerSeat = Number(searchParams.get("pricePerSeat") ?? 0) || 0;
  const availableSeatsParam =
    Number(searchParams.get("availableSeats") ?? 0) || 0;
  const etdIso =
    searchParams.get("etdIso") || new Date().toISOString();
  const etdLabel = searchParams.get("etdLabel") || "--:--";

  // Live seats from store
  const liveSeats = useBookingRoutesLiveStore(
    useCallback(
      (s) =>
        stationId && routeId
          ? s.metricsByStation[stationId]?.[routeId]?.available_seats
          : undefined,
      [stationId, routeId],
    ),
  );

  const availableSeatsLive =
    typeof liveSeats === "number" ? liveSeats : availableSeatsParam;

  const [seatCount, setSeatCount] = useState(
    availableSeatsLive > 0 ? 1 : 0,
  );
  const [submitting, setSubmitting] = useState(false);

  // Sync seat count with available seats
  useEffect(() => {
    if (availableSeatsLive <= 0) {
      setSeatCount(0);
      return;
    }
    setSeatCount((current) => {
      if (current <= 0) return 1;
      return Math.min(current, availableSeatsLive);
    });
  }, [availableSeatsLive]);

  const totalPrice = useMemo(
    () => seatCount * pricePerSeat,
    [pricePerSeat, seatCount],
  );
  const canContinue = availableSeatsLive > 0 && seatCount > 0;

  // Update draft on changes
  useEffect(() => {
    if (!canContinue) return;

    setDraft({
      stationId,
      stationName,
      routeId,
      routeName,
      departureName,
      destinationName,
      availableSeats: availableSeatsLive,
      seatCount,
      pricePerSeat,
      totalPrice,
      etdIso,
      etdLabel,
      vehiclePlate: "TBA",
    });
  }, [
    availableSeatsLive,
    canContinue,
    departureName,
    destinationName,
    etdIso,
    etdLabel,
    pricePerSeat,
    routeId,
    routeName,
    seatCount,
    setDraft,
    stationId,
    stationName,
    totalPrice,
  ]);

  const handleContinue = useCallback(async () => {
    if (!canContinue || submitting) return;

    const sid = stationId.trim();
    const rid = String(routeId).trim();
    if (!sid || !rid) {
      window.alert(
        "Missing station or route. Go back and pick your depart station and destination again.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // NexaPay uses millimes — convert TND to millimes
      const amountInMillimes = Math.round(totalPrice * 1000);
      const res = await createBooking({
        station_id: sid,
        stationId: sid,
        destination_id: rid,
        destinationId: rid,
        seats_booked: seatCount,
        amount: amountInMillimes,
      });

      const centralBookingId =
        typeof res?.booking_id === "string"
          ? res.booking_id
          : typeof res?.bookingId === "string"
            ? res.bookingId
            : "";

      if (!centralBookingId) {
        throw new Error("Server did not return a booking reference.");
      }

      const paymentUrl =
        typeof res?.payment_url === "string"
          ? res.payment_url
          : typeof res?.paymentUrl === "string"
            ? res.paymentUrl
            : "";

      // Extract vehicle plate from the station response (assigned at hold creation)
      const vehiclePlate =
        (typeof res?.vehicle_license_plate === "string" && res.vehicle_license_plate.trim()) ||
        "TBA";

      // Store payment URL in draft so payment page reads it from memory,
      // not from the URL (avoiding sensitive data in browser history/address bar).
      useBookingStore.getState().setDraft({
        stationId, stationName, routeId, routeName,
        departureName, destinationName,
        availableSeats: availableSeatsLive, seatCount,
        pricePerSeat, totalPrice,
        etdIso, etdLabel, vehiclePlate,
        paymentUrl,
      });

      // Only pass the booking ID in the URL — non-sensitive
      router.push(`/payment?centralBookingId=${encodeURIComponent(centralBookingId)}`);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        window.alert("Please sign in to reserve seats.");
        return;
      }
      const msg =
        isAxiosError(error) && error.response?.data
          ? typeof error.response.data === "string"
            ? error.response.data
            : (error.response.data as any).message ||
              (error.response.data as any).error ||
              "Could not hold seats at this station."
          : "Could not hold seats at this station.";
      window.alert(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    canContinue,
    submitting,
    stationId,
    routeId,
    totalPrice,
    seatCount,
    departureName,
    destinationName,
    availableSeatsLive,
    stationName,
    routeName,
    pricePerSeat,
    etdIso,
    etdLabel,
    router,
  ]);

  const navigateBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col bg-wasla-bg">
      {/* Screen glow */}
      <div
        className="pointer-events-none absolute top-[-80px] right-[-40px] h-[240px] w-[240px] rounded-full opacity-[0.35]"
        style={{ backgroundColor: "rgba(212,168,83,0.14)" }}
      />

      <div className="mx-auto w-full max-w-screen-sm flex-1 px-5 pt-16 pb-12">
        {/* Back button */}
        <button
          type="button"
          onClick={navigateBack}
          className="mb-3 inline-flex items-center gap-2 self-start rounded-xl border border-wasla-border-strong bg-wasla-surface-elevated px-3.5 py-2.5 transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={20} className="text-wasla-text-primary" />
          <span className="text-sm font-bold text-wasla-text-primary">Back</span>
        </button>

        <div className="flex flex-col gap-7">
          {/* Destination */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wider text-wasla-text-muted">
              DESTINATION
            </p>
            <h1 className="text-[34px] font-extrabold tracking-tight text-wasla-text-primary">
              {destinationName}
            </h1>

            {/* Price summary card */}
            <div className="flex flex-col gap-2 rounded-2xl border border-wasla-border bg-wasla-surface-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-wasla-text-muted">
                  Base (per seat)
                </span>
                <span className="text-base font-bold text-wasla-text-primary">
                  {formatCurrency(pricePerSeat)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-wasla-text-muted">Total</span>
                <span className="text-lg font-extrabold text-wasla-primary">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <span className="text-sm text-wasla-text-muted">
                Seats available now:{" "}
                <span className="font-bold text-wasla-text-primary">
                  {availableSeatsLive}
                </span>
              </span>
            </div>
          </div>

          {/* Seat counter */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-wasla-border-strong bg-[#0B1424] p-6">
            <span className="text-xs font-semibold tracking-wider text-wasla-text-muted">
              SEATS
            </span>
            <p className="text-center text-base font-extrabold text-wasla-text-primary">
              {destinationName}
            </p>

            {/* Count display */}
            <div className="flex h-[124px] w-[124px] items-center justify-center rounded-2xl border-[1.5px] border-wasla-border-strong bg-wasla-accent/10">
              <span className="text-6xl font-extrabold text-wasla-text-primary">
                {seatCount}
              </span>
            </div>

            {/* +/- buttons */}
            <div className="flex w-full gap-3">
              <button
                type="button"
                disabled={seatCount <= 1 || availableSeatsLive <= 0}
                onClick={() =>
                  setSeatCount((count) => Math.max(1, count - 1))
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded-xl border border-wasla-border bg-wasla-surface-elevated py-3 transition-colors",
                  (seatCount <= 1 || availableSeatsLive <= 0)
                    ? "opacity-45"
                    : "hover:brightness-110",
                )}
              >
                <Minus size={22} className="text-wasla-text-primary" />
              </button>
              <button
                type="button"
                disabled={seatCount >= availableSeatsLive || availableSeatsLive <= 0}
                onClick={() =>
                  setSeatCount((count) =>
                    Math.min(availableSeatsLive, count + 1),
                  )
                }
                className={cn(
                  "flex flex-1 items-center justify-center rounded-xl border border-wasla-border bg-wasla-surface-elevated py-3 transition-colors",
                  (seatCount >= availableSeatsLive || availableSeatsLive <= 0)
                    ? "opacity-45"
                    : "hover:brightness-110",
                )}
              >
                <Plus size={22} className="text-wasla-text-primary" />
              </button>
            </div>
          </div>

          {/* Continue to payment */}
          <button
            type="button"
            disabled={!canContinue || submitting}
            onClick={handleContinue}
            className={cn(
              "flex w-full items-center justify-center rounded-xl border border-wasla-border-strong bg-wasla-primary py-4 text-base font-extrabold text-wasla-bg transition-opacity",
              (!canContinue || submitting) && "opacity-45",
              canContinue && !submitting && "hover:opacity-90 active:scale-[0.99]",
            )}
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin text-wasla-bg" />
            ) : (
              "Continue to payment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
