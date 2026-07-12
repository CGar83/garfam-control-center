"use client";

import { useEffect } from "react";
import { useAppData } from "@/components/app/providers";
import type { TableName, TableRecord } from "@/lib/types";

export function useRealtimeTable<TTable extends TableName>(table: TTable) {
  const { data, supabase, familyId, usingDemoData, applyRealtimeChange } = useAppData();

  useEffect(() => {
    if (!supabase || usingDemoData || table === "families" || table === "activity_log") return;

    const channel = supabase
      .channel(`${table}:${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          applyRealtimeChange(
            table as never,
            payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            payload.new as never,
            payload.old as never
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyRealtimeChange, familyId, supabase, table, usingDemoData]);

  return data[table] as TableRecord<TTable>[];
}
