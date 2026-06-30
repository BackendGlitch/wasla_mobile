"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { authApi, getCentralApiErrorMessage } from "@/lib/authApi";
import { finishAuthAndNavigate } from "@/lib/postAuthFlow";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setToken, setUser } = useAuthStore();
  const email = params.get("email") || "";
  const skipInitialOtp = params.get("skipInitialOtp") === "1";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(skipInitialOtp);

  const handleVerify = async () => {
    if (otp.length < 4) { setError("Enter the verification code"); return; }
    setError(""); setLoading(true);
    try {
      const result = await authApi.verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() });
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError("");
    try {
      await authApi.requestOtp({ email: email.trim().toLowerCase() });
      setResent(true);
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-wasla-bg px-5 pt-12 pb-8">
      <Link href="/sign-in" className="w-fit rounded-xl border border-wasla-border bg-wasla-surface p-2.5 text-wasla-text-secondary hover:text-wasla-text-primary transition-colors">
        <ArrowLeft size={20} />
      </Link>

      <div className="mt-6 mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-wasla-text-primary">Verify email</h1>
        <p className="mt-1 text-sm text-wasla-text-secondary">We sent a code to <span className="text-wasla-text-primary font-semibold">{email}</span></p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/8 border border-red-500/20 p-3 mb-4">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm font-semibold text-red-400">{error}</p>
        </div>
      )}

      {resent && !error && (
        <div className="flex items-center gap-2 rounded-xl bg-green-500/8 border border-green-500/20 p-3 mb-4">
          <CheckCircle size={16} className="text-green-400 shrink-0" />
          <p className="text-sm font-semibold text-green-400">Code resent successfully</p>
        </div>
      )}

      <div className="rounded-2xl bg-wasla-surface border border-wasla-border p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-wasla-text-secondary">Verification code</Label>
          <input
            className={cn(
              "w-full rounded-xl bg-wasla-bg border py-3.5 px-3.5 text-center text-2xl font-bold tracking-[0.3em] text-wasla-text-primary placeholder:text-wasla-text-muted outline-none",
              error ? "border-red-500" : "border-wasla-border"
            )}
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
            autoFocus
          />
        </div>
        <Button
          onClick={handleVerify}
          disabled={otp.length < 4 || loading}
          className="w-full h-12 rounded-xl bg-wasla-accent text-wasla-bg font-extrabold hover:bg-wasla-primary-light disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify & continue"}
        </Button>
        <p className="text-center text-sm text-wasla-text-muted">
          Didn't receive it?{" "}
          <button onClick={handleResend} className="font-bold text-wasla-accent hover:underline">Resend code</button>
        </p>
      </div>
    </div>
  );
}
