"use client";

import { format, isSameDay } from "date-fns";
import type { AgendaItem } from "@/lib/daily-brief";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgendaChip } from "./agenda-chip";
import { dayKey, relativeDayLabel } from "./helpers";

interface WeekViewProps {
  days: Date[];
  today: Date;
  byDay: Map<string, AgendaItem[]>;
  conflicts: Set<string>;
  members: FamilyMember[];
  onSelectDay: (day: Date) => void;
  onSelectItem: (item: AgendaItem, day: Date) => void;
}

/** Seven columns on tablets and up; a vertical run of day cards on phones. */
export function WeekView({ days, today, byDay, conflicts, members, onSelectDay, onSelectItem }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7 md:gap-2">
      {days.map((day) => {
        const items = byDay.get(dayKey(day)) ?? [];
        const isToday = isSameDay(day, today);
        const summary = items.length === 0 ? "Free" : `${items.length} ${items.length === 1 ? "thing" : "things"}`;

        return (
          <section
            key={day.toISOString()}
            className={cn(
              "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white/60 transition-colors dark:bg-white/5",
              isToday ? "border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]" : "border-border/80"
            )}
            aria-label={format(day, "EEEE, MMMM d")}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-primary/5 focus-ring md:flex-col md:items-center md:gap-1 md:py-2.5"
              aria-label={`Open ${format(day, "EEEE, MMMM d")}`}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                  isToday ? "bg-primary text-primary-foreground shadow-[var(--brand-glow)]" : "bg-muted/60 text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <span className="min-w-0 flex-1 md:flex-none md:text-center">
                <span className={cn("block text-sm font-semibold md:text-[11px] md:uppercase md:tracking-wide", isToday ? "text-primary" : "text-foreground md:text-muted-foreground")}>
                  <span className="md:hidden">{relativeDayLabel(day, today)}</span>
                  <span className="hidden md:inline">{format(day, "EEE")}</span>
                </span>
                <span className="block text-xs text-muted-foreground md:hidden">{format(day, "MMMM d")}</span>
              </span>
              <span className="text-xs font-medium text-muted-foreground md:hidden">{summary}</span>
            </button>

            <div className="flex flex-1 flex-col gap-1.5 p-1.5 md:min-h-[14rem]">
              {items.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground md:text-center">Nothing planned</p>
              ) : (
                items.map((item) => (
                  <AgendaChip
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    members={members}
                    layout="card"
                    conflict={conflicts.has(item.id)}
                    onClick={() => onSelectItem(item, day)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
