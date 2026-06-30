"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCircle, LogOut, Mail, Phone, Fingerprint } from "lucide-react";
import { useAuthStore } from "@/store";
import { forceLogout } from "@/lib/authLifecycle";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const navigateBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    await forceLogout("user_initiated");
  }, []);

  const displayName = user?.name?.trim() || "Account";
  const email = user?.email?.trim() || "—";
  const phone = user?.phone?.trim() || "—";
  const userId = user?.id ?? "—";

  return (
    <div className="flex min-h-dvh flex-col bg-wasla-bg">
      {/* Screen glow */}
      <div
        className="pointer-events-none absolute top-[-60px] right-[-28px] h-[220px] w-[220px] rounded-full opacity-[0.28]"
        style={{ backgroundColor: "rgba(212,168,83,0.14)" }}
      />

      <div className="mx-auto w-full max-w-screen-sm flex-1 px-5 pt-16 pb-32">
        {/* Back button */}
        <button
          type="button"
          onClick={navigateBack}
          className="mb-3.5 inline-flex items-center gap-2 self-start rounded-xl border border-wasla-border-strong bg-wasla-surface-elevated px-3.5 py-2.5 transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={20} className="text-wasla-text-primary" />
          <span className="text-sm font-bold text-wasla-text-primary">Back</span>
        </button>

        {/* Title */}
        <h1 className="mb-1 text-[26px] font-extrabold tracking-tight text-wasla-text-primary">
          Settings
        </h1>
        <p className="mb-5 text-sm text-wasla-text-secondary">Account</p>

        {/* Profile card */}
        <div className="flex flex-col gap-4 rounded-2xl border border-wasla-border-strong bg-wasla-surface p-4">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-wasla-accent/20 bg-wasla-accent/10">
              <UserCircle size={28} className="text-wasla-primary" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-lg font-extrabold text-wasla-text-primary">
                {displayName}
              </p>
              <p className="text-xs text-wasla-text-muted">Signed in</p>
            </div>
          </div>

          <div className="mx-[-4px] h-px bg-wasla-border" />

          {/* Info rows */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-wasla-text-muted" />
                <span className="text-xs font-semibold text-wasla-text-muted">
                  Email
                </span>
              </div>
              <span className="max-w-[60%] truncate text-right text-xs font-semibold text-wasla-text-primary">
                {email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-wasla-text-muted" />
                <span className="text-xs font-semibold text-wasla-text-muted">
                  Phone
                </span>
              </div>
              <span className="text-xs font-semibold text-wasla-text-primary">
                {phone}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} className="text-wasla-text-muted" />
                <span className="text-xs font-semibold text-wasla-text-muted">
                  User ID
                </span>
              </div>
              <span className="max-w-[50%] truncate text-right text-xs font-medium text-wasla-text-secondary">
                {userId}
              </span>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] py-4 transition-colors hover:bg-[rgba(239,68,68,0.18)]"
        >
          <LogOut size={20} className="text-[#FF5C7A]" />
          <span className="text-sm font-extrabold text-[#FF5C7A]">Log out</span>
        </button>
      </div>
    </div>
  );
}
