import { describe, expect, it } from "vitest";
import {
  generateIcsCalendar,
  parseIcsEvents,
  uniqueCalendarImports,
} from "@/lib/calendar-sync";
import { createSeedData } from "@/lib/seed-data";

describe("calendar sync helpers", () => {
  it("exports and imports basic ICS events", () => {
    const ics = generateIcsCalendar("Family Calendar", [
      {
        id: "event_1",
        title: "Family dinner",
        description: "Bring dessert",
        location: "Home",
        start_at: "2026-06-25T18:00:00.000Z",
        end_at: "2026-06-25T19:00:00.000Z",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Family dinner");

    const imported = parseIcsEvents(ics);
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("Family dinner");
    expect(imported[0].location).toBe("Home");
    expect(imported[0].start_at).toBe("2026-06-25T18:00:00.000Z");
    expect(imported[0].end_at).toBe("2026-06-25T19:00:00.000Z");
  });
  it("skips exact existing and same-file duplicates while retaining new events", () => {
    const event = createSeedData().events[0];
    const imported = {
      title: event.title,
      start_at: event.start_at,
      all_day: event.all_day,
    };
    const next = { ...imported, title: "New outing" };
    expect(uniqueCalendarImports([imported, next, next], [event])).toEqual([
      next,
    ]);
  });
  it("reports unsupported timezone and recurrence rules instead of dropping their meaning", () => {
    expect(() =>
      parseIcsEvents(
        "BEGIN:VEVENT\nDTSTART;TZID=America/Los_Angeles:20261110T090000\nEND:VEVENT",
      ),
    ).toThrow("named time zones");
    expect(() =>
      parseIcsEvents("BEGIN:VEVENT\nRRULE:FREQ=WEEKLY\nEND:VEVENT"),
    ).toThrow("Recurring event rules");
  });
  it("exports all-day events with an exclusive end date", () => {
    const ics = generateIcsCalendar("Family", [
      {
        id: "a",
        title: "Day out",
        start_at: "2026-11-10T12:00:00Z",
        all_day: true,
      },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261110");
    expect(ics).toContain("DTEND;VALUE=DATE:20261111");
  });
});
