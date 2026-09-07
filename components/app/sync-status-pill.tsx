"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/app/providers";
import { cn } from "@/lib/utils";

function onlineNow() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function SyncStatusPill({ className }: { className?: string }) {
  const { pendingSyncCount, syncingQueuedChanges, lastSyncError, syncQueuedChanges, usingLocalData, supabaseConfigured } = useAppData();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(onlineNow());

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

  if (!supabaseConfigured || usingLocalData) return null;
  if (online && pendingSyncCount === 0 && !syncingQueuedChanges && !lastSyncError) return null;

  const state = !online
    ? {
        label: pendingSyncCount ? `${pendingSyncCount} queued` : "Offline",
        icon: CloudOff,
        className: "border-[#ACE1AF]/70 bg-[#ACE1AF]/20 text-[#22552d] dark:text-[#D7F2D9]"
      }
    : lastSyncError
      ? {
          label: "Sync issue",
          icon: AlertCircle,
          className: "border-destructive/40 bg-destructive/10 text-destructive"
        }
      : syncingQueuedChanges
        ? {
            label: "Syncing",
            icon: RefreshCw,
            className: "border-primary/30 bg-primary/10 text-primary"
          }
        : {
            label: `${pendingSyncCount} pending`,
            icon: Cloud,
            className: "border-[#ACE1AF]/70 bg-[#ACE1AF]/20 text-[#22552d] dark:text-[#D7F2D9]"
          };
  const Icon = state.icon;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void syncQueuedChanges()}
      disabled={!online || syncingQueuedChanges || pendingSyncCount === 0}
      className={cn("h-9 rounded-full px-3 text-xs", state.className, className)}
      title={lastSyncError ?? (pendingSyncCount ? "Sync queued changes" : "Cloud sync status")}
    >
      <Icon className={cn("h-3.5 w-3.5", syncingQueuedChanges && "animate-spin")} />
      <span>{state.label}</span>
    </Button>
  );
}
