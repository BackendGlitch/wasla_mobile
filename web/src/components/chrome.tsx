"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "/", label: "Home", icon: Home },
  { key: "/history", label: "History", icon: Clock },
  { key: "/settings", label: "Settings", icon: MoreHorizontal },
];

/** Show tab bar on these paths; hide on auth, onboarding, booking, payment, ticket */
const TAB_PATHS = new Set(["/", "/history", "/settings"]);

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = TAB_PATHS.has(pathname);

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-screen-sm mx-auto w-full">
      {/* Main content */}
      <main className="flex-1 pb-28">{children}</main>

      {/* Bottom tab bar */}
      {showTabs && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-5 pb-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-wasla-border bg-[#0B1424]/95 px-1 py-1 shadow-lg shadow-black/40 backdrop-blur-xl w-full max-w-xs">
            {tabs.map((tab) => {
              const isActive = tab.key === "/" ? pathname === "/" : pathname.startsWith(tab.key);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.key}
                  href={tab.key}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors",
                    isActive
                      ? "text-wasla-primary"
                      : "text-wasla-text-muted hover:text-wasla-text-secondary"
                  )}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={isActive ? "text-wasla-primary" : ""}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium tracking-wide",
                      isActive ? "font-bold text-wasla-primary" : ""
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 h-0.5 w-5 rounded-full bg-wasla-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
