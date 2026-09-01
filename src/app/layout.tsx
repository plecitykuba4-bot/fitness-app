import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { DevSwitcher } from "@/components/shared/dev-switcher";

export const metadata: Metadata = {
  title: "Fitness trenér",
  description: "Tréninkové plány, workouty a pokrok na jednom místě.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Uživatel musí mít možnost text zvětšit — nikdy nenastavuj maximumScale.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body>
        <Script id="fitness-theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("fitness-theme")==="dark")document.documentElement.classList.add("dark")}catch{}`}
        </Script>
        {/* Vývojová pomůcka — v produkci se nevykreslí. */}
        <DevSwitcher />
        {children}
      </body>
    </html>
  );
}
