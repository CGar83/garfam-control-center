import { describe, expect, it } from "vitest";
import { choreIsDueOn, choreProgressForDay, choreStreak, checkinStreak, daysUntil, pointsBalance, routineRunsOn } from "@/lib/streaks";
import type { Chore, ChoreCompletion, Checkin, RewardClaim, Routine } from "@/lib/types";

const base = { family_id: "f", created_at: "", updated_at: "" };
const daily: Chore = { ...base, id: "c1", title: "Make bed", assigned_to: "kid", points: 5, frequency: "daily", days_of_week: [], time_of_day: "morning", active: true };
const custom: Chore = { ...base, id: "c2", title: "Trash", assigned_to: "kid", points: 10, frequency: "custom", days_of_week: [1, 4], time_of_day: "evening", active: true };
const inactive: Chore = { ...daily, id: "c3", active: false };

function completion(choreId: string, on: string, points = 5): ChoreCompletion {
  return { ...base, id: `${choreId}-${on}`, chore_id: choreId, member_id: "kid", completed_on: on, points_awarded: points };
}

describe("chore scheduling", () => {
  it("handles frequencies", () => {
    const monday = new Date(2026, 8, 7);
    const tuesday = new Date(2026, 8, 8);
    expect(choreIsDueOn(daily, monday)).toBe(true);
    expect(choreIsDueOn(custom, monday)).toBe(true);
    expect(choreIsDueOn(custom, tuesday)).toBe(false);
    expect(choreIsDueOn(inactive, monday)).toBe(false);
    expect(choreIsDueOn({ ...daily, frequency: "weekends" }, new Date(2026, 8, 6))).toBe(true);
    expect(choreIsDueOn({ ...daily, frequency: "weekdays" }, new Date(2026, 8, 6))).toBe(false);
  });

  it("computes day progress", () => {
    const monday = new Date(2026, 8, 7);
    const progress = choreProgressForDay([daily, custom], [completion("c1", "2026-09-07")], "kid", monday);
    expect(progress.due).toHaveLength(2);
    expect(progress.done).toHaveLength(1);
    expect(progress.percent).toBe(50);
    expect(progress.pointsEarned).toBe(5);
    expect(progress.pointsPossible).toBe(15);
  });

  it("counts a streak and ignores an unfinished today", () => {
    const today = new Date(2026, 8, 9); // Wednesday
    const completions = [completion("c1", "2026-09-08"), completion("c1", "2026-09-07"), completion("c2", "2026-09-07"), completion("c1", "2026-09-06")];
    expect(choreStreak([daily, custom], completions, "kid", today)).toBe(3);
    expect(choreStreak([daily, custom], [...completions, completion("c1", "2026-09-09")], "kid", today)).toBe(4);
    expect(choreStreak([daily, custom], completions.slice(0, 1), "kid", today)).toBe(1);
  });

  it("balances points against claims", () => {
    const claims: RewardClaim[] = [{ ...base, id: "r", reward_id: "x", member_id: "kid", points_spent: 8, claimed_on: "2026-09-01", fulfilled: true }];
    expect(pointsBalance([completion("c1", "2026-09-01"), completion("c1", "2026-09-02")], claims, "kid")).toBe(2);
  });
});

describe("routines, check-ins, countdowns", () => {
  it("runs routines on configured days", () => {
    const routine: Routine = { ...base, id: "r1", title: "Morning", member_id: "kid", time_of_day: "morning", steps: ["a"], days_of_week: [1, 2, 3, 4, 5], active: true };
    expect(routineRunsOn(routine, new Date(2026, 8, 7))).toBe(true);
    expect(routineRunsOn(routine, new Date(2026, 8, 6))).toBe(false);
    expect(routineRunsOn({ ...routine, days_of_week: [] }, new Date(2026, 8, 6))).toBe(true);
  });

  it("counts check-in streaks", () => {
    const checkins: Checkin[] = ["2026-09-05", "2026-09-04", "2026-09-03", "2026-09-01"].map((date) => ({
      ...base,
      id: date,
      member_id: "p",
      checkin_date: date,
      mood: 3,
      energy: 3,
      shared_with_partner: true
    }));
    expect(checkinStreak(checkins, "p", new Date(2026, 8, 5))).toBe(3);
    expect(checkinStreak(checkins, "p", new Date(2026, 8, 6))).toBe(3);
    expect(checkinStreak(checkins, "p", new Date(2026, 8, 7))).toBe(0);
  });

  it("computes days until yearly and one-off dates", () => {
    const today = new Date(2026, 8, 5);
    expect(daysUntil("2017-04-18", true, today)).toBe(225);
    expect(daysUntil("2026-09-05", true, today)).toBe(0);
    expect(daysUntil("2026-09-15", false, today)).toBe(10);
    expect(daysUntil("2026-09-01", false, today)).toBe(-4);
  });
});
