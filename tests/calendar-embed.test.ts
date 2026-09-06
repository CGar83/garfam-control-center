import { describe, expect, it } from "vitest";
import { extractGoogleCalendarEmbedUrl, isGoogleCalendarEmbedUrl, normalizeCalendarEmbedHeight } from "@/lib/calendar-embed";

describe("calendar embed helpers", () => {
  it("extracts a Google Calendar URL from an iframe snippet", () => {
    const result = extractGoogleCalendarEmbedUrl(
      '<iframe src="https://calendar.google.com/calendar/embed?src=family%40example.test&amp;ctz=America%2FLos_Angeles"></iframe>'
    );

    expect(result).toBe("https://calendar.google.com/calendar/embed?src=family%40example.test&ctz=America%2FLos_Angeles");
  });

  it("rejects non-Google iframe sources", () => {
    expect(extractGoogleCalendarEmbedUrl('<iframe src="https://example.com/calendar"></iframe>')).toBeNull();
    expect(isGoogleCalendarEmbedUrl("https://calendar.google.com/calendar/u/0/r")).toBe(false);
  });

  it("keeps embed heights inside the supported range", () => {
    expect(normalizeCalendarEmbedHeight(200)).toBe(420);
    expect(normalizeCalendarEmbedHeight(640)).toBe(640);
    expect(normalizeCalendarEmbedHeight(2000)).toBe(1200);
    expect(normalizeCalendarEmbedHeight(null)).toBe(640);
  });
});
