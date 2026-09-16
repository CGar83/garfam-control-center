// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  provider: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  queries: [] as string[],
  fail: false,
}));
vi.mock("@/lib/finance/server", async (original) => ({
  ...(await original<typeof import("@/lib/finance/server")>()),
  authorizeFinance: mocks.authorize,
  openRouterFetch: mocks.provider,
}));
import { POST } from "@/app/api/finance/assistant/route";
import { FinanceApiError } from "@/lib/finance/server";
import { contextKey } from "@/lib/assistant/retrieval";
import type { AssistantContext } from "@/lib/assistant/context";

const context: AssistantContext = {
  mode: "record",
  page: "/budget",
  sections: ["finances"],
  record: { table: "financial_transactions", id: "tx1" },
  search: "",
};
const base = {
  family_id: "family-a",
  model: "test/model",
  share_financial_context: true,
  conversation_revision: 0,
  context,
  messages: [{ role: "user", content: "Review the imported expense." }],
};
const req = (patch = {}) =>
  new Request("http://localhost/api/finance/assistant", {
    method: "POST",
    headers: { "x-openrouter-key": "private-testing-key" },
    body: JSON.stringify({ ...base, ...patch }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries.length = 0;
  mocks.fail = false;
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name.startsWith("save_") ? 1 : true,
    error: null,
  }));
  mocks.from.mockImplementation((table: string) => {
    mocks.queries.push(table);
    const query = {
      select: () => query,
      eq: () => query,
      ilike: () => query,
      gte: () => query,
      lte: () => query,
      or: () => query,
      order: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
      limit: async () => ({
        data:
          table === "financial_transactions"
            ? [
                {
                  id: "tx1",
                  updated_at: "2026-09-16T00:00:00Z",
                  description: "Imported groceries",
                  amount: 120,
                  transaction_type: "expense",
                  notes: "From uploaded statement",
                },
              ]
            : [],
        count: table === "financial_transactions" ? 1 : 0,
        error: mocks.fail ? { code: "denied" } : null,
      }),
    };
    return query;
  });
  mocks.authorize.mockResolvedValue({
    client: { from: mocks.from, rpc: mocks.rpc },
    userId: "u1",
    memberId: "m1",
  });
  mocks.provider.mockResolvedValue({
    choices: [
      { message: { content: "The saved grocery expense is $120 [S1]." } },
    ],
  });
});

describe("page-aware assistant API", () => {
  it("sends only the selected record, saves evidence with the answer, and provides no finance write tools for transactions", async () => {
    const response = await POST(req());
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.sources).toEqual([
      expect.objectContaining({
        ref: "S1",
        table: "financial_transactions",
        id: "tx1",
      }),
    ]);
    expect(result.coverage).toEqual([
      expect.objectContaining({ included: 1, available: 1, clipped: false }),
    ]);
    expect(mocks.queries).toEqual([
      "finance_assistant_conversations",
      "financial_transactions",
    ]);
    const request = mocks.provider.mock.calls[0][2];
    expect(request).not.toHaveProperty("tools");
    expect(JSON.stringify(request)).toContain("From uploaded statement");
    expect(request.provider.data_collection).toBe("deny");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_workspace_conversation",
      expect.objectContaining({
        target_context: contextKey(context),
        new_messages: expect.arrayContaining([
          expect.objectContaining({
            role: "assistant",
            sources: result.sources,
          }),
        ]),
      }),
    );
  });
  it("requires authentication and adult access before retrieving records", async () => {
    mocks.authorize.mockRejectedValue(
      new FinanceApiError("Parent access required", 403),
    );
    expect((await POST(req())).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("requires a saved scope revision and explicit sharing consent", async () => {
    expect((await POST(req({ conversation_revision: undefined }))).status).toBe(
      409,
    );
    expect((await POST(req({ share_financial_context: false }))).status).toBe(
      400,
    );
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("rejects forged source IDs before saving an answer", async () => {
    mocks.provider.mockResolvedValue({
      choices: [{ message: { content: "Use [S999]" } }],
    });
    const response = await POST(req());
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain(
      "outside the supplied snapshot",
    );
    expect(mocks.rpc.mock.calls.map((c) => c[0])).not.toContain(
      "save_workspace_conversation",
    );
  });
  it("blocks financial proposals outside the selected context", async () => {
    mocks.provider.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Proposed change",
            tool_calls: [
              {
                function: {
                  name: "propose_finance_change",
                  arguments: JSON.stringify({
                    table: "finance_actions",
                    operation: "create",
                    record_id: "",
                    values: {},
                    summary: "Create action",
                  }),
                },
              },
            ],
          },
        },
      ],
    });
    const response = await POST(req());
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("outside this review");
    expect(mocks.rpc.mock.calls.map((c) => c[0])).not.toContain(
      "apply_finance_change",
    );
  });
  it("does not send incomplete failed retrievals to the provider", async () => {
    mocks.fail = true;
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
});
