"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFamily } from "@/hooks/use-family";

function getOnlineStatus() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);
  const { usingLocalData } = useFamily();

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

  if (online) return null;

  return (
    <div className="border-b border-[#ACE1AF]/60 bg-[#ACE1AF]/25 px-4 py-2 text-sm text-[#235226] backdrop-blur-xl dark:border-[#ACE1AF]/30 dark:bg-[#ACE1AF]/10 dark:text-[#D7F2D9] lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are offline. {usingLocalData ? "Local changes stay on this device." : "Cloud saves are paused until your connection returns."}
          </p>
        </div>
        <Button size="sm" variant="outline" className="border-[#ACE1AF]/80 bg-white/55 text-[#235226] hover:bg-white dark:bg-white/10 dark:text-[#D7F2D9]" onClick={() => window.location.reload()}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}
