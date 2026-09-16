// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  provider: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
  single: vi.fn(),
  filters: [] as unknown[][],
}));
vi.mock("@/lib/finance/server", async (original) => ({
  ...(await original<typeof import("@/lib/finance/server")>()),
  authorizeFinance: mocks.authorize,
  openRouterFetch: mocks.provider,
}));
import { GET, POST } from "@/app/api/finance/connection/route";
import {
  GET as history,
  POST as clear,
} from "@/app/api/finance/conversation/route";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/finance/credential-crypto";
import { FinanceApiError } from "@/lib/finance/server";
import { resolveOpenRouterKey } from "@/lib/finance/persistence";
import { contextKey } from "@/lib/assistant/retrieval";
import type { AssistantContext } from "@/lib/assistant/context";

const req = (body?: unknown) =>
  new Request(
    "http://localhost/api/finance/connection?family_id=f1&model=test/model",
    { ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) },
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.filters.length = 0;
  vi.stubEnv("FINANCE_CREDENTIALS_ENCRYPTION_KEY", "ab".repeat(32));
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => {
      mocks.filters.push(args);
      return query;
    },
    maybeSingle: mocks.single,
    upsert: mocks.upsert,
  };
  mocks.from.mockReturnValue(query);
  mocks.authorize.mockResolvedValue({
    client: { from: mocks.from, rpc: mocks.rpc },
    userId: "u1",
  });
  mocks.single.mockResolvedValue({ data: null, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.provider.mockResolvedValue({ data: {} });
  mocks.rpc.mockResolvedValue({ data: 1, error: null });
});
describe("private saved assistant API", () => {
  it("authenticates before reading or writing and ignores supplied owner fields", async () => {
    mocks.authorize.mockRejectedValue(new FinanceApiError("Sign in", 401));
    expect((await GET(req())).status).toBe(401);
    expect(
      (
        await POST(
          req({
            family_id: "f1",
            model: "test/model",
            api_key: "sk-or-fake-secret",
          }),
        )
      ).status,
    ).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          req({ family_id: "f1", model: "test/model", user_id: "other" }),
        )
      ).status,
    ).toBe(400);
  });
  it("returns only model and storage status, not ciphertext or plaintext", async () => {
    mocks.single.mockResolvedValue({
      data: { model: "test/model", encrypted_api_key: "v1.hidden" },
    });
    const response = await GET(req());
    expect(await response.json()).toEqual({
      model: "test/model",
      has_saved_key: true,
      can_save_key: true,
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.filters).toContainEqual(["family_id", "f1"]);
    expect(mocks.filters).toContainEqual(["user_id", "u1"]);
  });
  it("validates a key with OpenRouter and stores only owner-bound ciphertext", async () => {
    expect(
      (
        await POST(
          req({
            family_id: "f1",
            model: "test/model",
            api_key: "sk-or-fake-secret",
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.provider).toHaveBeenCalledWith("key", "sk-or-fake-secret");
    const record = mocks.upsert.mock.calls[0][0];
    expect(record.user_id).toBe("u1");
    expect(JSON.stringify(record)).not.toContain("sk-or-fake-secret");
    expect(decryptCredential(record.encrypted_api_key, "f1", "u1")).toBe(
      "sk-or-fake-secret",
    );
  });
  it("does not overwrite a saved key when only the model is changed", async () => {
    expect(
      (await POST(req({ family_id: "f1", model: "test/other" }))).status,
    ).toBe(200);
    expect(mocks.upsert.mock.calls[0][0]).not.toHaveProperty(
      "encrypted_api_key",
    );
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it("forgets the personal key without deleting history", async () => {
    expect(
      (
        await POST(
          req({ family_id: "f1", model: "test/model", forget_key: true }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.upsert.mock.calls[0][0].encrypted_api_key).toBeNull();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("leaves saved credentials intact on validation or encryption setup failure", async () => {
    mocks.provider.mockRejectedValue(new FinanceApiError("Invalid key", 502));
    expect(
      (
        await POST(
          req({
            family_id: "f1",
            model: "test/model",
            api_key: "sk-or-fake-secret",
          }),
        )
      ).status,
    ).toBe(502);
    vi.stubEnv("FINANCE_CREDENTIALS_ENCRYPTION_KEY", "");
    expect(
      (
        await POST(
          req({
            family_id: "f1",
            model: "test/model",
            api_key: "sk-or-fake-secret",
          }),
        )
      ).status,
    ).toBe(503);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("resolves the saved key entirely server-side", async () => {
    mocks.single.mockResolvedValue({
      data: {
        encrypted_api_key: encryptCredential("sk-or-fake-secret", "f1", "u1"),
      },
    });
    expect(
      await resolveOpenRouterKey(req(), "f1", await mocks.authorize()),
    ).toBe("sk-or-fake-secret");
  });
  it("restores only the requested model and rejects stale clear requests", async () => {
    mocks.single.mockResolvedValue({
      data: {
        messages: [{ role: "user", content: "Prior question" }],
        revision: 2,
      },
    });
    const response = await history(req());
    expect((await response.json()).messages[0].content).toBe("Prior question");
    expect(mocks.filters).toContainEqual(["model", "test/model"]);
    expect(mocks.filters).toContainEqual(["context_key", "finance"]);
    mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(
      (
        await clear(
          req({
            family_id: "f1",
            model: "test/model",
            clear: true,
            revision: 1,
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("restores and clears only the selected review scope", async () => {
    const context: AssistantContext = {
      mode: "workspace",
      page: "/calendar",
      sections: ["calendar"],
      search: "",
    };
    const query = new URL(req().url);
    query.searchParams.set("context", JSON.stringify(context));
    expect((await history(new Request(query))).status).toBe(200);
    expect(mocks.filters).toContainEqual(["context_key", contextKey(context)]);
    expect(mocks.filters).toContainEqual(["family_id", "f1"]);
    expect(mocks.filters).toContainEqual(["user_id", "u1"]);
    expect(
      (
        await clear(
          req({
            family_id: "f1",
            model: "test/model",
            clear: true,
            revision: 0,
            context,
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_workspace_conversation",
      expect.objectContaining({
        target_context: contextKey(context),
        new_messages: [],
      }),
    );
  });
  it("rejects malformed history context without querying saved messages", async () => {
    const query = new URL(req().url);
    query.searchParams.set("context", "{broken");
    expect((await history(new Request(query))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
