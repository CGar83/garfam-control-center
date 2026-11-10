import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  admin: vi.fn(),
  missing: [] as string[],
  link: null as Record<string, unknown> | null,
  filters: [] as unknown[],
  sync: vi.fn(),
  google: vi.fn(),
  token: vi.fn(),
}));
vi.mock("@/lib/finance/server", async (original) => {
  const actual = await original<typeof import("@/lib/finance/server")>();
  return { ...actual, authorizeFinance: mocks.authorize };
});
vi.mock("@/lib/google-calendar/server", async (original) => {
  const actual =
    await original<typeof import("@/lib/google-calendar/server")>();
  return {
    ...actual,
    adminClient: mocks.admin,
    configuration: () => mocks.missing,
    googleRequest: mocks.google,
    tokenFor: mocks.token,
  };
});
vi.mock("@/lib/google-calendar/sync", () => ({
  syncGoogleCalendar: mocks.sync,
}));
import { FinanceApiError } from "@/lib/finance/server";
import { GoogleError } from "@/lib/google-calendar/server";
import { GET, POST } from "@/app/api/calendar/google/route";
import { GET as callback } from "@/app/api/calendar/google/callback/route";
const request = (body: unknown) =>
  new Request("https://family-control-center.netlify.app/api/calendar/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  mocks.filters = [];
  mocks.missing = [];
  mocks.link = null;
  mocks.authorize
    .mockReset()
    .mockResolvedValue({ userId: "user", memberId: "parent", client: {} });
  mocks.sync.mockReset().mockResolvedValue({ processed: 1, more: false });
  mocks.google.mockReset().mockResolvedValue({ items: [] });
  mocks.token.mockReset().mockResolvedValue("private-token");
  mocks.admin.mockReset().mockImplementation(() => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        update: () => query,
        eq: (key: string, value: unknown) => {
          mocks.filters.push([key, value]);
          return query;
        },
        limit: () => query,
        maybeSingle: async () => ({ data: mocks.link, error: null }),
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve({
            data: table === "google_calendar_event_maps" ? [] : [],
            error: null,
          }).then(resolve),
      };
      return query;
    },
  }));
});
afterEach(() => vi.unstubAllEnvs());
describe("Google Calendar API boundaries", () => {
  it("reports disabled Google API activation instead of a generic server failure", async () => {
    mocks.link = { id: "link", user_id: "user", status: "choose_calendar" };
    mocks.google.mockRejectedValue(new GoogleError(403, "api_disabled"));
    const response = await GET(
      new Request(
        "https://app.test/api/calendar/google?family_id=family&calendars=1",
      ),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Google Calendar API is disabled");
    expect(JSON.stringify(body)).not.toContain("private-token");
  });
  it("returns a genuine empty calendar result separately from failed permission lookup", async () => {
    mocks.link = { id: "link", user_id: "user", status: "choose_calendar" };
    const url = new Request(
      "https://app.test/api/calendar/google?family_id=family&calendars=1",
    );
    expect(await (await GET(url)).json()).toMatchObject({ calendars: [] });
    mocks.google.mockRejectedValue(new GoogleError(403, "permissions"));
    const response = await GET(url);
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("grant both requested");
  });
  it("authorizes before touching private credentials", async () => {
    mocks.authorize.mockRejectedValue(new FinanceApiError("Sign in", 401));
    expect(
      (
        await GET(
          new Request("https://app.test/api/calendar/google?family_id=family"),
        )
      ).status,
    ).toBe(401);
    expect(
      (await POST(request({ family_id: "family", action: "sync" }))).status,
    ).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("reports missing setting names without reading credential storage", async () => {
    mocks.missing = ["GOOGLE_CALENDAR_CLIENT_ID"];
    const response = await GET(
      new Request("https://app.test/api/calendar/google?family_id=family"),
    );
    expect(await response.json()).toMatchObject({
      configured: false,
      missing: ["GOOGLE_CALENDAR_CLIENT_ID"],
    });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("returns allowlisted metadata only and scopes reads to the authorized family", async () => {
    mocks.link = {
      id: "link",
      family_id: "family",
      user_id: "user",
      encrypted_refresh_token: "must-never-leak",
      status: "ready",
      calendar_name: "Family",
      phase: "pull",
    };
    const response = await GET(
      new Request("https://app.test/api/calendar/google?family_id=family"),
    );
    const text = await response.text();
    expect(text).not.toContain("must-never-leak");
    expect(text).not.toContain("encrypted_refresh_token");
    expect(mocks.filters).toContainEqual(["family_id", "family"]);
  });
  it("requires explicit sharing consent before selecting a calendar", async () => {
    const response = await POST(
      request({
        action: "select",
        family_id: "family",
        calendar_id: "private",
        consent: false,
        include_existing: true,
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("does not resume syncing a paused or incomplete connection through Sync now", async () => {
    mocks.link = { id: "link", status: "paused", calendar_id: "family" };
    expect(
      (await POST(request({ family_id: "family", action: "sync" }))).status,
    ).toBe(409);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("requires the connected parent for destructive connection management", async () => {
    mocks.link = {
      id: "link",
      status: "ready",
      calendar_id: "family",
      user_id: "another-parent",
    };
    expect(
      (await POST(request({ family_id: "family", action: "disconnect" })))
        .status,
    ).toBe(403);
  });
  it("rejects callbacks without browser binding and never echoes codes", async () => {
    vi.stubEnv(
      "GOOGLE_CALENDAR_REDIRECT_URI",
      "https://family-control-center.netlify.app/api/calendar/google/callback",
    );
    const response = await callback(
      new Request(
        `https://family-control-center.netlify.app/api/calendar/google/callback?code=sensitive-code&state=${"a".repeat(64)}`,
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://family-control-center.netlify.app/calendar?google_error=authorization_failed",
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
