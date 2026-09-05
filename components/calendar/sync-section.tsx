"use client";

import { forwardRef, useId } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarSyncPanel } from "@/components/app/calendar-sync-panel";
import { useAppData } from "@/components/app/providers";
import { cn } from "@/lib/utils";

interface SyncSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Collapsible home for ICS export/import and provider connections. Hidden for kids. */
export const SyncSection = forwardRef<HTMLDivElement, SyncSectionProps>(function SyncSection({ open, onOpenChange }, ref) {
  const { data, currentMember } = useAppData();
  const contentId = useId();
  if (currentMember?.role === "viewer") return null;

  const connections = data.calendar_connections.length;

  return (
    <div ref={ref} className="scroll-mt-20">
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center gap-4 p-[var(--app-card-padding)] text-left transition-colors hover:bg-muted/40 focus-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ACE1AF]/40 text-[#235226] dark:bg-[#ACE1AF]/20 dark:text-[#D7F2D9]">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Sync &amp; import</span>
            <span className="block text-sm text-muted-foreground">
              Export an ICS for Google, Apple, or Outlook, or import one to bring your existing schedule here.
              {connections > 0 ? ` ${connections} ${connections === 1 ? "connection" : "connections"} saved.` : ""}
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden />
        </button>
        {open ? (
          <CardContent id={contentId} className="border-t border-border/70 pt-5">
            <CalendarSyncPanel />
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
});
