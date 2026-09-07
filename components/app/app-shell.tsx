"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppProviders, useAppData } from "@/components/app/providers";
import { AuthStatusBadge } from "@/components/app/auth-status-badge";
import { GlobalSearch } from "@/components/app/global-search";
import { InstallAppPrompt } from "@/components/app/install-app-prompt";
import { MemberSwitcher } from "@/components/app/member-switcher";
import { MobileNav } from "@/components/app/mobile-nav";
import { NetworkStatusBanner } from "@/components/app/network-status-banner";
import { NotificationCenter } from "@/components/app/notification-center";
import { PwaBoot } from "@/components/app/pwa-boot";
import { QuickAddMenu } from "@/components/app/quick-add-menu";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { SyncStatusPill } from "@/components/app/sync-status-pill";
import { ToastViewport } from "@/components/app/toast-viewport";
import { useFamily } from "@/hooks/use-family";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useTheme } from "@/hooks/use-theme";
import { blockedSectionForPath, memberCanAccessSection } from "@/lib/access-control";
import { ONBOARDING_KEY, LOCAL_STORE_KEY } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

const bareRoutes = new Set(["/welcome", "/offline"]);

function useOnboardingGate(pathname: string) {
  const router = useRouter();
  const { supabaseConfigured, loading } = useAppData();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading || checked) return;
    // Cloud users get the sign-in gate instead; onboarding is for the local-first path.
    if (supabaseConfigured) {
      setChecked(true);
      return;
    }
    const onboarded = localStorage.getItem(ONBOARDING_KEY) === "true";
    const hasExistingData = Boolean(localStorage.getItem(LOCAL_STORE_KEY));
    if (!onboarded && hasExistingData) {
      // Existing users who predate onboarding should not be forced through it.
      localStorage.setItem(ONBOARDING_KEY, "true");
    } else if (!onboarded && pathname !== "/welcome") {
      router.replace("/welcome");
    }
    setChecked(true);
  }, [checked, loading, pathname, router, supabaseConfigured]);
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  const { theme, setTheme } = useTheme();
  const { currentMember, supabaseConfigured, usingLocalData } = useFamily();
  const pathname = usePathname();
  useOnboardingGate(pathname);

  if (bareRoutes.has(pathname)) {
    return (
      <div className="min-h-screen">
        {children}
        <ToastViewport />
        <PwaBoot />
      </div>
    );
  }

  const blockedSection = blockedSectionForPath(pathname);
  const profileRestricted = !memberCanAccessSection(currentMember, blockedSection);
  const showAccessGate = (supabaseConfigured && usingLocalData && pathname !== "/settings") || profileRestricted;
  const accessGateTitle = profileRestricted ? "Grown-ups only" : "Private family workspace";
  const accessGateDescription = profileRestricted
    ? `${titleCase(blockedSection ?? "This area")} is hidden for this profile. Ask a parent to switch profiles or update access.`
    : "Sign in to continue to your family hub.";

  return (
    <div className="min-h-screen bg-transparent">
      <SidebarNav />
      <div className="lg:pl-72">
        <header className="app-header sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-2xl">
          <div className="mx-auto flex min-h-16 w-full max-w-[var(--app-page-max)] items-center justify-between gap-3 px-[var(--app-gutter)] py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <MemberSwitcher />
              <GlobalSearch />
            </div>
            <div className="app-toolbar shrink-0 justify-end">
              <AuthStatusBadge className="hidden xl:inline-flex" />
              <SyncStatusPill className="hidden sm:inline-flex" />
              <NotificationCenter />
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => setPrivacyMode(!privacyMode)} title="Toggle privacy mode">
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle privacy mode</span>
              </Button>
              <Button variant="outline" size="icon" className="hidden rounded-full sm:inline-flex" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <QuickAddMenu />
            </div>
          </div>
        </header>
        <NetworkStatusBanner />
        <InstallAppPrompt />
        <main className="min-h-[calc(100vh-4rem)] px-[var(--app-gutter)] py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:py-7 lg:pb-10">
          {showAccessGate ? (
            <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
              <div className="apple-elevated w-full max-w-md rounded-[1.5rem] p-7 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ACE1AF]/45 text-[#22552d]">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-normal">{accessGateTitle}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{accessGateDescription}</p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild variant="outline">
                    <Link href="/today">Back to Today</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/settings">{profileRestricted ? "Open Settings" : "Sign in"}</Link>
                  </Button>
                </div>
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
