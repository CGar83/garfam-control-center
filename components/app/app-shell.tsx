"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Moon, Sun } from "lucide-react";
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
import { useFamily } from "@/hooks/use-family";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useTheme } from "@/hooks/use-theme";

function ShellContent({ children }: { children: React.ReactNode }) {
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  const { theme, setTheme } = useTheme();
  const { supabaseConfigured, usingLocalData } = useFamily();
  const pathname = usePathname();
  const showAccessGate = supabaseConfigured && usingLocalData && pathname !== "/settings";

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
        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-6 md:pb-8">
          {showAccessGate ? (
            <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
              <div className="w-full max-w-md rounded-lg border bg-white/85 p-6 text-center shadow-[var(--shadow-subtle)] backdrop-blur-xl dark:bg-card/85">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#ACE1AF]/45 text-[#22552d]">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-normal">Private family workspace</h1>
                <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to your secure Family Control Center.</p>
                <Button asChild className="mt-5 w-full">
                  <Link href="/settings">Open Account Access</Link>
                </Button>
              </div>
            </section>
          ) : (
            children
          )}
        </main>
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
