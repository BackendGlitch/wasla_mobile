"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Ticket, Clock, TimerOff, CheckCircle, X, ArrowRight, ChevronRight } from "lucide-react";
import { useBookingStore } from "@/store";
import { cn } from "@/lib/utils";

export default function HistoryScreen() {
  const router = useRouter();
  const tickets = useBookingStore((s) => s.tickets);

  // Stats
  const stats = useMemo(() => {
    const total = tickets.reduce(
      (sum, t: any) => sum + (t.totalPrice || 0),
      0,
    );
    return { trips: tickets.length, spent: total };
  }, [tickets]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const t of tickets) {
      const day = dayjs(t.issuedAt).format("ddd, D MMM");
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    return Object.entries(map);
  }, [tickets]);

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
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-wasla-text-muted transition-colors hover:text-wasla-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {tickets.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D1525]">
              <Ticket size={28} className="text-[#3A4A60]" />
            </div>
            <h2 className="text-base font-bold text-wasla-text-primary">
              No trips yet
            </h2>
            <p className="text-center text-xs text-wasla-text-muted">
              Your completed bookings will appear here
            </p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-2 rounded-xl bg-wasla-primary px-5 py-2.5 text-xs font-bold text-[#0A0F19] transition-opacity hover:opacity-90"
            >
              Book a trip
            </button>
          </div>
        ) : (
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
                  {stats.spent}
                </p>
                <p className="text-[10px] font-semibold text-wasla-text-muted">
                  TND SPENT
                </p>
              </div>
            </div>

            {/* Ticket list */}
            {grouped.map(([date, items]) => (
              <div key={date} className="mb-4">
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-wasla-text-muted">
                  {date.toUpperCase()}
                </p>
                {items.map((t: any) => {
                  const state: string = (t as any).state || "used";
                  const isActive = state === "active";
                  const isExpired = state === "expired";
                  const accentColor = isActive
                    ? "text-wasla-success"
                    : isExpired
                      ? "text-wasla-error"
                      : "text-wasla-text-muted";
                  const bgColor = isActive
                    ? "bg-[rgba(34,197,94,0.04)]"
                    : isExpired
                      ? "bg-[rgba(239,68,68,0.04)]"
                      : "bg-transparent";
                  const Icon = isActive
                    ? Clock
                    : isExpired
                      ? TimerOff
                      : CheckCircle;
                  const stateLabel = isActive
                    ? "Active"
                    : isExpired
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
                              isActive
                                ? "text-wasla-success"
                                : isExpired
                                  ? "text-wasla-error"
                                  : "text-wasla-text-muted",
                            )}
                          >
                            {t.totalPrice} TND
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

