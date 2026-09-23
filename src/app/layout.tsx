import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppBackdrop } from "@/components/layout/app-backdrop";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Headings only. Body text, controls and tables stay on Arial (a system font,
 * so nothing is downloaded for them) — see `--font-sans` in globals.css. This
 * face is loaded purely to carry the display sizes, where its 700–800 cuts and
 * tighter letterforms do work Arial's two weights can't.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/** Tabular figures for IDs and unit numbers, where columns must line up. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RentFlow — Property Manager",
  description:
    "Track tenants, collect rent, manage documents — all in one clean, powerful dashboard built for property owners.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // next-themes writes the theme class onto <html> before hydration, so the
    // server and client markup differ by design here.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AppBackdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
