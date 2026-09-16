// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { openRouterFetch } from "@/lib/finance/server";

afterEach(() => vi.unstubAllGlobals());

function mockResponse(status: number, payload: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json(payload, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OpenRouter error reporting", () => {
  it.each([
    [400, "parameters"],
    [401, "API key was rejected"],
    [402, "insufficient credits"],
    [403, "guardrail"],
    [404, "eligible endpoint"],
    [408, "timed out"],
    [413, "request size"],
    [422, "request format"],
    [429, "rate limited"],
    [500, "internal error"],
    [502, "invalid response"],
    [503, "No provider"],
    [504, "timed out"],
  ])(
    "explains HTTP %s without returning provider secrets",
    async (status, reason) => {
      const fetchMock = mockResponse(Number(status), {
        error: {
          message: "secret-key private-finance-prompt",
          metadata: { raw: "private-account-data" },
        },
      });
      const error = await openRouterFetch("chat/completions", "test-key").catch(
        (e) => e,
      );
      expect(error.message).toContain(`OpenRouter ${status}`);
      expect(error.message).toContain(reason);
      expect(error.message).not.toMatch(
        /secret-key|private-finance|private-account/,
      );
      expect(error.status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    ["No endpoints found matching your data policy", "will not relax"],
    ["No endpoints found that support tool use", "requested model features"],
  ])("classifies routing failures: %s", async (message, reason) => {
    mockResponse(404, { error: { message } });
    await expect(
      openRouterFetch("chat/completions", "test-key"),
    ).rejects.toThrow(reason);
  });
  it("handles error envelopes even with HTTP 200", async () => {
    mockResponse(200, {
      error: { code: 503, message: "Provider unavailable" },
    });
    await expect(
      openRouterFetch("chat/completions", "test-key"),
    ).rejects.toThrow("OpenRouter 503");
  });
  it("does not reflect arbitrary codes or metadata from successful error envelopes", async () => {
    mockResponse(200, {
      error: { code: "private-string", message: "private-prompt" },
    });
    await expect(
      openRouterFetch("chat/completions", "test-key"),
    ).rejects.toThrow("OpenRouter 502");
  });
  it.each([200, 502])(
    "handles non-JSON HTTP %s without exposing a response body",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response("<html>private upstream details</html>", { status }),
          ),
      );
      await expect(
        openRouterFetch("chat/completions", "test-key"),
      ).rejects.toThrow("OpenRouter 502");
    },
  );
  it("passes successful JSON through unchanged", async () => {
    const payload = { choices: [{ message: { content: "Answer" } }] };
    mockResponse(200, payload);
    await expect(
      openRouterFetch("chat/completions", "test-key"),
    ).resolves.toEqual(payload);
  });
  it("reports a network failure without retrying a possibly billed request", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("private details"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      openRouterFetch("chat/completions", "test-key"),
    ).rejects.toThrow("did not respond in time");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
