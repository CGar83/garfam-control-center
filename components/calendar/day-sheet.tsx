"use client";

import { format } from "date-fns";
import { CalendarPlus, Clock, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AgendaItem } from "@/lib/daily-brief";
import type { FamilyMember } from "@/lib/types";
import { AgendaRow } from "./agenda-chip";
import { relativeDayLabel } from "./helpers";

interface DaySheetProps {
  day: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AgendaItem[];
  conflicts: Set<string>;
  members: FamilyMember[];
  today: Date;
  /** Return false when the item should not be interactive (e.g. kids cannot edit events). */
  canOpenItem: (item: AgendaItem) => boolean;
  onSelectItem: (item: AgendaItem) => void;
  onAdd?: () => void;
}

/** Everything on one day, timed first, then all-day. */
export function DaySheet({ day, open, onOpenChange, items, conflicts, members, today, canOpenItem, onSelectItem, onAdd }: DaySheetProps) {
  const timed = items.filter((item) => item.at);
  const allDay = items.filter((item) => !item.at);
  const summary =
    items.length === 0
      ? "Nothing planned. A rare gift."
      : [timed.length ? `${timed.length} timed` : null, allDay.length ? `${allDay.length} all-day` : null].filter(Boolean).join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-baseline gap-x-2">
            {day ? relativeDayLabel(day, today) : ""}
            <span className="text-base font-medium text-muted-foreground">{day ? format(day, "EEEE, MMMM d") : ""}</span>
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        {items.length > 0 ? (
          <div className="flex flex-col gap-4">
            {timed.length > 0 ? (
              <section aria-label="Scheduled">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Schedule
                </h3>
                <div className="flex flex-col gap-2">
                  {timed.map((item) => (
                    <AgendaRow
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      members={members}
                      conflict={conflicts.has(item.id)}
                      onClick={canOpenItem(item) ? () => onSelectItem(item) : undefined}
                    />
                  ))}
                </div>
              </section>
            ) : null}
            {allDay.length > 0 ? (
              <section aria-label="All day">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sun className="h-3.5 w-3.5" aria-hidden />
                  All day
                </h3>
                <div className="flex flex-col gap-2">
                  {allDay.map((item) => (
                    <AgendaRow key={`${item.kind}-${item.id}`} item={item} members={members} hideTime onClick={canOpenItem(item) ? () => onSelectItem(item) : undefined} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center">
            <p className="text-sm font-medium">Wide open.</p>
            <p className="mt-1 text-xs text-muted-foreground">{onAdd ? "Add something below, or leave it free on purpose." : "Nothing is scheduled for this day."}</p>
          </div>
        )}

        {onAdd ? (
          <DialogFooter className="sm:justify-start">
            <Button onClick={onAdd} className="w-full sm:w-auto">
              <CalendarPlus className="h-4 w-4" />
              Add event on this day
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
