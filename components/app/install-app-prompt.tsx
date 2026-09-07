"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_PROMPT_DISMISSED_KEY } from "@/lib/constants";
import { getInstallGuidance, type InstallGuidance } from "@/lib/pwa";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_MS = 1000 * 60 * 60 * 24 * 14;

function dismissedRecently() {
  const value = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
  const dismissedAt = value ? Number(value) : 0;
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
}

function readInstallGuidance(hasNativePrompt: boolean): InstallGuidance {
  return getInstallGuidance({
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints,
    standaloneDisplay: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
    hasNativePrompt
  });
}

export function InstallAppPrompt() {
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [guidance, setGuidance] = useState<InstallGuidance | null>(null);

  useEffect(() => {
    setDismissed(dismissedRecently());
    setGuidance(readInstallGuidance(false));
    setReady(true);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(promptEvent);
      setGuidance(readInstallGuidance(true));
    }

    function handleInstalled() {
      setInstallEvent(null);
      setGuidance(readInstallGuidance(false));
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, String(Date.now()));
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const mobileRelevant = useMemo(() => {
    if (!guidance) return false;
    return guidance.platform === "ios" || guidance.platform === "android" || (typeof window !== "undefined" && window.innerWidth < 820);
  }, [guidance]);

  if (!ready || dismissed || !guidance || guidance.installed || !mobileRelevant) return null;

  async function install() {
    if (!installEvent) {
      setStepsOpen(true);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, String(Date.now()));
      setDismissed(true);
    }
  }

  function dismiss() {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  }

  const Icon = guidance.platform === "ios" ? Share : Download;

  return (
    <section className="px-[var(--app-gutter)] pt-3 lg:hidden" aria-label="Install Gather">
      <div className="mx-auto max-w-[var(--app-page-max)] rounded-[1.25rem] border border-[#ACE1AF]/80 bg-white/90 p-3 shadow-[var(--shadow-subtle)] backdrop-blur-2xl dark:border-[#ACE1AF]/30 dark:bg-card/92">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ACE1AF]/45 text-[#22552d] dark:text-[#D7F2D9]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{guidance.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{guidance.description}</p>
              </div>
              <button type="button" onClick={dismiss} className="rounded-full p-1 text-muted-foreground hover:bg-muted focus-ring" aria-label="Dismiss install prompt">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={install}>
                <Icon className="h-3.5 w-3.5" />
                {guidance.canPrompt ? "Install" : "Show Steps"}
              </Button>
              <Button size="sm" variant="outline" onClick={dismiss}>
                Later
              </Button>
            </div>
            {stepsOpen ? (
              <ol className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                {guidance.steps.map((step, index) => (
                  <li key={step} className={cn("flex gap-2", index === 0 && "text-foreground")}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
