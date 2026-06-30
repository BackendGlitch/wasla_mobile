"use client";

import { Suspense, useCallback, useState } from "react";
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
import { useBookingStore } from "@/store";
import { cn } from "@/lib/utils";

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

  const ticket = useBookingStore((s) =>
    s.tickets.find((t: any) => t.id === tid || t.id === bid),
  );

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
            The ticket may have been cleared. Create a new booking to generate
            another one.
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
                <img
                  src={`https://chart.googleapis.com/chart?chs=160x160&cht=qr&chl=${encodeURIComponent(qrValue)}`}
                  alt="Ticket QR Code"
                  width={160}
                  height={160}
                  className="block"
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
