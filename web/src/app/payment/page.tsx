"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { useBookingStore } from "@/store/bookingStore";
import { cn } from "@/lib/utils";

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentScreen />
    </Suspense>
  );
}

function PaymentScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = useBookingStore((s) => s.draft);
  const addTicket = useBookingStore((s) => s.addTicket);

  // Only the booking ID comes from the URL.
  // All sensitive booking details (including paymentUrl) come from the Zustand draft store.
  const bookingId = searchParams.get("centralBookingId") || "";
  const description = draft
    ? `${draft.departureName} → ${draft.destinationName}`
    : "Wasla booking";
  const amount = draft ? draft.totalPrice * 1000 : 0;
  const amountTnd = (amount / 1000).toFixed(3);
  const paymentUrl = draft?.paymentUrl ?? "";

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Allowlisted payment gateway origins
  const ALLOWED_PAYMENT_ORIGINS = [
    "https://checkout.nexapay.com",
    "https://nexapay.space",
    "https://checkout.nexapay.space",
    "https://api.nexapay.com",
    "https://nexapay.com",
    "https://backend.wasla.fun",
    // dev
    "http://localhost:4000",
    "http://localhost:3000",
    "http://10.0.2.2:4000",
  ];

  function isValidPaymentUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      // Require HTTPS for non-localhost origins
      if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname)) return false;
      return ALLOWED_PAYMENT_ORIGINS.some((origin) => parsed.origin === new URL(origin).origin);
    } catch {
      return false;
    }
  }

  // Confirm payment by polling
  const confirmTicket = useCallback(
    async (bId: string): Promise<boolean> => {
      try {
        const res = await api.post(`/bookings/${bId}/confirm-payment`);
        if (res.data?.ticket || res.data?.already_confirmed) {
          // Save ticket to store - use server vehicle plate if available
          if (draft) {
            const serverPlate = (res.data?.ticket?.vehicle_plate || res.data?.vehicle_plate || "").trim();
            addTicket({
              id: bId,
              qrValue: bId.slice(0, 8).toUpperCase(),
              issuedAt: new Date().toISOString(),
              paymentStatus: "confirmed",
              state: "active",
              ...draft,
              vehiclePlate: serverPlate || draft.vehiclePlate || "TBA",
            });
          }
          setConfirmed(true);
          setConfirming(false);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [],
  );

  // Start polling after payment
  const startPolling = useCallback(async () => {
    setConfirming(true);
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const done = await confirmTicket(bookingId);
      if (done) return;
    }
    setConfirming(false);
    // Polling exhausted
    setError(
      "Taking longer than expected. Check your bookings shortly.",
    );
  }, [bookingId, confirmTicket]);

  // Open payment URL and start polling
  const handlePay = useCallback(() => {
    if (!paymentUrl) {
      setError("No payment URL provided. Please go back and try again.");
      return;
    }
    if (!isValidPaymentUrl(paymentUrl)) {
      setError("The payment link is from an unrecognised provider and was blocked for your safety.");
      return;
    }
    window.open(paymentUrl, "_blank", "noopener,noreferrer");
    setPaymentDone(true);
    startPolling();
  }, [paymentUrl, startPolling]);

  const navigateHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const navigateTicket = useCallback(() => {
    router.replace(`/ticket?bookingId=${bookingId}`);
  }, [router, bookingId]);

  // Confirming state
  if (confirming) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-wasla-bg px-5">
        <Loader2 size={40} className="animate-spin text-wasla-success" />
        <p className="text-lg font-bold text-wasla-text-primary">
          Confirming booking...
        </p>
        <p className="text-xs text-wasla-text-secondary">
          Payment received. Generating your ticket.
        </p>
      </div>
    );
  }

  // Confirmed state
  if (confirmed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-wasla-bg px-5">
        <CheckCircle size={48} className="text-wasla-success" />
        <p className="text-lg font-bold text-wasla-text-primary">
          Ticket Ready!
        </p>
        <p className="text-xs text-wasla-text-secondary">
          Booking confirmed successfully.
        </p>
        <button
          type="button"
          onClick={navigateTicket}
          className="mt-2 w-full max-w-xs rounded-xl bg-wasla-primary py-4 text-center text-base font-bold text-wasla-bg transition-opacity hover:opacity-90"
        >
          View Ticket
        </button>
        <button
          type="button"
          onClick={navigateHome}
          className="text-xs font-semibold text-wasla-text-muted hover:text-wasla-text-secondary"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-wasla-bg">
      <div className="mx-auto w-full max-w-screen-sm flex-1 px-5 pt-16 pb-12">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 self-start rounded-xl border border-wasla-border-strong bg-wasla-surface-elevated px-3.5 py-2.5 transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={20} className="text-wasla-text-primary" />
          <span className="text-sm font-bold text-wasla-text-primary">Back</span>
        </button>

        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <h1 className="text-center text-[22px] font-bold text-wasla-text-primary">
            Pay with NexaPay
          </h1>
          <p className="text-center text-base text-wasla-text-secondary">
            {amountTnd} TND
          </p>
          <p className="text-center text-xs text-wasla-text-muted">
            {description}
          </p>

          {error ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-wasla-error/10 px-4 py-3">
                <AlertCircle size={16} className="text-wasla-error" />
                <span className="text-sm font-semibold text-wasla-error">
                  {error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  handlePay();
                }}
                className="w-full rounded-xl bg-wasla-primary py-4 text-center text-base font-bold text-wasla-bg transition-opacity hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          ) : paymentDone ? (
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-lg font-bold text-wasla-success">
                Payment Complete!
              </p>
              <button
                type="button"
                onClick={startPolling}
                className="w-full rounded-xl bg-wasla-primary py-4 text-center text-base font-bold text-wasla-bg transition-opacity hover:opacity-90"
              >
                Get My Ticket
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={!paymentUrl}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-wasla-primary py-4 text-center text-base font-bold text-wasla-bg transition-opacity",
                !paymentUrl && "opacity-45",
                paymentUrl && "hover:opacity-90",
              )}
            >
              <ExternalLink size={18} />
              Pay {amountTnd} TND
            </button>
          )}

          <p className="text-center text-[10px] text-wasla-text-muted">
            You will be redirected to NexaPay to complete the payment.
          </p>
        </div>
      </div>
    </div>
  );
}
