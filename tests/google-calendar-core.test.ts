import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decision,
  googleIdForLocal,
  localFields,
  localPayload,
  remoteFields,
  googlePayload,
} from "@/lib/google-calendar/core";
import { seal, unseal, redirectUri } from "@/lib/google-calendar/server";

const base = {
  title: "Family dinner",
  description: "At home",
  location: "Kitchen",
  start: "2026-11-10T18:00:00.000Z",
  end: "2026-11-10T19:00:00.000Z",
  allDay: false,
};
afterEach(() => vi.unstubAllEnvs());
describe("Google Calendar reconciliation", () => {
  it("chooses only one-sided changes and preserves concurrent edits for review", () => {
    const changed = { ...base, title: "Changed" },
      other = { ...base, title: "Other edit" };
    expect(decision(base, changed, base)).toBe("push");
    expect(decision(base, base, changed)).toBe("pull");
    expect(decision(base, changed, other)).toBe("conflict");
    expect(decision(base, changed, changed)).toBe("equal");
  });
  it("handles deletions and new records without equating deletion to a new write", () => {
    expect(decision(base, null, base)).toBe("push");
    expect(decision(base, base, null)).toBe("pull");
    expect(decision(base, { ...base, title: "Edited" }, null)).toBe("conflict");
    expect(decision(null, null, base)).toBe("pull");
    expect(decision(null, base, null)).toBe("push");
  });
  it("round-trips all-day dates across DST in the selected calendar timezone", () => {
    const fields = {
      ...base,
      start: "2026-11-01",
      end: "2026-11-02",
      allDay: true,
    };
    const stored = localPayload(fields, "America/Los_Angeles");
    expect(stored.start_at).toBe("2026-11-01T07:00:00.000Z");
    expect(stored.end_at).toBe("2026-11-02T08:00:00.000Z");
    expect(localFields(stored, "America/Los_Angeles")).toEqual(fields);
    expect(googlePayload(fields).end).toEqual({ date: "2026-11-02" });
  });
  it("normalizes Google offsets and preserves exclusive end times", () => {
    expect(
      remoteFields({
        id: "a",
        summary: base.title,
        description: base.description,
        location: base.location,
        start: { dateTime: "2026-11-10T10:00:00-08:00" },
        end: { dateTime: "2026-11-10T11:00:00-08:00" },
      }),
    ).toEqual(base);
    expect(remoteFields({ id: "a", status: "cancelled" })).toBeNull();
  });
  it("uses deterministic valid Google IDs for retry-safe inserts", () => {
    expect(googleIdForLocal("link", "local")).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(googleIdForLocal("link", "local")).toBe(
      googleIdForLocal("link", "local"),
    );
    expect(googleIdForLocal("other", "local")).not.toBe(
      googleIdForLocal("link", "local"),
    );
  });
  it("encrypts credentials with workspace and account binding and detects tampering", () => {
    vi.stubEnv("GOOGLE_CALENDAR_ENCRYPTION_KEY", "ab".repeat(32));
    const sealed = seal("test-refresh-token", "family:user");
    expect(sealed).not.toContain("test-refresh-token");
    expect(unseal(sealed, "family:user")).toBe("test-refresh-token");
    expect(() => unseal(sealed, "other:user")).toThrow();
    expect(() =>
      unseal(
        sealed.slice(0, -1) + (sealed.endsWith("0") ? "1" : "0"),
        "family:user",
      ),
    ).toThrow();
  });
  it("requires a fixed callback without query strings or user credentials", () => {
    vi.stubEnv(
      "GOOGLE_CALENDAR_REDIRECT_URI",
      "https://family-control-center.netlify.app/api/calendar/google/callback",
    );
    expect(redirectUri()).toContain("/callback");
    vi.stubEnv(
      "GOOGLE_CALENDAR_REDIRECT_URI",
      "https://evil.example/api/calendar/google/callback?return=other",
    );
    expect(() => redirectUri()).toThrow();
  });
});
