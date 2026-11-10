"use client";

import { useEffect } from "react";
import { useAppData } from "@/components/app/providers";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

export function GoogleSyncBridge() {
  useRealtimeTable("events");
  const { familyId, currentMember, usingLocalData } = useAppData();
  if (
    usingLocalData ||
    !currentMember ||
    !["admin", "parent"].includes(currentMember.role)
  )
    return null;
  return <Bridge key={`${familyId}:${currentMember.id}`} />;
}
function Bridge() {
  const { familyId, supabase } = useAppData();
  useEffect(() => {
    let active = true,
      running = false,
      next = 0;
    const run = async () => {
      if (
        !active ||
        running ||
        document.visibilityState === "hidden" ||
        Date.now() < next
      )
        return;
      running = true;
      next = Date.now() + 60000;
      try {
        const session = await supabase?.auth.getSession();
        if (!session?.data.session || !active) return;
        const headers = {
          Authorization: `Bearer ${session.data.session.access_token}`,
          "Content-Type": "application/json",
        };
        const status = await fetch(
          `/api/calendar/google?family_id=${encodeURIComponent(familyId)}`,
          { headers, cache: "no-store" },
        );
        if (!status.ok || !active) return;
        const metadata = await status.json();
        if (
          !metadata.connection ||
          !["ready", "error"].includes(metadata.connection.status)
        )
          return;
        await fetch("/api/calendar/google", {
          method: "POST",
          headers,
          cache: "no-store",
          body: JSON.stringify({ action: "sync", family_id: familyId }),
        });
        if (active)
          window.dispatchEvent(new Event("gather:google-sync-finished"));
      } catch {
        /* The connection panel displays persisted worker errors. */
      } finally {
        running = false;
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 60000);
    const trigger = () => {
      next = 0;
      void run();
    };
    window.addEventListener("gather:google-sync", trigger);
    window.addEventListener("focus", run);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("gather:google-sync", trigger);
      window.removeEventListener("focus", run);
    };
  }, [familyId, supabase]);
  return null;
}
