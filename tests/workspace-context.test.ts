// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  assistantContextSchema,
  defaultContext,
  sourceCatalog,
  sourceHref,
  tablesForContext,
  type AssistantContext,
} from "@/lib/assistant/context";
import {
  contextKey,
  retrieveContext,
  safeContextValue,
} from "@/lib/assistant/retrieval";
import type { FinanceAccess } from "@/lib/finance/persistence";

const base: AssistantContext = {
  mode: "workspace",
  page: "/today",
  sections: ["finances"],
  search: "",
};
function database(
  rows: Record<string, unknown[]> = {},
  counts: Record<string, number> = {},
) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const query: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of ["select", "eq", "ilike", "gte", "lte", "or", "order"])
      query[method] = (...args) => {
        calls.push({ table, method, args });
        return query;
      };
    query.limit = async (...args) => {
      calls.push({ table, method: "limit", args });
      return {
        data: rows[table] ?? [],
        count: counts[table] ?? rows[table]?.length ?? 0,
        error: null,
      };
    };
    return query;
  });
  return {
    access: {
      client: { from },
      userId: "user-a",
      memberId: "member-a",
    } as unknown as FinanceAccess,
    calls,
    from,
  };
}

describe("workspace context boundaries", () => {
  it("never defaults sensitive sections into a review", () => {
    expect(defaultContext("/health").sections).toEqual([]);
    expect(defaultContext("/finances").sections).toEqual([]);
    expect(defaultContext("/calendar").sections).toEqual(["calendar"]);
  });
  it("maps pages and record scopes without widening selected sections", () => {
    expect(
      tablesForContext({ ...base, mode: "page", page: "/budget" }),
    ).toContain("financial_transactions");
    expect(
      tablesForContext({ ...base, mode: "page", page: "/budget" }),
    ).not.toContain("health_records");
    expect(
      tablesForContext({
        ...base,
        mode: "record",
        record: { table: "bills", id: "one" },
      }),
    ).toEqual(["bills"]);
  });
  it("rejects unknown tables, invalid dates, unselected records and scope confusion", () => {
    for (const patch of [
      { record: { table: "bills", id: "one" } },
      { mode: "record", record: { table: "family_members", id: "one" } },
      {
        mode: "record",
        record: { table: "finance_assistant_connections", id: "one" },
      },
      { from: "2026-02-30" },
      { from: "2026-09-20", to: "2026-09-01" },
    ])
      expect(
        assistantContextSchema.safeParse({ ...base, ...patch }).success,
      ).toBe(false);
  });
  it("isolates scope histories and preserves the existing finance conversation", () => {
    expect(contextKey({ ...base, mode: "page", page: "/finances" })).toBe(
      "finance",
    );
    expect(contextKey(base)).not.toBe(
      contextKey({ ...base, sections: ["finances", "health"] }),
    );
    expect(contextKey(base)).not.toBe(contextKey({ ...base, search: "rent" }));
    expect(contextKey({ ...base, sections: ["health", "finances"] })).toBe(
      contextKey({
        ...base,
        page: "/health",
        sections: ["finances", "health"],
      }),
    );
  });
  it("excludes credentials, direct contacts, identifiers and file URLs from all column allowlists", () => {
    for (const config of Object.values(sourceCatalog))
      expect(config.columns.split(",")).not.toEqual(
        expect.arrayContaining(["last_four"]),
      );
    const columns = Object.values(sourceCatalog).flatMap((c) =>
      c.columns.split(","),
    );
    for (const field of [
      "password_location",
      "last_four",
      "policy_last_four",
      "file_url",
      "feed_url",
      "embed_url",
      "email",
      "phone",
      "plate",
      "vin_last_six",
      "storage_location",
      "encrypted_api_key",
    ])
      expect(columns).not.toContain(field);
  });
  it("redacts likely secrets and links while retaining ordinary notes", () => {
    expect(safeContextValue("password: really-private")).toBe(
      "[Sensitive value excluded]",
    );
    expect(safeContextValue("sk-or-very-private-token")).toBe(
      "[Sensitive value excluded]",
    );
    expect(safeContextValue("account 123456789123456")).toBe(
      "[Sensitive value excluded]",
    );
    expect(
      safeContextValue("Review https://example.test/?token=secret"),
    ).not.toContain("example.test");
    expect(safeContextValue("Cancel duplicate subscription")).toBe(
      "Cancel duplicate subscription",
    );
  });
  it("scopes every database read and includes imported transaction fields with date and keyword filters", async () => {
    const db = database({
      financial_transactions: [
        {
          id: "tx1",
          updated_at: "2026-09-16T00:00:00Z",
          description: "Imported groceries",
          amount: 95,
          transaction_type: "expense",
          transaction_date: "2026-09-01",
          notes: "Imported statement row",
          last_four: "9999",
        },
      ],
    });
    const snapshot = await retrieveContext(db.access, "family-a", {
      ...base,
      mode: "page",
      page: "/budget",
      from: "2026-09-01",
      to: "2026-09-30",
      search: "groceries",
    });
    expect(snapshot.records.financial_transactions).toHaveLength(1);
    expect(JSON.stringify(snapshot.records)).toContain(
      "Imported statement row",
    );
    expect(JSON.stringify(snapshot.records)).not.toContain("9999");
    for (const table of db.from.mock.calls.map((c) => c[0]))
      expect(db.calls).toContainEqual({
        table,
        method: "eq",
        args: ["family_id", "family-a"],
      });
    expect(db.calls).toContainEqual({
      table: "financial_transactions",
      method: "gte",
      args: ["transaction_date", "2026-09-01"],
    });
    expect(db.calls).toContainEqual({
      table: "financial_transactions",
      method: "ilike",
      args: ["description", "%groceries%"],
    });
    expect(snapshot.sources[0].ref).toBe("S1");
    expect(sourceHref(snapshot.sources[0])).toBe("/budget?record=tx1");
  });
  it("does not query sensitive sections without selection", async () => {
    const db = database();
    await retrieveContext(db.access, "family-a", {
      ...base,
      sections: ["calendar", "tasks"],
    });
    expect(db.from).not.toHaveBeenCalledWith("health_records");
    expect(db.from).not.toHaveBeenCalledWith("financial_transactions");
    expect(db.from).not.toHaveBeenCalledWith("relationship_records");
  });
  it("adds owner/share restrictions for check-ins and addressed communication", async () => {
    const db = database();
    await retrieveContext(db.access, "family-a", {
      ...base,
      sections: ["relationship", "communication"],
    });
    expect(db.calls).toContainEqual({
      table: "checkins",
      method: "or",
      args: ['member_id.eq."member-a",shared_with_partner.eq.true'],
    });
    expect(
      db.calls.find(
        (c) => c.table === "communication_notes" && c.method === "or",
      )?.args[0],
    ).toContain('visible_to.eq."member-a"');
  });
  it("queries an exact record ID and refuses an empty scope before reading", async () => {
    const db = database();
    await retrieveContext(db.access, "family-a", {
      ...base,
      mode: "record",
      record: { table: "bills", id: "one" },
    });
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.calls).toContainEqual({
      table: "bills",
      method: "eq",
      args: ["id", "one"],
    });
    db.from.mockClear();
    await expect(
      retrieveContext(db.access, "family-a", { ...base, sections: [] }),
    ).rejects.toThrow("Include at least one section");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("bounds context and reports incomplete coverage instead of silently dropping records", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `tx${i}`,
      updated_at: "2026-09-16T00:00:00Z",
      description: `Row ${i}`,
      notes: "x".repeat(1200),
    }));
    const db = database(
      { financial_transactions: rows },
      { financial_transactions: 900 },
    );
    const snapshot = await retrieveContext(db.access, "family-a", {
      ...base,
      mode: "record",
      record: { table: "financial_transactions", id: "tx" },
    });
    expect(snapshot.coverage[0].clipped).toBe(true);
    expect(snapshot.coverage[0].available).toBe(900);
    expect(snapshot.coverage[0].included).toBeLessThan(50);
    expect(JSON.stringify(snapshot.records).length).toBeLessThan(61000);
  });
});
