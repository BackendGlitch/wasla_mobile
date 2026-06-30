"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi, getCentralApiErrorMessage } from "@/lib/authApi";
import { finishAuthAndNavigate } from "@/lib/postAuthFlow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type EmailData = z.infer<typeof emailSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [phonePw, setPhonePw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { control, handleSubmit, formState: { errors, isValid }, reset } = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const onPhoneLogin = async () => {
    const raw = phone.trim().replace(/\s+/g, "");
    if (raw.length < 8) { setError("Enter a valid mobile number"); return; }
    if (!phonePw) { setError("Password is required"); return; }
    setError(""); setLoading(true);
    try {
      const e164 = raw.startsWith("+") ? raw : "+216" + raw.replace(/[^\d]/g, "").replace(/^0/, "");
      const result = await authApi.loginWithPhone({ phone: e164, password: phonePw });
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) { setError(getCentralApiErrorMessage(e)); }
    finally { setLoading(false); }
  };

  const onEmailLogin = async (data: EmailData) => {
    setError(""); setLoading(true);
    try {
      const result = await authApi.loginWithEmail({ email: data.email.trim().toLowerCase(), password: data.password });
      reset();
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) { setError(getCentralApiErrorMessage(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-wasla-bg px-5 pt-12 pb-8">
      {/* Back button */}
      <Link href="/" className="w-fit rounded-xl border border-wasla-border bg-wasla-surface p-2.5 text-wasla-text-secondary hover:text-wasla-text-primary transition-colors">
        <ArrowLeft size={20} />
      </Link>

      {/* Header */}
      <div className="mt-6 mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-wasla-text-primary">Sign in</h1>
        <p className="mt-1 text-sm text-wasla-text-secondary">Choose how to access your account</p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-xl bg-wasla-surface border border-wasla-border p-1 mb-5">
        {(["phone", "email"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors",
              mode === m
                ? "bg-wasla-accent/15 text-wasla-accent"
                : "text-wasla-text-muted"
            )}
          >
            {m === "phone" ? "Phone" : "Email"}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/8 border border-red-500/20 p-3 mb-4">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm font-semibold text-red-400">{error}</p>
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl bg-wasla-surface border border-wasla-border p-5 space-y-4">
        {mode === "phone" ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-wasla-text-secondary">Phone number</Label>
              <div className="flex items-center rounded-xl bg-wasla-bg border border-wasla-border px-3.5">
                <span className="text-sm font-bold text-wasla-text-muted pr-2 border-r border-wasla-border mr-2">+216</span>
                <input
                  className="flex-1 bg-transparent py-3.5 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none"
                  placeholder="XX XXX XXX"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-wasla-text-secondary">Password</Label>
              <div className="flex items-center rounded-xl bg-wasla-bg border border-wasla-border px-3.5">
                <Lock size={15} className="text-wasla-text-muted mr-2" />
                <input
                  className="flex-1 bg-transparent py-3.5 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none"
                  placeholder="Your password"
                  type="password"
                  value={phonePw}
                  onChange={(e) => setPhonePw(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={onPhoneLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-wasla-accent text-wasla-bg font-extrabold hover:bg-wasla-primary-light transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-wasla-text-secondary">Email</Label>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.email ? "border-red-500" : "border-wasla-border")}>
                    <Mail size={15} className={errors.email ? "text-red-400" : "text-wasla-text-muted"} />
                    <input
                      {...field}
                      className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none"
                      placeholder="you@email.com"
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                )}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-wasla-text-secondary">Password</Label>
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.password ? "border-red-500" : "border-wasla-border")}>
                    <Lock size={15} className={errors.password ? "text-red-400" : "text-wasla-text-muted"} />
                    <input
                      {...field}
                      className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none"
                      placeholder="Your password"
                      type="password"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <Button
              onClick={handleSubmit(onEmailLogin)}
              disabled={!isValid || loading}
              className="w-full h-12 rounded-xl bg-wasla-accent text-wasla-bg font-extrabold hover:bg-wasla-primary-light disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-sm text-wasla-text-secondary mt-6">
        New to Wasla?{" "}
        <Link href="/sign-up" className="font-bold text-wasla-accent hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
