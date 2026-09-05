"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import type { AgendaItem } from "@/lib/daily-brief";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgendaChip, itemPalette } from "./agenda-chip";
import { dayKey } from "./helpers";

const weekdays = [
  { short: "S", long: "Sun" },
  { short: "M", long: "Mon" },
  { short: "T", long: "Tue" },
  { short: "W", long: "Wed" },
  { short: "T", long: "Thu" },
  { short: "F", long: "Fri" },
  { short: "S", long: "Sat" }
];

const MAX_CHIPS = 3;
const MAX_DOTS = 4;

interface MonthViewProps {
  days: Date[];
  anchor: Date;
  today: Date;
  byDay: Map<string, AgendaItem[]>;
  members: FamilyMember[];
  onSelectDay: (day: Date) => void;
  onSelectItem: (item: AgendaItem, day: Date) => void;
}

export function MonthView({ days, anchor, today, byDay, members, onSelectDay, onSelectItem }: MonthViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-white/60 dark:bg-white/5">
      <div className="grid grid-cols-7 border-b border-border/80 bg-muted/40 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {weekdays.map((day, index) => (
          <div key={`${day.long}-${index}`} className="py-2">
            <span className="md:hidden">{day.short}</span>
            <span className="hidden md:inline">{day.long}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = byDay.get(dayKey(day)) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, today);
          const overflow = items.length - MAX_CHIPS;
          const dotOverflow = items.length - MAX_DOTS;
          const label = `${format(day, "EEEE, MMMM d")}: ${items.length === 0 ? "nothing planned" : `${items.length} ${items.length === 1 ? "item" : "items"}`}`;

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => onSelectDay(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={cn(
                "group relative flex min-h-[4.5rem] cursor-pointer flex-col gap-1 border-b border-r border-border/60 p-1 text-left transition-colors hover:bg-primary/5 focus-ring md:min-h-[7.25rem] md:p-1.5",
                "[&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                !inMonth && "bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                    isToday ? "font-bold text-primary ring-2 ring-primary" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
                {items.length > 0 ? (
                  <span className="hidden text-[10px] font-medium text-muted-foreground md:inline" aria-hidden>
                    {items.length}
                  </span>
                ) : null}
              </div>

              <div className={cn("hidden flex-col gap-0.5 md:flex", !inMonth && "opacity-60")}>
                {items.slice(0, MAX_CHIPS).map((item) => (
                  <AgendaChip key={`${item.kind}-${item.id}`} item={item} members={members} onClick={() => onSelectItem(item, day)} />
                ))}
                {overflow > 0 ? (
                  <span className="px-1.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">+{overflow} more</span>
                ) : null}
              </div>

              <div className={cn("mt-auto flex flex-wrap items-center gap-0.5 px-0.5 pb-0.5 md:hidden", !inMonth && "opacity-60")} aria-hidden>
                {items.slice(0, MAX_DOTS).map((item) => (
                  <span
                    key={`${item.kind}-${item.id}`}
                    className={cn("h-1.5 w-1.5 rounded-full", item.done && "opacity-40")}
                    style={{ backgroundColor: itemPalette(item, members).solid }}
                  />
                ))}
                {dotOverflow > 0 ? <span className="text-[9px] font-semibold leading-none text-muted-foreground">+{dotOverflow}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
