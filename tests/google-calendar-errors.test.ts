import { afterEach, expect, it, vi } from "vitest";
import { apiError } from "@/lib/finance/server";
import { googleRequest, GoogleError } from "@/lib/google-calendar/server";
afterEach(() => vi.unstubAllGlobals());
it.each(["accessNotConfigured", "SERVICE_DISABLED"])(
  "recognizes disabled API reason %s without exposing upstream details",
  async (reason) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: "private project details",
              errors: [{ reason }],
              details: [{ reason }],
            },
          },
          { status: 403 },
        ),
      ),
    );
    let caught: unknown;
    try {
      await googleRequest("private-token", "users/me/calendarList");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GoogleError);
    expect((caught as GoogleError).reason).toBe("api_disabled");
    const response = apiError(caught);
    expect(response.status).toBe(403);
    const body = await response.text();
    expect(body).toContain("Google Calendar API is disabled");
    expect(body).not.toContain("private project details");
    expect(body).not.toContain("private-token");
  },
);
it("recognizes insufficient Calendar permissions", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: { details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } },
        { status: 403 },
      ),
    ),
  );
  await expect(
    googleRequest("token", "users/me/calendarList"),
  ).rejects.toMatchObject({ reason: "permissions", status: 403 });
});
it("handles non-JSON upstream failures without exposing response bodies", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("private gateway response", { status: 502 }),
    ),
  );
  await expect(
    googleRequest("token", "users/me/calendarList"),
  ).rejects.toMatchObject({ reason: "", status: 502 });
});
