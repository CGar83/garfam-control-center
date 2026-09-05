import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, CheckSquare, PartyPopper, Receipt, Sparkles, Stethoscope, Sunrise, Trophy, Utensils } from "lucide-react";
import type { AgendaItem, AgendaKind } from "@/lib/daily-brief";
import type { EventRecord } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day" | "agenda";

export const calendarViews: Array<{ key: CalendarView; label: string; short: string }> = [
  { key: "month", label: "Month", short: "M" },
  { key: "week", label: "Week", short: "W" },
  { key: "day", label: "Day", short: "D" },
  { key: "agenda", label: "Agenda", short: "A" }
];

export const VIEW_STORAGE_KEY = "gather-calendar-view";
export const LAYERS_STORAGE_KEY = "gather-calendar-layers";

/** Toggleable groups of agenda kinds. Events are always shown. */
export type LayerKey = "tasks" | "chores" | "meals" | "money" | "milestones";

export const layerOptions: Array<{ key: LayerKey; label: string; icon: LucideIcon }> = [
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "chores", label: "Chores & routines", icon: Trophy },
  { key: "meals", label: "Meals", icon: Utensils },
  { key: "money", label: "Bills & appointments", icon: Receipt },
  { key: "milestones", label: "Milestones", icon: PartyPopper }
];

export type LayerState = Record<LayerKey, boolean>;

export const defaultLayers: LayerState = {
  tasks: true,
  chores: false,
  meals: true,
  money: true,
  milestones: true
};

const layerForKind: Record<AgendaKind, LayerKey | null> = {
  event: null,
  activity: null,
  task: "tasks",
  chore: "chores",
  routine: "chores",
  meal: "meals",
  bill: "money",
  appointment: "money",
  milestone: "milestones"
};

export function kindIsVisible(kind: AgendaKind, layers: LayerState) {
  const layer = layerForKind[kind];
  return layer === null ? true : layers[layer];
}

export const kindIcons: Record<AgendaKind, LucideIcon> = {
  event: CalendarDays,
  task: CheckSquare,
  bill: Receipt,
  appointment: Stethoscope,
  chore: Trophy,
  routine: Sunrise,
  meal: Utensils,
  milestone: PartyPopper,
  activity: Sparkles
};

export const kindLabels: Record<AgendaKind, string> = {
  event: "Event",
  task: "Task",
  bill: "Bill",
  appointment: "Appointment",
  chore: "Chore",
  routine: "Routine",
  meal: "Meal",
  milestone: "Milestone",
  activity: "Activity"
};

export function isCheckableKind(kind: AgendaKind) {
  return kind === "task" || kind === "chore" || kind === "routine";
}

export const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

/** Datetime-local value the event form expects, defaulting to 9:00 on the given day. */
export function defaultStartFor(date: Date, hour = 9) {
  return `${format(date, "yyyy-MM-dd")}T${String(hour).padStart(2, "0")}:00`;
}

export interface VisibleRange {
  start: Date;
  end: Date;
}

/** Inclusive day range a view shows around its anchor date (weeks start on Sunday). */
export function rangeForView(view: CalendarView, anchor: Date): VisibleRange {
  const day = startOfDay(anchor);
  if (view === "month") {
    const start = startOfWeek(startOfMonth(day));
    return { start, end: addDays(start, 41) };
  }
  if (view === "week") {
    return { start: startOfWeek(day), end: startOfDay(endOfWeek(day)) };
  }
  if (view === "agenda") {
    return { start: day, end: addDays(day, 13) };
  }
  return { start: day, end: day };
}

export function daysBetween(start: Date, end: Date) {
  return eachDayOfInterval({ start, end });
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1) {
  if (view === "month") return addMonths(anchor, direction);
  if (view === "week") return addWeeks(anchor, direction);
  if (view === "agenda") return addDays(anchor, 14 * direction);
  return addDays(anchor, direction);
}

function shortRangeLabel(start: Date, end: Date) {
  if (isSameMonth(start, end)) return `${format(start, "MMM d")} – ${format(end, "d")}`;
  if (isSameYear(start, end)) return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function rangeLabel(view: CalendarView, anchor: Date, start: Date, end: Date) {
  if (view === "month") return format(anchor, "MMMM yyyy");
  if (view === "day") return format(anchor, "EEEE, MMM d");
  return shortRangeLabel(start, end);
}

/** Friendly relative label for a day: Today, Tomorrow, Yesterday, or the weekday. */
export function relativeDayLabel(date: Date, today = new Date()) {
  const diff = differenceInCalendarDays(startOfDay(date), startOfDay(today));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(date, "EEEE");
}

export function formatItemTime(item: AgendaItem) {
  if (!item.at) return "All day";
  return format(item.at, item.at.getMinutes() === 0 ? "h a" : "h:mm a").toLowerCase();
}

const DEFAULT_EVENT_MINUTES = 60;

/**
 * Ids of timed events that overlap another timed event for the same person.
 * Family-wide events (no member) count for everyone, since the whole family
 * is expected there.
 */
export function findConflicts(items: AgendaItem[], events: EventRecord[]): Set<string> {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const timed = items
    .filter((item) => item.kind === "event" && item.at)
    .map((item) => {
      const record = eventsById.get(item.id);
      const start = item.at as Date;
      const parsedEnd = record?.end_at ? parseMaybeDate(record.end_at) : null;
      const end = parsedEnd && parsedEnd > start ? parsedEnd : new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
      return { id: item.id, start: start.getTime(), end: end.getTime(), members: item.memberIds };
    })
    .sort((a, b) => a.start - b.start);

  const conflicted = new Set<string>();
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const a = timed[i];
      const b = timed[j];
      if (b.start >= a.end) break;
      const sharesPerson = a.members.length === 0 || b.members.length === 0 || a.members.some((id) => b.members.includes(id));
      if (sharesPerson) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}

export function readStoredView(): CalendarView | null {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return raw && calendarViews.some((view) => view.key === raw) ? (raw as CalendarView) : null;
  } catch {
    return null;
  }
}

export function readStoredLayers(): LayerState | null {
  try {
    const raw = window.localStorage.getItem(LAYERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const next: LayerState = { ...defaultLayers };
    for (const option of layerOptions) {
      if (typeof parsed[option.key] === "boolean") next[option.key] = parsed[option.key] as boolean;
    }
    return next;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); the in-memory state still works.
  }
}
