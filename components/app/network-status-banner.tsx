"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/app/providers";

function getOnlineStatus() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);
  const { pendingSyncCount, syncQueuedChanges, syncingQueuedChanges, usingLocalData } = useAppData();

  useEffect(() => {
    setOnline(getOnlineStatus());

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && pendingSyncCount === 0) return null;

  if (online) {
    return (
      <div className="border-b border-primary/20 bg-accent/20 px-4 py-2 text-sm text-accent-foreground backdrop-blur-xl dark:border-primary/20 dark:bg-accent/10 dark:text-accent-foreground lg:px-6">
        <div className="mx-auto flex max-w-[var(--app-page-max)] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{pendingSyncCount} queued cloud change{pendingSyncCount === 1 ? "" : "s"} ready to sync.</p>
          <Button size="sm" variant="outline" className="border-primary/20 bg-white/55 text-accent-foreground hover:bg-white dark:bg-white/10 dark:text-accent-foreground" onClick={() => void syncQueuedChanges()} disabled={syncingQueuedChanges}>
            <RefreshCcw className={`h-3.5 w-3.5 ${syncingQueuedChanges ? "animate-spin" : ""}`} />
            {syncingQueuedChanges ? "Syncing" : "Sync Now"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-primary/20 bg-accent/25 px-4 py-2 text-sm text-accent-foreground backdrop-blur-xl dark:border-primary/20 dark:bg-accent/10 dark:text-accent-foreground lg:px-6">
      <div className="mx-auto flex max-w-[var(--app-page-max)] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are offline.{" "}
            {usingLocalData
              ? "Local changes stay on this device."
              : pendingSyncCount
                ? `${pendingSyncCount} cloud change${pendingSyncCount === 1 ? "" : "s"} will sync when you reconnect.`
                : "Cloud saves will queue on this device until your connection returns."}
          </p>
        </div>
        <Button size="sm" variant="outline" className="border-primary/20 bg-white/55 text-accent-foreground hover:bg-white dark:bg-white/10 dark:text-accent-foreground" onClick={() => window.location.reload()}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}
