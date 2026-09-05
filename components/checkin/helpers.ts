import { addDays, differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { dateKey } from "@/lib/streaks";
import type { Checkin, FamilyMember, RelationshipRecord } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export const moodFaces = ["😞", "😕", "😐", "🙂", "😄"] as const;
export const moodLabels = ["Rough", "Meh", "Okay", "Good", "Great"] as const;
export const energyLabels = ["Drained", "Low", "Steady", "Good", "Full"] as const;

export function moodFace(mood: number) {
  return moodFaces[Math.min(5, Math.max(1, Math.round(mood))) - 1];
}

export function moodLabel(mood: number) {
  return moodLabels[Math.min(5, Math.max(1, Math.round(mood))) - 1];
}

export function energyLabel(energy: number) {
  return energyLabels[Math.min(5, Math.max(1, Math.round(energy))) - 1];
}

export function checkinFor(checkins: Checkin[], memberId: string, date: Date) {
  const key = dateKey(date);
  return checkins.find((checkin) => checkin.member_id === memberId && checkin.checkin_date === key) ?? null;
}

/** Most recent shared check-in for a member, newest first. */
export function latestSharedCheckin(checkins: Checkin[], memberId: string) {
  return (
    [...checkins]
      .filter((checkin) => checkin.member_id === memberId && checkin.shared_with_partner)
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date) || b.updated_at.localeCompare(a.updated_at))[0] ?? null
  );
}

export interface TrendSeries {
  member: FamilyMember;
  /** One slot per day; null when there is no check-in. */
  moods: Array<number | null>;
  average: number | null;
}

export function trendDays(count: number, today = new Date()) {
  const end = startOfDay(today);
  return Array.from({ length: count }, (_, index) => addDays(end, index - (count - 1)));
}

export function buildTrend(checkins: Checkin[], parents: FamilyMember[], days: Date[]): TrendSeries[] {
  return parents.map((member) => {
    const moods = days.map((day) => checkinFor(checkins, member.id, day)?.mood ?? null);
    const values = moods.filter((value): value is number => value !== null);
    return {
      member,
      moods,
      average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
    };
  });
}

/** Consecutive days (ending today or yesterday) where every parent logged a mood above 3. */
export function bothAboveStreak(checkins: Checkin[], parents: FamilyMember[], today = new Date(), threshold = 3) {
  if (parents.length === 0) return 0;
  let cursor = startOfDay(today);
  const has = (day: Date) => parents.every((parent) => checkinFor(checkins, parent.id, day) !== null);
  if (!has(cursor)) cursor = subDays(cursor, 1);
  let streak = 0;
  while (streak < 365) {
    const moods = parents.map((parent) => checkinFor(checkins, parent.id, cursor)?.mood ?? null);
    if (moods.some((mood) => mood === null || mood <= threshold)) break;
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function recentGratitude(checkins: Checkin[], parentIds: string[], limit = 6) {
  return [...checkins]
    .filter((checkin) => checkin.member_id && parentIds.includes(checkin.member_id) && checkin.gratitude?.trim())
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date) || b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export function openNeeds(checkins: Checkin[], parentIds: string[], today = new Date(), days = 7) {
  const base = startOfDay(today);
  return [...checkins]
    .filter((checkin) => {
      if (!checkin.member_id || !parentIds.includes(checkin.member_id) || !checkin.needs?.trim()) return false;
      const date = parseMaybeDate(checkin.checkin_date);
      if (!date) return false;
      const diff = differenceInCalendarDays(base, date);
      return diff >= 0 && diff < days;
    })
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}

export function recentConnectionScore(records: RelationshipRecord[], today = new Date(), days = 30) {
  const base = startOfDay(today);
  const scores = records
    .filter((record) => typeof record.connection_score === "number")
    .filter((record) => {
      const date = parseMaybeDate(record.completed_at ?? record.due_at ?? record.updated_at ?? record.created_at);
      if (!date) return false;
      const diff = differenceInCalendarDays(base, date);
      return diff >= -1 && diff <= days;
    })
    .map((record) => record.connection_score as number);
  return {
    count: scores.length,
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
  };
}
