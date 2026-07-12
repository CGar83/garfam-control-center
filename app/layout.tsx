import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  applicationName: "Family Control Center",
  title: "Family Control Center",
  description: "A private family operating system for calendars, tasks, groceries, finances, health, home, school, and emergency planning.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/family-control.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Family Center",
    statusBarStyle: "black-translucent",
    startupImage: ["/icons/apple-touch-icon.png"]
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Family Center"
  }
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d1f" }
  ],
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
