import { addDays, getDay, parseISO, startOfDay, subDays } from "date-fns";
import { dateKey } from "@/lib/streaks";
import type { Chore, ChoreCompletion, ChoreFrequency, FamilyMember, TimeOfDay } from "@/lib/types";

export const encouragements = [
  "Nice one. That's how it gets done.",
  "Boom. Another one off the list.",
  "Look at you go.",
  "Teamwork makes the house work.",
  "That's the stuff. Keep it rolling.",
  "Chore champion energy right there."
] as const;

export function encouragementFor(completedCount: number) {
  return encouragements[Math.max(0, completedCount - 1) % encouragements.length];
}

export const timeOfDayOrder: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export const timeOfDayLabel: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime"
};

export const timeOfDayEmoji: Record<TimeOfDay, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
  anytime: "⭐"
};

export const frequencyLabel: Record<ChoreFrequency, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekends: "Weekends",
  weekly: "Weekly",
  custom: "Custom days"
};

/** Sunday through Saturday for the week containing the anchor date. */
export function weekDaysFor(anchor: Date) {
  const start = subDays(startOfDay(anchor), getDay(anchor));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function pointsForChoreInWeek(completions: ChoreCompletion[], choreId: string, days: Date[]) {
  const keys = new Set(days.map(dateKey));
  return completions
    .filter((completion) => completion.chore_id === choreId && keys.has(completion.completed_on))
    .reduce((sum, completion) => sum + completion.points_awarded, 0);
}

/** Points earned by a member in the week that contains the anchor date. */
export function pointsInWeek(completions: ChoreCompletion[], memberId: string, anchor: Date) {
  const days = weekDaysFor(anchor);
  const keys = new Set(days.map(dateKey));
  return completions
    .filter((completion) => completion.member_id === memberId && keys.has(completion.completed_on))
    .reduce((sum, completion) => sum + completion.points_awarded, 0);
}

/** Weekly point totals for the last N weeks, oldest first, ending with the current week. */
export function weeklyPointsHistory(completions: ChoreCompletion[], memberId: string, weeks = 8, today = new Date()) {
  return Array.from({ length: weeks }, (_, index) => pointsInWeek(completions, memberId, subDays(today, (weeks - 1 - index) * 7)));
}

export function sortByTimeOfDay<T extends { time_of_day: TimeOfDay }>(items: T[]) {
  return [...items].sort((a, b) => timeOfDayOrder.indexOf(a.time_of_day) - timeOfDayOrder.indexOf(b.time_of_day));
}

export function completionsForDay(completions: ChoreCompletion[], date: Date) {
  const key = dateKey(date);
  return completions.filter((completion) => completion.completed_on === key);
}

export function isSameOrBeforeToday(date: Date, today = new Date()) {
  return startOfDay(date).getTime() <= startOfDay(today).getTime();
}

export function completionDate(completion: ChoreCompletion) {
  return parseISO(completion.completed_on);
}

export interface StarterChore {
  title: string;
  emoji: string;
  points: number;
  frequency: ChoreFrequency;
  time_of_day: TimeOfDay;
}

export function starterChoresForAge(age: number | null): StarterChore[] {
  if (age !== null && age <= 6) {
    return [
      { title: "Make bed", emoji: "🛏️", points: 5, frequency: "daily", time_of_day: "morning" },
      { title: "Put toys away", emoji: "🧸", points: 5, frequency: "daily", time_of_day: "evening" },
      { title: "Feed pet", emoji: "🐕", points: 5, frequency: "daily", time_of_day: "morning" }
    ];
  }
  if (age !== null && age <= 11) {
    return [
      { title: "Set table", emoji: "🍽️", points: 5, frequency: "daily", time_of_day: "evening" },
      { title: "Tidy room", emoji: "🧹", points: 10, frequency: "weekdays", time_of_day: "afternoon" },
      { title: "Take out recycling", emoji: "🗑️", points: 10, frequency: "weekly", time_of_day: "evening" }
    ];
  }
  return [
    { title: "Dishes", emoji: "🍽️", points: 10, frequency: "daily", time_of_day: "evening" },
    { title: "Laundry", emoji: "🧺", points: 15, frequency: "weekly", time_of_day: "anytime" },
    { title: "Walk dog", emoji: "🐕", points: 10, frequency: "daily", time_of_day: "afternoon" }
  ];
}

export function memberFirstName(member: FamilyMember | null | undefined) {
  return (member?.display_name ?? "").trim().split(/\s+/)[0] || "Someone";
}

export function choresForMember(chores: Chore[], memberId: string) {
  return chores.filter((chore) => chore.assigned_to === memberId);
}

export function unassignedChores(chores: Chore[]) {
  return chores.filter((chore) => !chore.assigned_to);
}
