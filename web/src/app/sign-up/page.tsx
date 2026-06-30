"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, Mail, User, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi, getCentralApiErrorMessage } from "@/lib/authApi";
import { finishAuthAndNavigate } from "@/lib/postAuthFlow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setError(""); setLoading(true);
    try {
      const result = await authApi.register({
        email: data.email.trim().toLowerCase(),
        phone: "+216" + data.phone.replace(/[^\d]/g, "").replace(/^0/, ""),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      // Auto-login after register: call login to get tokens
      const loginResult = await authApi.loginWithEmail({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      await finishAuthAndNavigate(loginResult, router, setToken, setUser);
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-wasla-bg px-5 pt-12 pb-8">
      <Link href="/sign-in" className="w-fit rounded-xl border border-wasla-border bg-wasla-surface p-2.5 text-wasla-text-secondary hover:text-wasla-text-primary transition-colors">
        <ArrowLeft size={20} />
      </Link>

      <div className="mt-6 mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-wasla-text-primary">Create account</h1>
        <p className="mt-1 text-sm text-wasla-text-secondary">Join Wasla and start booking trips</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/8 border border-red-500/20 p-3 mb-4">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm font-semibold text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-2xl bg-wasla-surface border border-wasla-border p-5 space-y-4">
        <div className="flex gap-3">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-semibold text-wasla-text-secondary">First name</Label>
            <Controller control={control} name="firstName" render={({ field }) => (
              <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.firstName ? "border-red-500" : "border-wasla-border")}>
                <User size={15} className="text-wasla-text-muted" />
                <input {...field} className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none" placeholder="John" />
              </div>
            )} />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-semibold text-wasla-text-secondary">Last name</Label>
            <Controller control={control} name="lastName" render={({ field }) => (
              <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.lastName ? "border-red-500" : "border-wasla-border")}>
                <User size={15} className="text-wasla-text-muted" />
                <input {...field} className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none" placeholder="Doe" />
              </div>
            )} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-wasla-text-secondary">Email</Label>
          <Controller control={control} name="email" render={({ field }) => (
            <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.email ? "border-red-500" : "border-wasla-border")}>
              <Mail size={15} className={errors.email ? "text-red-400" : "text-wasla-text-muted"} />
              <input {...field} className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none" placeholder="you@email.com" type="email" autoComplete="email" />
            </div>
          )} />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-wasla-text-secondary">Phone</Label>
          <Controller control={control} name="phone" render={({ field }) => (
            <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.phone ? "border-red-500" : "border-wasla-border")}>
              <span className="text-sm font-bold text-wasla-text-muted pr-2 border-r border-wasla-border mr-2">+216</span>
              <input {...field} className="flex-1 bg-transparent py-3.5 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none" placeholder="XX XXX XXX" type="tel" />
            </div>
          )} />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-wasla-text-secondary">Password</Label>
          <Controller control={control} name="password" render={({ field }) => (
            <div className={cn("flex items-center rounded-xl bg-wasla-bg border px-3.5", errors.password ? "border-red-500" : "border-wasla-border")}>
              <Lock size={15} className={errors.password ? "text-red-400" : "text-wasla-text-muted"} />
              <input {...field} className="flex-1 bg-transparent py-3.5 ml-2 text-sm text-wasla-text-primary placeholder:text-wasla-text-muted outline-none" placeholder="Min. 6 characters" type="password" autoComplete="new-password" />
            </div>
          )} />
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={!isValid || loading}
          className="w-full h-12 rounded-xl bg-wasla-accent text-wasla-bg font-extrabold hover:bg-wasla-primary-light disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Create account"}
        </Button>
      </div>

      <p className="text-center text-sm text-wasla-text-secondary mt-6">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-wasla-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
