"use client";

import { useEffect, useRef } from "react";
import { useAppData } from "@/components/app/providers";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

export function GoogleSyncBridge() {
  useRealtimeTable("events");
  const { familyId, currentMember, usingLocalData } = useAppData();
  return (
    <>
      {!usingLocalData && <CalendarRefresh key={familyId} />}
      {!usingLocalData &&
      currentMember &&
      ["admin", "parent"].includes(currentMember.role) ? (
        <Bridge key={`${familyId}:${currentMember.id}`} />
      ) : null}
    </>
  );
}

// DELETE notifications cannot be family-filtered by Supabase Realtime.
// Reconcile a complete, family-scoped snapshot without replacing newer local edits.
function CalendarRefresh() {
  const { familyId, supabase, data, applyRealtimeChange, pendingSyncCount } =
    useAppData();
  const latest = useRef({ events: data.events, pendingSyncCount });
  latest.current = { events: data.events, pendingSyncCount };
  useEffect(() => {
    let active = true,
      running = false;
    const refresh = async () => {
      if (
        !supabase ||
        !active ||
        running ||
        document.visibilityState === "hidden" ||
        latest.current.pendingSyncCount
      )
        return;
      running = true;
      const before = latest.current.events;
      try {
        const result = await supabase
          .from("events")
          .select("*", { count: "exact" })
          .eq("family_id", familyId)
          .limit(1001);
        if (
          !active ||
          result.error ||
          !result.data ||
          result.count === null ||
          result.count !== result.data.length ||
          result.count > 1000 ||
          latest.current.pendingSyncCount
        )
          return;
        const incoming = new Map(result.data.map((row) => [row.id, row]));
        for (const row of result.data) {
          const current = latest.current.events.find(
            (item) => item.id === row.id,
          );
          const original = before.find((item) => item.id === row.id);
          if (current?.updated_at !== original?.updated_at) continue;
          if (
            !current ||
            new Date(row.updated_at) >= new Date(current.updated_at)
          )
            applyRealtimeChange("events", "UPDATE", row);
        }
        for (const row of before) {
          const current = latest.current.events.find(
            (item) => item.id === row.id,
          );
          if (
            !incoming.has(row.id) &&
            current?.updated_at === row.updated_at &&
            Date.now() - new Date(row.updated_at).getTime() > 30000
          )
            applyRealtimeChange("events", "DELETE", null, { id: row.id });
        }
      } finally {
        running = false;
      }
    };
    const safelyRefresh = () => {
      void refresh().catch(() => undefined);
    };
    safelyRefresh();
    const timer = window.setInterval(safelyRefresh, 60000);
    window.addEventListener("focus", safelyRefresh);
    window.addEventListener("gather:google-sync-finished", safelyRefresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", safelyRefresh);
      window.removeEventListener("gather:google-sync-finished", safelyRefresh);
    };
  }, [familyId, supabase, applyRealtimeChange]);
  return null;
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
