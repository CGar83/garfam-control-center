// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  query: { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() },
  rpc: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => mocks.query,
    rpc: mocks.rpc,
  }),
}));
import { POST } from "@/app/api/finance/actions/route";
import {
  authorizeFinance,
  openRouterKey,
  readJson,
} from "@/lib/finance/server";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mocks.query.select.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
  mocks.query.limit.mockReturnValue(mocks.query);
  mocks.query.maybeSingle.mockResolvedValue({
    data: { id: "member-1", role: "parent" },
    error: null,
  });
});
const proposal = {
  request_id: "bd1d653f-6a2e-4fb1-8c55-9e10e0c14e2b",
  table: "finance_actions",
  operation: "create",
  record_id: "new-action",
  expected_updated_at: null,
  summary: "Add action",
  values: {
    title: "Review statements",
    phase: "this_week",
    status: "not_started",
    priority: "high",
    due_date: null,
  },
};
const request = (body: unknown, token = true) =>
  new Request("http://localhost/api/finance/actions", {
    method: "POST",
    headers: token ? { Authorization: "Bearer test" } : {},
    body: JSON.stringify(body),
  });

describe("finance API permission and write contract", () => {
  it("rejects unsigned requests before database writes", async () => {
    expect(
      (await POST(request({ family_id: "f1", proposal }, false))).status,
    ).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects viewers and users outside the requested family", async () => {
    mocks.query.maybeSingle
      .mockResolvedValueOnce({ data: { role: "viewer" } })
      .mockResolvedValueOnce({ data: null });
    expect((await POST(request({ family_id: "f1", proposal }))).status).toBe(
      403,
    );
    expect((await POST(request({ family_id: "f2", proposal }))).status).toBe(
      403,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("verifies the auth token and binds membership to family and user", async () => {
    await authorizeFinance(request({}), "family-2");
    expect(mocks.getUser).toHaveBeenCalledWith("test");
    expect(mocks.query.eq).toHaveBeenCalledWith("family_id", "family-2");
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
  it("uses one transactional RPC with the original retry ID and returns saved data", async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: "new-action", title: "Review statements" },
      error: null,
    });
    const response = await POST(request({ family_id: "f1", proposal }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "apply_finance_change",
      expect.objectContaining({
        target_family: "f1",
        request_id: proposal.request_id,
        operation: "create",
      }),
    );
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("returns conflicts instead of falsely reporting success", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect((await POST(request({ family_id: "f1", proposal }))).status).toBe(
      409,
    );
  });
  it("blocks protected columns and unsupported tables", async () => {
    expect(
      (
        await POST(
          request({
            family_id: "f1",
            proposal: {
              ...proposal,
              values: { ...proposal.values, family_id: "f2" },
            },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request({
            family_id: "f1",
            proposal: { ...proposal, table: "family_members" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not offer the household server key to another workspace", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "private-server-key-for-test");
    vi.stubEnv("OPENROUTER_ALLOWED_FAMILY_IDS", "family-a");
    expect(() => openRouterKey(request({}), "family-b")).toThrow();
    expect(openRouterKey(request({}), "family-a")).toBe(
      "private-server-key-for-test",
    );
  });
  it("rejects oversized bodies even without a content-length header", async () => {
    await expect(
      readJson(request({ payload: "a".repeat(25000) })),
    ).rejects.toThrow("too large");
  });
});
