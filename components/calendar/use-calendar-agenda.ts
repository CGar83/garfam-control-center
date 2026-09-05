"use client";

import { useMemo } from "react";
import { parseISO } from "date-fns";
import { agendaForMember, buildAgenda, type AgendaItem } from "@/lib/daily-brief";
import type { DataStore } from "@/lib/types";
import { type CalendarView, type LayerState, dayKey, daysBetween, findConflicts, kindIsVisible, rangeForView } from "./helpers";

/** Everything on one day after layer and member filters. */
export function agendaForDay(data: DataStore, day: Date, layers: LayerState, memberId: string | null, includeSensitive: boolean): AgendaItem[] {
  const items = buildAgenda(data, day, { includeSensitive }).filter((item) => kindIsVisible(item.kind, layers));
  return agendaForMember(items, memberId);
}

/**
 * The days a view shows around its anchor. Memoized on the range's start and
 * end keys so the array identity is stable while the range stays the same.
 */
export function useVisibleDays(view: CalendarView, anchor: Date) {
  const raw = rangeForView(view, anchor);
  const startKey = dayKey(raw.start);
  const endKey = dayKey(raw.end);
  return useMemo(() => {
    const start = parseISO(startKey);
    const end = parseISO(endKey);
    return { start, end, days: daysBetween(start, end) };
  }, [startKey, endKey]);
}

export interface RangeAgenda {
  byDay: Map<string, AgendaItem[]>;
  conflicts: Set<string>;
}

interface UseCalendarAgendaOptions {
  data: DataStore;
  days: Date[];
  layers: LayerState;
  memberId: string | null;
  includeSensitive: boolean;
}

/** Agenda for every visible day, computed once per range / data / filter combination. */
export function useCalendarAgenda({ data, days, layers, memberId, includeSensitive }: UseCalendarAgendaOptions): RangeAgenda {
  return useMemo(() => {
    const byDay = new Map<string, AgendaItem[]>();
    const conflicts = new Set<string>();
    for (const day of days) {
      const items = agendaForDay(data, day, layers, memberId, includeSensitive);
      byDay.set(dayKey(day), items);
      for (const id of findConflicts(items, data.events)) conflicts.add(id);
    }
    return { byDay, conflicts };
  }, [data, days, layers, memberId, includeSensitive]);
}
