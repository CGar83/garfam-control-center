"use client";

import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/daily-brief";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgendaChip, AgendaRow } from "./agenda-chip";

const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, index) => FIRST_HOUR + index);

interface DayViewProps {
  day: Date;
  today: Date;
  items: AgendaItem[];
  conflicts: Set<string>;
  members: FamilyMember[];
  onSelectItem: (item: AgendaItem, day: Date) => void;
  onAddAt?: (hour: number) => void;
}

function hourLabel(hour: number) {
  const date = new Date(2000, 0, 1, hour);
  return format(date, "h a").toLowerCase();
}

/** All-day strip on top, then an hour-by-hour timeline from 6am to 10pm. */
export function DayView({ day, today, items, conflicts, members, onSelectItem, onAddAt }: DayViewProps) {
  const isToday = isSameDay(day, today);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [isToday]);

  const allDay = items.filter((item) => !item.at);
  const timed = items.filter((item) => item.at);
  const early = timed.filter((item) => (item.at as Date).getHours() < FIRST_HOUR);
  const late = timed.filter((item) => (item.at as Date).getHours() > LAST_HOUR);
  const byHour = new Map<number, AgendaItem[]>();
  for (const item of timed) {
    const hour = (item.at as Date).getHours();
    if (hour < FIRST_HOUR || hour > LAST_HOUR) continue;
    byHour.set(hour, [...(byHour.get(hour) ?? []), item]);
  }

  const renderItems = (list: AgendaItem[]) =>
    list.map((item) => (
      <AgendaChip
        key={`${item.kind}-${item.id}`}
        item={item}
        members={members}
        layout="card"
        conflict={conflicts.has(item.id)}
        onClick={() => onSelectItem(item, day)}
        className="max-w-xl"
      />
    ));

  const renderRow = (label: string, list: AgendaItem[], hour: number | null) => {
    const nowInRow = isToday && hour !== null && now.getHours() === hour;
    const nowOffset = nowInRow ? `${(now.getMinutes() / 60) * 100}%` : undefined;
    return (
      <div key={label} className={cn("group relative grid min-h-[3.25rem] grid-cols-[3.5rem_minmax(0,1fr)] border-t border-border/60", nowInRow && "bg-primary/[0.04]")}>
        <div className="px-2 pt-2 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">{label}</div>
        <div className="flex min-w-0 flex-col gap-1.5 py-1.5 pr-2">
          {list.length > 0 ? (
            renderItems(list)
          ) : onAddAt && hour !== null ? (
            <button
              type="button"
              onClick={() => onAddAt(hour)}
              className="flex h-full min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground/60 transition-colors hover:bg-primary/5 hover:text-primary focus-ring"
              aria-label={`Add event at ${label}`}
            >
              <Plus className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />
              <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Add here</span>
            </button>
          ) : null}
        </div>
        {nowInRow ? (
          <div className="pointer-events-none absolute left-[3.5rem] right-0 flex items-center" style={{ top: nowOffset }} aria-hidden>
            <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[var(--brand-glow)]" />
            <span className="h-0.5 flex-1 bg-primary" />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border/80 bg-white/60 p-3 dark:bg-white/5" aria-label="All day">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sun className="h-3.5 w-3.5" aria-hidden />
          All day
          {allDay.length > 0 ? <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">{allDay.length}</span> : null}
        </div>
        {allDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">No all-day items.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {allDay.map((item) => (
              <AgendaRow key={`${item.kind}-${item.id}`} item={item} members={members} hideTime onClick={() => onSelectItem(item, day)} />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-white/60 dark:bg-white/5" aria-label="Schedule">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="flex items-center gap-2">
            {timed.length === 0 ? <span className="text-xs text-muted-foreground">Nothing on the clock. Nice.</span> : <span className="text-xs text-muted-foreground">{timed.length} timed</span>}
            {onAddAt ? (
              <Button variant="outline" size="sm" onClick={() => onAddAt(9)}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            ) : null}
          </div>
        </div>
        {early.length > 0 ? renderRow("Early", early, null) : null}
        {hours.map((hour) => renderRow(hourLabel(hour), byHour.get(hour) ?? [], hour))}
        {late.length > 0 ? renderRow("Late", late, null) : null}
      </section>
    </div>
  );
}
