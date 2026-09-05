import { startOfDay, subDays } from "date-fns";
import { routineCompletionFor, routineIsComplete, routineRunsOn } from "@/lib/streaks";
import type { FamilyMember, Routine, RoutineCompletion, TimeOfDay } from "@/lib/types";

export const timeOfDayOrder: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export const timeOfDayMeta: Record<TimeOfDay, { label: string; emoji: string; blurb: string }> = {
  morning: { label: "Morning", emoji: "🌅", blurb: "Get out the door smoothly." },
  afternoon: { label: "Afternoon", emoji: "☀️", blurb: "After-school and midday resets." },
  evening: { label: "Evening", emoji: "🌙", blurb: "Wind down and set up tomorrow." },
  anytime: { label: "Anytime", emoji: "⭐", blurb: "Whenever it fits." }
};

export interface RoutineTemplate {
  key: string;
  title: string;
  emoji: string;
  time_of_day: TimeOfDay;
  steps: string[];
  days_of_week: number[];
  /** Whether the template is meant for one kid (true) or the whole family (false). */
  personal: boolean;
}

export const routineTemplates: RoutineTemplate[] = [
  { key: "morning", title: "Morning launch", emoji: "🌅", time_of_day: "morning", steps: ["Get dressed", "Eat breakfast", "Brush teeth", "Pack backpack", "Shoes on"], days_of_week: [1, 2, 3, 4, 5], personal: true },
  { key: "bedtime", title: "Bedtime wind-down", emoji: "🌙", time_of_day: "evening", steps: ["Bath", "Pajamas", "Brush teeth", "Read", "Lights out"], days_of_week: [], personal: true },
  { key: "after-school", title: "After school", emoji: "🎒", time_of_day: "afternoon", steps: ["Snack", "Homework", "30 min outside", "Backpack ready"], days_of_week: [1, 2, 3, 4, 5], personal: true },
  { key: "sunday", title: "Sunday reset", emoji: "🏠", time_of_day: "afternoon", steps: ["Review calendar", "Plan dinners", "Grocery order", "Lay out clothes"], days_of_week: [0], personal: false }
];

export function memberFirstName(member: FamilyMember | null | undefined) {
  return (member?.display_name ?? "").trim().split(/\s+/)[0] || "";
}

export function routineMatchesMember(routine: Routine, memberId: string | null) {
  if (memberId === null) return true;
  return routine.member_id === memberId || !routine.member_id;
}

export function sortRoutines(routines: Routine[]) {
  return [...routines].sort((a, b) => {
    const order = timeOfDayOrder.indexOf(a.time_of_day) - timeOfDayOrder.indexOf(b.time_of_day);
    return order !== 0 ? order : a.title.localeCompare(b.title);
  });
}

export function routineProgress(routine: Routine, completion: RoutineCompletion | null) {
  const total = routine.steps.length;
  const done = completion ? completion.steps_done.filter((index) => index < total).length : 0;
  return { done, total, percent: total === 0 ? 100 : Math.round((done / total) * 100) };
}

/**
 * Consecutive days where every routine that ran that day was fully completed.
 * Counts today only if today is already finished; otherwise starts from yesterday.
 * Days with no routines due are skipped without breaking the streak.
 */
export function familyRoutineStreak(routines: Routine[], completions: RoutineCompletion[], today = new Date()) {
  const active = routines.filter((routine) => routine.active);
  if (active.length === 0) return 0;

  const dayComplete = (date: Date) => {
    const due = active.filter((routine) => routineRunsOn(routine, date));
    if (due.length === 0) return null;
    return due.every((routine) => routineIsComplete(routine, routineCompletionFor(completions, routine.id, date)));
  };

  let cursor = startOfDay(today);
  const todayState = dayComplete(cursor);
  if (todayState !== true) cursor = subDays(cursor, 1);

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const state = dayComplete(cursor);
    if (state === false) break;
    if (state === true) streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export const completionCheers = [
  "Routine complete. Great start, {name}.",
  "All steps done. Smooth as ever, {name}.",
  "That's a wrap, {name}. Nicely done.",
  "Every box checked. Way to go, {name}."
] as const;

export function cheerFor(routineId: string, name: string) {
  const index = routineId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % completionCheers.length;
  return completionCheers[index].replace("{name}", name || "team");
}
