import { describe, expect, it } from "vitest";
import { generateIcsCalendar, parseIcsEvents } from "@/lib/calendar-sync";

describe("calendar sync helpers", () => {
  it("exports and imports basic ICS events", () => {
    const ics = generateIcsCalendar("Family Calendar", [
      {
        id: "event_1",
        title: "Family dinner",
        description: "Bring dessert",
        location: "Home",
        start_at: "2026-06-25T18:00:00.000Z",
        end_at: "2026-06-25T19:00:00.000Z"
      }
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Family dinner");

    const imported = parseIcsEvents(ics);
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("Family dinner");
    expect(imported[0].location).toBe("Home");
  });
});
