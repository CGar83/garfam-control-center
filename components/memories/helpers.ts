import { format, parseISO, startOfDay } from "date-fns";
import { daysUntil, nextOccurrence, yearsAtNextOccurrence } from "@/lib/streaks";
import type { FamilyMember, JournalEntry, Milestone } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export interface CountdownItem {
  milestone: Milestone;
  days: number;
  next: Date;
  turning: number | null;
}

/** Upcoming milestones within a year, soonest first. Past one-off dates are hidden. */
export function buildCountdowns(milestones: Milestone[], today = new Date()): CountdownItem[] {
  const items: CountdownItem[] = [];
  for (const milestone of milestones) {
    if (!parseMaybeDate(milestone.date)) continue;
    const days = daysUntil(milestone.date, milestone.recurring_yearly, today);
    if (days < 0 || days > 365) continue;
    items.push({
      milestone,
      days,
      next: nextOccurrence(milestone.date, milestone.recurring_yearly, today),
      turning: milestone.kind === "birthday" && milestone.recurring_yearly ? yearsAtNextOccurrence(milestone.date, today) : null
    });
  }
  return items.sort((a, b) => a.days - b.days || a.milestone.title.localeCompare(b.milestone.title));
}

export function countdownLabel(days: number) {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

/** Entries from earlier years that share today's month and day. */
export function onThisDayEntries(entries: JournalEntry[], today = new Date()) {
  const month = today.getMonth();
  const day = today.getDate();
  const year = today.getFullYear();
  return entries
    .filter((entry) => {
      const date = parseMaybeDate(entry.entry_date);
      return date && date.getMonth() === month && date.getDate() === day && date.getFullYear() < year;
    })
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
}

export function sortEntriesNewestFirst(entries: JournalEntry[]) {
  return [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at));
}

export interface MonthGroup {
  key: string;
  label: string;
  entries: JournalEntry[];
}

export function groupEntriesByMonth(entries: JournalEntry[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const entry of sortEntriesNewestFirst(entries)) {
    const date = parseMaybeDate(entry.entry_date) ?? startOfDay(new Date());
    const key = format(date, "yyyy-MM");
    const group = groups.get(key) ?? { key, label: format(date, "MMMM yyyy"), entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export interface YearStats {
  year: number;
  total: number;
  highlights: number;
  topPerson: FamilyMember | null;
  topPersonCount: number;
}

export function yearInReview(entries: JournalEntry[], members: FamilyMember[], today = new Date()): YearStats {
  const year = today.getFullYear();
  const thisYear = entries.filter((entry) => parseMaybeDate(entry.entry_date)?.getFullYear() === year);
  const counts = new Map<string, number>();
  for (const entry of thisYear) {
    for (const id of entry.people ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let topId: string | null = null;
  let topCount = 0;
  for (const [id, count] of counts) {
    if (count > topCount && members.some((member) => member.id === id)) {
      topId = id;
      topCount = count;
    }
  }
  return {
    year,
    total: thisYear.length,
    highlights: thisYear.filter((entry) => entry.highlight).length,
    topPerson: members.find((member) => member.id === topId) ?? null,
    topPersonCount: topCount
  };
}

export function entryMatchesSearch(entry: JournalEntry, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [entry.title, entry.body ?? "", entry.mood ?? "", ...(entry.tags ?? [])].join(" ").toLowerCase();
  return haystack.includes(needle);
}

export function entryDayParts(entry: JournalEntry) {
  const date = parseMaybeDate(entry.entry_date) ?? parseISO(entry.created_at);
  return { day: format(date, "d"), weekday: format(date, "EEE"), full: format(date, "EEEE, MMMM d, yyyy") };
}
