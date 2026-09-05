import { describe, expect, it } from "vitest";
import { agendaForMember, buildAgenda, buildNudges, greetingFor } from "@/lib/daily-brief";
import { createSeedData } from "@/lib/seed-data";

describe("daily brief", () => {
  const data = createSeedData();
  const today = new Date();

  it("unifies today's chores, routines, and events into one agenda", () => {
    const agenda = buildAgenda(data, today);
    expect(agenda.some((item) => item.kind === "chore")).toBe(true);
    expect(agenda.some((item) => item.kind === "routine")).toBe(true);
    const timed = agenda.filter((item) => item.at);
    for (let i = 1; i < timed.length; i += 1) {
      expect((timed[i].at as Date).getTime()).toBeGreaterThanOrEqual((timed[i - 1].at as Date).getTime());
    }
    const firstAllDay = agenda.findIndex((item) => item.allDay);
    const lastTimed = agenda.map((item) => item.allDay).lastIndexOf(false);
    if (firstAllDay >= 0 && lastTimed >= 0) expect(lastTimed).toBeLessThan(firstAllDay);
  });

  it("filters the agenda per member while keeping shared items", () => {
    const agenda = buildAgenda(data, today);
    const lily = agendaForMember(agenda, "member_lily_rivera");
    expect(lily.every((item) => item.memberIds.length === 0 || item.memberIds.includes("member_lily_rivera"))).toBe(true);
  });

  it("hides sensitive items when asked", () => {
    const agenda = buildAgenda(data, today, { includeSensitive: false });
    expect(agenda.some((item) => item.sensitive)).toBe(false);
  });

  it("produces a handful of specific nudges", () => {
    const parent = data.family_members[0];
    const nudges = buildNudges(data, parent, data.family_members, today);
    expect(nudges.length).toBeGreaterThan(0);
    expect(nudges.length).toBeLessThanOrEqual(4);
    expect(nudges.every((nudge) => nudge.route.startsWith("/"))).toBe(true);
  });

  it("greets by time of day", () => {
    expect(greetingFor(new Date(2026, 0, 1, 8), "Ava")).toBe("Good morning, Ava");
    expect(greetingFor(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 0, 1, 20), "Miles")).toBe("Good evening, Miles");
  });
});
