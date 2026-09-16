// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
  range: vi.fn(),
  filters: [] as unknown[][],
  update: vi.fn(),
  textSearch: vi.fn(),
}));
vi.mock("@/lib/finance/server", async (original) => ({
  ...(await original<typeof import("@/lib/finance/server")>()),
  authorizeFinance: mocks.authorize,
}));
import { GET, PATCH, DELETE } from "@/app/api/assistant/logs/route";
import { FinanceApiError } from "@/lib/finance/server";
import { logFilename, logUpdateSchema } from "@/lib/assistant/logs";
import { priorSessionReferences } from "@/lib/assistant/log-server";
const id = "00000000-0000-4000-8000-000000000010";
const req = (body?: unknown) =>
  new Request(
    `http://localhost/api/assistant/logs?family_id=f1&id=${id}`,
    body ? { method: "POST", body: JSON.stringify(body) } : {},
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.filters.length = 0;
  const query = {
    select: () => query,
    order: () => query,
    eq: (...args: unknown[]) => {
      mocks.filters.push(args);
      return query;
    },
    update: (v: unknown) => {
      mocks.update(v);
      return query;
    },
    textSearch: (...args: unknown[]) => {
      mocks.textSearch(...args);
      return query;
    },
    maybeSingle: mocks.single,
    range: mocks.range,
  };
  mocks.from.mockReturnValue(query);
  mocks.authorize.mockResolvedValue({
    client: { from: mocks.from, rpc: mocks.rpc },
    userId: "u1",
  });
  mocks.single.mockResolvedValue({
    data: { id, transcript_md: "# Log\n\n<script>untrusted</script>" },
    error: null,
  });
  mocks.range.mockResolvedValue({ data: [], count: 0 });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
describe("private LLM Log API", () => {
  it("authenticates all read/update/delete operations before touching logs", async () => {
    mocks.authorize.mockRejectedValue(new FinanceApiError("Forbidden", 403));
    expect((await GET(req())).status).toBe(403);
    expect(
      (
        await PATCH(
          req({
            family_id: "f1",
            id,
            title: "Log",
            memory_note: "",
            reference_enabled: true,
            updated_at: "2026-09-16T00:00:00Z",
          }),
        )
      ).status,
    ).toBe(403);
    expect((await DELETE(req({ family_id: "f1", id }))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("scopes downloads to the owner/family and serves Markdown as an uncached attachment", async () => {
    const response = await GET(new Request(req().url + "&download=1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      logFilename(id),
    );
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toContain("<script>untrusted</script>");
    expect(mocks.filters).toContainEqual(["family_id", "f1"]);
    expect(mocks.filters).toContainEqual(["user_id", "u1"]);
    expect(mocks.filters).toContainEqual(["id", id]);
  });
  it("paginates metadata and searches indexed transcript text without returning every conversation", async () => {
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/assistant/logs?family_id=f1&page=1&search=mortgage",
          ),
        )
      ).status,
    ).toBe(200);
    expect(mocks.range).toHaveBeenCalledWith(25, 49);
    expect(mocks.textSearch).toHaveBeenCalledWith("search_vector", "mortgage", {
      type: "websearch",
      config: "english",
    });
  });
  it("rejects invalid IDs/oversized notes and uses optimistic log settings updates", async () => {
    expect(() => logFilename("../../secret")).toThrow();
    const update = {
      family_id: "f1",
      id,
      title: "Updated",
      memory_note: "Correction",
      reference_enabled: false,
      updated_at: "2026-09-16T00:00:00Z",
    };
    expect(
      logUpdateSchema.safeParse({ ...update, memory_note: "x".repeat(2001) })
        .success,
    ).toBe(false);
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect((await PATCH(req(update))).status).toBe(409);
    expect(mocks.filters).toContainEqual(["updated_at", update.updated_at]);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ reference_enabled: false }),
    );
  });
  it("deletes through the session-aware atomic function", async () => {
    expect((await DELETE(req({ family_id: "f1", id }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_llm_log", {
      target_family: "f1",
      target_log: id,
    });
  });
  it("bounds and redacts prior-session references and uses the exact model/scope", async () => {
    mocks.rpc.mockResolvedValue({
      data: Array.from({ length: 5 }, () => ({
        id,
        title: "Prior review",
        excerpt: "[S1] [L3] ".repeat(400),
        updated_at: "2026-09-16T00:00:00Z",
        matched: true,
      })),
    });
    const refs = await priorSessionReferences(
      await mocks.authorize(),
      "f1",
      "model/a",
      "scope-a",
      "Review",
    );
    expect(refs).toHaveLength(3);
    expect(refs.reduce((n, r) => n + r.excerpt.length, 0)).toBeLessThanOrEqual(
      3600,
    );
    expect(refs[0].excerpt).not.toMatch(/\[(?:S|L)\d+\]/);
    expect(mocks.rpc).toHaveBeenCalledWith("find_llm_references", {
      target_family: "f1",
      target_model: "model/a",
      target_context: "scope-a",
      question: "Review",
    });
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id,
          title: "Prior review",
          excerpt: "password: private-secret",
          updated_at: "2026-09-16T00:00:00Z",
          matched: true,
        },
      ],
    });
    expect(
      (
        await priorSessionReferences(
          await mocks.authorize(),
          "f1",
          "model/a",
          "scope-a",
          "Review",
        )
      )[0].excerpt,
    ).not.toContain("private-secret");
    mocks.rpc.mockResolvedValue({ error: {} });
    await expect(
      priorSessionReferences(
        await mocks.authorize(),
        "f1",
        "model/a",
        "scope-a",
        "Review",
      ),
    ).rejects.toThrow("turn off prior-session");
  });
});
