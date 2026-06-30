"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(8000, 500 * 2 ** attemptIndex),
            staleTime: 5000,
            gcTime: 5 * 60 * 1000,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#0B1424",
            color: "#F0F4FF",
            border: "1px solid rgba(212,168,83,0.15)",
            borderRadius: "12px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
