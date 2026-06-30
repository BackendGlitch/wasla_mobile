import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/chrome";
import { AuthGuard } from "@/components/auth-guard";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Wasla — Intercity Travel",
  description: "Book bus tickets across Tunisia. Seamless intercity travel companion.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} dark h-full`} suppressHydrationWarning>
      <body className="h-full bg-wasla-bg text-wasla-text-primary antialiased">
        <Providers>
          <AuthGuard>
            <AppChrome>{children}</AppChrome>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
