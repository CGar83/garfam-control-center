"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Download, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/app/providers";
import { getInstallGuidance, type InstallGuidance } from "@/lib/pwa";

type PermissionState = "granted" | "denied" | "default" | "unsupported";

function notificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function readGuidance(): InstallGuidance {
  return getInstallGuidance({
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints,
    standaloneDisplay: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
    hasNativePrompt: false
  });
}

export function MobileAppPreferences() {
  const { pendingSyncCount, syncingQueuedChanges, lastSyncError, syncQueuedChanges, usingLocalData, supabaseConfigured } = useAppData();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [guidance, setGuidance] = useState<InstallGuidance | null>(null);

  useEffect(() => {
    setPermission(notificationPermission());
    setGuidance(readGuidance());
  }, []);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      new Notification("Gather notifications are on", {
        body: "Device alerts are enabled on this device.",
        icon: "/icons/icon-192.png"
      });
    }
  }

  const syncLabel = !supabaseConfigured
    ? "Local device workspace"
    : usingLocalData
      ? "Sign in required"
      : pendingSyncCount
        ? `${pendingSyncCount} queued cloud change${pendingSyncCount === 1 ? "" : "s"}`
        : "Cloud sync ready";

  return (
    <div className="grid gap-3">
      <div className="record-tile flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ACE1AF]/45 text-[#22552d] dark:text-[#D7F2D9]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Installed App</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {guidance?.installed ? "Running from the Home Screen." : "Use Add to Home Screen for the full-screen mobile app view."}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border/80 bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          {guidance?.installed ? "Installed" : "Available"}
        </span>
      </div>

      <div className="record-tile flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Offline Sync</p>
            <p className="mt-1 text-xs text-muted-foreground">{lastSyncError ? `Last issue: ${lastSyncError}` : syncLabel}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void syncQueuedChanges()} disabled={usingLocalData || pendingSyncCount === 0 || syncingQueuedChanges}>
          {syncingQueuedChanges ? "Syncing" : "Sync"}
        </Button>
      </div>

      <div className="record-tile flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Device Alerts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {permission === "granted"
                ? "Notifications are allowed on this device."
                : permission === "denied"
                  ? "Notifications are blocked in browser or system settings."
                  : permission === "unsupported"
                    ? "This browser does not support device alerts here."
                    : "Allow device alerts for reminders and family updates."}
            </p>
          </div>
        </div>
        {permission === "granted" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#ACE1AF]/70 bg-[#ACE1AF]/25 px-2.5 py-1 text-xs font-medium text-[#22552d] dark:text-[#D7F2D9]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            On
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={requestNotifications} disabled={permission === "denied" || permission === "unsupported"}>
            <Download className="h-3.5 w-3.5" />
            Allow
          </Button>
        )}
      </div>
    </div>
  );
}
