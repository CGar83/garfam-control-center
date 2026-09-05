"use client";

import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppProviders } from "@/components/app/providers";
import { AuthStatusBadge } from "@/components/app/auth-status-badge";
import { GlobalSearch } from "@/components/app/global-search";
import { MobileNav } from "@/components/app/mobile-nav";
import { NetworkStatusBanner } from "@/components/app/network-status-banner";
import { NotificationCenter } from "@/components/app/notification-center";
import { PwaBoot } from "@/components/app/pwa-boot";
import { QuickAddMenu } from "@/components/app/quick-add-menu";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { ToastViewport } from "@/components/app/toast-viewport";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useTheme } from "@/hooks/use-theme";

function ShellContent({ children }: { children: React.ReactNode }) {
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-transparent">
      <SidebarNav />
      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/70 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] backdrop-blur-2xl">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <AuthStatusBadge className="hidden sm:inline-flex" />
              <NotificationCenter />
              <Button variant="outline" size="icon" onClick={() => setPrivacyMode(!privacyMode)} title="Toggle privacy mode">
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle privacy mode</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <QuickAddMenu />
            </div>
          </div>
        </header>
        <NetworkStatusBanner />
        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-6 md:pb-8">{children}</main>
      </div>
      <MobileNav />
      <ToastViewport />
      <PwaBoot />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <ShellContent>{children}</ShellContent>
    </AppProviders>
  );
}
