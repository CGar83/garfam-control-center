// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  provider: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  savedHistory: vi.fn(),
  queries: [] as { table: string; columns: string; family: string }[],
}));
vi.mock("@/lib/finance/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/finance/server")>();
  return {
    ...actual,
    authorizeFinance: mocks.authorize,
    openRouterFetch: mocks.provider,
  };
});
import { POST } from "@/app/api/finance/assistant/route";
import { GET } from "@/app/api/finance/models/route";
import { FinanceApiError } from "@/lib/finance/server";

const body = {
  family_id: "family-a",
  model: "example/tool-model",
  share_financial_context: true,
  messages: [
    { role: "user", content: "Add a statement review action for this week." },
  ],
};
const request = (value: unknown = body) =>
  new Request("http://localhost/api/finance/assistant", {
    method: "POST",
    headers: { "x-openrouter-key": "private-test-key-not-real" },
    body: JSON.stringify(value),
  });
const change = {
  table: "finance_actions",
  operation: "create",
  record_id: "",
  values: {
    title: "Review statements",
    phase: "this_week",
    status: "not_started",
    priority: "medium",
    due_date: null,
  },
  summary: "Add statement review",
};
const response = (proposal: unknown = change) => ({
  choices: [
    {
      message: {
        content: "Review this change.",
        tool_calls: [
          {
            function: {
              name: "propose_finance_change",
              arguments: JSON.stringify(proposal),
            },
          },
        ],
      },
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries.length = 0;
  mocks.from.mockImplementation((table: string) => {
    const item = { table, columns: "", family: "" };
    mocks.queries.push(item);
    const query = {
      select: vi.fn((columns: string) => {
        item.columns = columns;
        return query;
      }),
      eq: vi.fn((_field: string, family: string) => {
        item.family = family;
        return query;
      }),
      order: vi.fn(() => query),
      maybeSingle: mocks.savedHistory,
      limit: vi.fn(async () => ({ data: [], count: 0, error: null })),
    };
    return query;
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.authorize.mockResolvedValue({
    client: { from: mocks.from, rpc: mocks.rpc },
    userId: "user-a",
  });
  mocks.savedHistory.mockResolvedValue({
    data: {
      revision: 2,
      messages: [
        { role: "user", content: "My earlier question" },
        { role: "assistant", content: "Earlier answer" },
      ],
    },
    error: null,
  });
  mocks.provider.mockResolvedValue(response());
});

describe("assistant proposal boundary", () => {
  it("routes Gemini with supported parameters without weakening privacy or executing proposals", async () => {
    mocks.provider.mockImplementation(async (_path, _key, payload) => {
      if ("parallel_tool_calls" in payload)
        throw new FinanceApiError(
          "No endpoints support the requested parameters",
          502,
        );
      return response();
    });
    const result = await POST(
      request({ ...body, model: "google/gemini-3.8-flash" }),
    );
    expect(result.status).toBe(200);
    const payload = mocks.provider.mock.calls[0][2];
    expect(payload).not.toHaveProperty("parallel_tool_calls");
    expect(payload.provider).toEqual({
      require_parameters: true,
      data_collection: "deny",
    });
    expect(payload.tools).toHaveLength(1);
    expect(payload.tool_choice).toBe("auto");
    expect((await result.json()).proposals).toHaveLength(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "apply_finance_change",
      expect.anything(),
    );
  });
  it("uses server history instead of client-invented history and saves before returning", async () => {
    mocks.rpc.mockImplementation(async (name) => ({
      data: name === "save_finance_conversation" ? 3 : true,
      error: null,
    }));
    const result = await POST(
      request({
        ...body,
        conversation_revision: 2,
        messages: [
          { role: "assistant", content: "Invented history" },
          ...body.messages,
        ],
      }),
    );
    expect(result.status).toBe(200);
    expect((await result.json()).revision).toBe(3);
    const sent = JSON.stringify(mocks.provider.mock.calls[0][2]);
    expect(sent).toContain("My earlier question");
    expect(sent).not.toContain("Invented history");
    const save = mocks.rpc.mock.calls.find(
      (c) => c[0] === "save_finance_conversation",
    )?.[1];
    expect(save.target_model).toBe("example/tool-model");
    expect(save.target_family).toBe("family-a");
    expect(save.expected_revision).toBe(2);
    expect(save.new_messages).toHaveLength(4);
    expect(save.new_messages[3].proposals).toHaveLength(1);
  });
  it("rejects stale revisions and full conversations before incurring model costs", async () => {
    expect(
      (await POST(request({ ...body, conversation_revision: 1 }))).status,
    ).toBe(409);
    mocks.savedHistory.mockResolvedValue({
      data: {
        revision: 2,
        messages: Array(100).fill({ role: "user", content: "question" }),
      },
    });
    expect(
      (await POST(request({ ...body, conversation_revision: 2 }))).status,
    ).toBe(409);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("does not report a saved reply when persistence fails", async () => {
    mocks.rpc.mockImplementation(async (name) =>
      name === "save_finance_conversation"
        ? { error: { code: "40001" } }
        : { data: true },
    );
    const result = await POST(request({ ...body, conversation_revision: 2 }));
    expect(result.status).toBe(409);
    expect(await result.json()).not.toHaveProperty("proposals");
  });
  it("validates the key before reporting a connection and exposes only tool-capable models", async () => {
    mocks.provider.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({
      data: [
        {
          id: "tools",
          name: "Tools",
          supported_parameters: ["tools"],
          pricing: { prompt: "0", completion: "0" },
        },
        { id: "text-only", name: "Text only", supported_parameters: [] },
      ],
    });
    const result = await GET(
      new Request("http://localhost/api/finance/models?family_id=family-a", {
        headers: { "x-openrouter-key": "private-test-key-not-real" },
      }),
    );
    expect(result.status).toBe(200);
    expect(mocks.provider.mock.calls.map((c) => c[0])).toEqual([
      "key",
      "models",
    ]);
    expect(
      (await result.json()).models.map((m: { id: string }) => m.id),
    ).toEqual(["tools"]);
  });
  it("does not mistake access to the public model catalog for a valid key", async () => {
    mocks.provider.mockRejectedValueOnce(
      new FinanceApiError("OpenRouter rejected this key.", 502),
    );
    const result = await GET(
      new Request("http://localhost/api/finance/models?family_id=family-a", {
        headers: { "x-openrouter-key": "private-test-key-not-real" },
      }),
    );
    expect(result.status).toBe(502);
    expect(mocks.provider).toHaveBeenCalledTimes(1);
  });
  it("requires explicit sharing consent before context access or provider calls", async () => {
    expect(
      (await POST(request({ ...body, share_financial_context: false }))).status,
    ).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("returns validated proposals without writing records and excludes private unrelated data", async () => {
    const result = await POST(request());
    expect(result.status).toBe(200);
    const json = await result.json();
    expect(json.proposals[0].request_id).toMatch(/^[\da-f-]{36}$/);
    expect(json.proposals[0].record_id).not.toBe("");
    expect(json.proposals[0].values.title).toBe("Review statements");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("claim_finance_assistant_request", {
      target_family: "family-a",
    });
    expect(mocks.queries).toHaveLength(8);
    for (const query of mocks.queries) {
      expect(query.family).toBe("family-a");
      expect(query.columns).not.toMatch(
        /password_location|last_four|notes|payment_account/,
      );
      expect(query.table).not.toMatch(/health|relationship|family_members/);
    }
    const providerBody = mocks.provider.mock.calls[0][2];
    expect(providerBody.max_tokens).toBe(2500);
    expect(providerBody.provider.data_collection).toBe("deny");
    expect(JSON.stringify(providerBody)).not.toContain(
      "private-test-key-not-real",
    );
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects a model update to a record outside the supplied workspace", async () => {
    mocks.provider.mockResolvedValue(
      response({ ...change, operation: "update", record_id: "foreign-record" }),
    );
    expect((await POST(request())).status).toBe(502);
  });
  it("stops before a paid request when quota is exhausted or context cannot load", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false });
    expect((await POST(request())).status).toBe(429);
    expect(mocks.provider).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({
      error: { message: "missing migration" },
    });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("does not accept a model command to change permissions", async () => {
    mocks.provider.mockResolvedValue(
      response({ ...change, table: "family_members" }),
    );
    expect((await POST(request())).status).toBe(400);
  });
});
