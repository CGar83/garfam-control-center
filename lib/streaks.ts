import { addDays, differenceInCalendarDays, format, getDay, isSameDay, parseISO, startOfDay, subDays } from "date-fns";
import type { Chore, ChoreCompletion, Checkin, Routine, RoutineCompletion, RewardClaim } from "@/lib/types";

export function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

/** Whether a chore is scheduled on a given calendar day. */
export function choreIsDueOn(chore: Chore, date: Date) {
  if (!chore.active) return false;
  const day = getDay(date);
  switch (chore.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "weekly":
    case "custom": {
      const days = chore.days_of_week ?? [];
      if (days.length === 0) return chore.frequency === "weekly" ? day === 0 : true;
      return days.includes(day);
    }
    default:
      return false;
  }
}

/** Whether a routine runs on a given calendar day. Empty days_of_week means every day. */
export function routineRunsOn(routine: Routine, date: Date) {
  if (!routine.active) return false;
  const days = routine.days_of_week ?? [];
  return days.length === 0 || days.includes(getDay(date));
}

export function choreCompletedOn(completions: ChoreCompletion[], choreId: string, date: Date) {
  const key = dateKey(date);
  return completions.find((completion) => completion.chore_id === choreId && completion.completed_on === key) ?? null;
}

export function choresDueForMember(chores: Chore[], memberId: string | null, date: Date) {
  return chores.filter((chore) => choreIsDueOn(chore, date) && (memberId === null || chore.assigned_to === memberId));
}

export interface ChoreDayProgress {
  due: Chore[];
  done: Chore[];
  remaining: Chore[];
  percent: number;
  pointsEarned: number;
  pointsPossible: number;
}

export function choreProgressForDay(chores: Chore[], completions: ChoreCompletion[], memberId: string | null, date: Date): ChoreDayProgress {
  const due = choresDueForMember(chores, memberId, date);
  const done = due.filter((chore) => choreCompletedOn(completions, chore.id, date));
  const remaining = due.filter((chore) => !choreCompletedOn(completions, chore.id, date));
  const pointsPossible = due.reduce((sum, chore) => sum + chore.points, 0);
  const pointsEarned = done.reduce((sum, chore) => sum + chore.points, 0);
  return {
    due,
    done,
    remaining,
    percent: due.length === 0 ? 100 : Math.round((done.length / due.length) * 100),
    pointsEarned,
    pointsPossible
  };
}

/**
 * Consecutive days (ending today or yesterday) where every due chore was completed.
 * Days with nothing due do not break the streak but do not add to it either.
 */
export function choreStreak(chores: Chore[], completions: ChoreCompletion[], memberId: string, today = new Date()) {
  let streak = 0;
  let cursor = startOfDay(today);
  const todayProgress = choreProgressForDay(chores, completions, memberId, cursor);
  // Today only counts once it is finished; otherwise start counting from yesterday.
  if (todayProgress.due.length > 0 && todayProgress.remaining.length > 0) cursor = subDays(cursor, 1);

  for (let i = 0; i < 365; i += 1) {
    const progress = choreProgressForDay(chores, completions, memberId, cursor);
    if (progress.due.length === 0) {
      cursor = subDays(cursor, 1);
      continue;
    }
    if (progress.remaining.length > 0) break;
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function pointsEarned(completions: ChoreCompletion[], memberId: string) {
  return completions.filter((completion) => completion.member_id === memberId).reduce((sum, completion) => sum + completion.points_awarded, 0);
}

export function pointsSpent(claims: RewardClaim[], memberId: string) {
  return claims.filter((claim) => claim.member_id === memberId).reduce((sum, claim) => sum + claim.points_spent, 0);
}

export function pointsBalance(completions: ChoreCompletion[], claims: RewardClaim[], memberId: string) {
  return pointsEarned(completions, memberId) - pointsSpent(claims, memberId);
}

export function pointsThisWeek(completions: ChoreCompletion[], memberId: string, today = new Date()) {
  const weekStart = subDays(startOfDay(today), getDay(today));
  return completions
    .filter((completion) => completion.member_id === memberId)
    .filter((completion) => {
      const date = parseISO(completion.completed_on);
      return date >= weekStart && date <= addDays(weekStart, 6);
    })
    .reduce((sum, completion) => sum + completion.points_awarded, 0);
}

export function routineCompletionFor(completions: RoutineCompletion[], routineId: string, date: Date) {
  const key = dateKey(date);
  return completions.find((completion) => completion.routine_id === routineId && completion.completed_on === key) ?? null;
}

export function routineIsComplete(routine: Routine, completion: RoutineCompletion | null) {
  if (!completion) return false;
  return routine.steps.every((_, index) => completion.steps_done.includes(index));
}

/** Consecutive days a member has checked in, counting today if present. */
export function checkinStreak(checkins: Checkin[], memberId: string, today = new Date()) {
  const dates = new Set(checkins.filter((checkin) => checkin.member_id === memberId).map((checkin) => checkin.checkin_date));
  let cursor = startOfDay(today);
  if (!dates.has(dateKey(cursor))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (dates.has(dateKey(cursor)) && streak < 3650) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Days until the next occurrence of a (possibly yearly) date. 0 means today. */
export function daysUntil(dateIso: string, recurringYearly: boolean, today = new Date()) {
  const target = parseISO(dateIso);
  const base = startOfDay(today);
  if (!recurringYearly) return differenceInCalendarDays(startOfDay(target), base);
  let next = new Date(base.getFullYear(), target.getMonth(), target.getDate());
  if (next < base && !isSameDay(next, base)) next = new Date(base.getFullYear() + 1, target.getMonth(), target.getDate());
  return differenceInCalendarDays(next, base);
}

export function nextOccurrence(dateIso: string, recurringYearly: boolean, today = new Date()) {
  return addDays(startOfDay(today), daysUntil(dateIso, recurringYearly, today));
}

/** Years since the original date at its next occurrence, useful for "turning 10". */
export function yearsAtNextOccurrence(dateIso: string, today = new Date()) {
  const target = parseISO(dateIso);
  const next = nextOccurrence(dateIso, true, today);
  return next.getFullYear() - target.getFullYear();
}
