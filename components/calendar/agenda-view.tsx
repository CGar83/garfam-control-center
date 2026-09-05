"use client";

import { format, isSameDay } from "date-fns";
import { CalendarPlus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/daily-brief";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgendaRow } from "./agenda-chip";
import { dayKey, relativeDayLabel } from "./helpers";

interface AgendaViewProps {
  days: Date[];
  today: Date;
  byDay: Map<string, AgendaItem[]>;
  conflicts: Set<string>;
  members: FamilyMember[];
  onSelectDay: (day: Date) => void;
  onSelectItem: (item: AgendaItem, day: Date) => void;
  onAdd?: (day: Date) => void;
}

/** The next two weeks as a readable list; quiet days are skipped except today. */
export function AgendaView({ days, today, byDay, conflicts, members, onSelectDay, onSelectItem, onAdd }: AgendaViewProps) {
  const sections = days
    .map((day) => ({ day, items: byDay.get(dayKey(day)) ?? [], isToday: isSameDay(day, today) }))
    .filter((section) => section.items.length > 0 || section.isToday);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 px-6 py-12 text-center">
        <Coffee className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-base font-semibold">A quiet couple of weeks</p>
        <p className="max-w-sm text-sm text-muted-foreground">Nothing is planned in this stretch. Enjoy it, or add something worth looking forward to.</p>
        {onAdd ? (
          <Button onClick={() => onAdd(days[0] ?? today)}>
            <CalendarPlus className="h-4 w-4" />
            Add event
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map(({ day, items, isToday }) => (
        <section key={day.toISOString()} aria-label={format(day, "EEEE, MMMM d")}>
          <button
            type="button"
            onClick={() => onSelectDay(day)}
            className="sticky top-[4.25rem] z-10 -mx-1 mb-2 flex w-[calc(100%+0.5rem)] items-baseline gap-2 rounded-xl bg-background/85 px-2 py-1.5 text-left backdrop-blur-md transition-colors hover:bg-muted/60 focus-ring"
            aria-label={`Open ${format(day, "EEEE, MMMM d")}`}
          >
            <span className={cn("text-base font-semibold", isToday && "text-primary")}>{relativeDayLabel(day, today)}</span>
            <span className="text-sm text-muted-foreground">{format(day, "EEEE, MMMM d")}</span>
            <span className="ml-auto text-xs font-medium text-muted-foreground">{items.length > 0 ? `${items.length} ${items.length === 1 ? "item" : "items"}` : ""}</span>
          </button>
          {items.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Nothing planned today.</p>
                <p className="text-xs text-muted-foreground">Enjoy the breathing room.</p>
              </div>
              {onAdd ? (
                <Button variant="outline" size="sm" onClick={() => onAdd(day)}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Add event
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <AgendaRow key={`${item.kind}-${item.id}`} item={item} members={members} conflict={conflicts.has(item.id)} onClick={() => onSelectItem(item, day)} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
