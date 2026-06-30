"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { readStoredToken, readStoredUser } from "@/lib/sessionStorage";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/verify-email", "/privacy", "/terms", "/onboarding"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading, setToken, setUser, setLoading } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate auth state from localStorage on mount
    const token = readStoredToken();
    const user = readStoredUser();
    if (token) setToken(token);
    if (user) setUser(user);
    setLoading(false);
    setReady(true);
  }, [setToken, setUser, setLoading]);

  useEffect(() => {
    if (!ready || isLoading) return;

    if (!token && !isPublicPath(pathname)) {
      router.replace("/sign-in");
    } else if (token && isPublicPath(pathname)) {
      router.replace("/");
    }
  }, [token, isLoading, ready, pathname, router]);

  if (!ready || isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-wasla-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-wasla-primary border-t-transparent" />
          <span className="text-xs font-semibold tracking-[0.3em] text-wasla-text-secondary">WASLA</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
