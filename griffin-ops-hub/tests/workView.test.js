import { describe, expect, it } from "vitest";
import {
  blockedReason,
  bucketWork,
  canClaim,
  deskSummary,
  groupByLoan,
  laneWork,
  phaseCounts,
  sortWork,
  suggestedPhase,
} from "../src/lib/workView.js";

const today = "2026-09-21";
const item = (overrides) => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  loan_number: "1042801",
  borrower_last: "Morgan",
  branch: "San Diego",
  template_id: "MLP_WELCOME",
  department: "MLP",
  owner_id: null,
  status: "QUEUED",
  priority: "NORMAL",
  due_date: null,
  updated_at: "2026-09-20T10:00:00.000Z",
  ...overrides,
});
const mlp = { id: "u-mlp", role: "MLP", branch: "San Diego", active: true };
const manager = { id: "u-mgr", role: "MANAGER", branch: "San Diego", active: true };

describe("bucketWork", () => {
  const items = [
    item({ id: "a", owner_id: "u-mlp", due_date: "2026-09-20" }),
    item({ id: "b", owner_id: "u-mlp", due_date: today }),
    item({ id: "c", status: "BLOCKED", owner_id: "u-proc", department: "PROCESSOR", template_id: "CADRE_HANDOFF" }),
    item({ id: "d", status: "REVIEW", owner_id: "u-mlp" }),
    item({ id: "e", status: "QUEUED" }),
    item({ id: "f", status: "DRAFT" }),
    item({ id: "g", status: "COMPLETE", owner_id: "u-mlp", due_date: "2026-01-01" }),
  ];
  it("separates overdue, due today, blocked, review and unclaimed work", () => {
    const b = bucketWork(items, mlp, today);
    expect(b.mine.map((i) => i.id)).toEqual(["a", "b", "d"]);
    expect(b.overdue.map((i) => i.id)).toEqual(["a"]);
    expect(b.dueToday.map((i) => i.id)).toEqual(["b"]);
    expect(b.blocked.map((i) => i.id)).toEqual(["c"]);
    expect(b.review.map((i) => i.id)).toEqual(["d"]);
    expect(b.unclaimed.map((i) => i.id)).toEqual(["e"]);
    expect(b.open).toHaveLength(6);
  });
  it("lets managers read every desk", () => {
    expect(bucketWork(items, manager, today).desk).toHaveLength(6);
  });
});

describe("canClaim", () => {
  it("allows a department member in the same branch to claim queued unowned work", () => {
    expect(canClaim(item({}), mlp)).toBe(true);
    expect(canClaim(item({ status: "DRAFT" }), mlp)).toBe(false);
    expect(canClaim(item({ owner_id: "u-x" }), mlp)).toBe(false);
    expect(canClaim(item({ branch: "HQ" }), mlp)).toBe(false);
    expect(canClaim(item({ department: "CLOSING" }), mlp)).toBe(false);
    expect(canClaim(item({ department: "LO" }), { ...mlp, role: "LOA" })).toBe(true);
  });
});

describe("sorting and lanes", () => {
  it("orders by urgency then target then recency", () => {
    const sorted = sortWork([
      item({ id: "late", priority: "NORMAL", due_date: "2026-09-25" }),
      item({ id: "urgent", priority: "URGENT", due_date: "2026-09-30" }),
      item({ id: "soon", priority: "NORMAL", due_date: "2026-09-22" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["urgent", "soon", "late"]);
    expect(sortWork(sorted, "target").map((i) => i.id)).toEqual(["soon", "late", "urgent"]);
  });
  it("places each open item in exactly one lane", () => {
    const lanes = laneWork(
      [
        item({ id: "over", due_date: "2026-09-01", status: "BLOCKED" }),
        item({ id: "blocked", status: "BLOCKED" }),
        item({ id: "today", due_date: today }),
        item({ id: "review", status: "REVIEW" }),
        item({ id: "later", due_date: "2026-10-01" }),
        item({ id: "done", status: "COMPLETE" }),
      ],
      today,
    );
    expect(lanes.map((lane) => lane.id)).toEqual(["overdue", "blocked", "today", "review", "upcoming"]);
    expect(lanes.flatMap((lane) => lane.items.map((i) => i.id))).toEqual([
      "over",
      "blocked",
      "today",
      "review",
      "later",
    ]);
  });
});

describe("grouping and summaries", () => {
  it("rolls work up per loan with the most troubled loan first", () => {
    const groups = groupByLoan(
      [
        item({ id: "1", loan_number: "A" }),
        item({ id: "2", loan_number: "B", due_date: "2026-09-01" }),
        item({ id: "3", loan_number: "B", status: "COMPLETE" }),
      ],
      [{ loan_number: "B", borrower_last: "Bennett" }],
      today,
    );
    expect(groups[0].loan_number).toBe("B");
    expect(groups[0].borrower_last).toBe("Bennett");
    expect(groups[0].open).toBe(1);
    expect(groups[0].overdue).toBe(1);
  });
  it("summarizes every desk even when it has no work", () => {
    const rows = deskSummary([item({ status: "BLOCKED" })], today);
    expect(rows).toHaveLength(5);
    expect(rows.find((r) => r.department === "MLP")).toMatchObject({ open: 1, blocked: 1, unclaimed: 1 });
    expect(rows.find((r) => r.department === "CLOSING").open).toBe(0);
  });
  it("suggests the earliest phase with open work, without a lead phase", () => {
    const items = [
      item({ id: "x", template_id: "CD_REQUEST", status: "COMPLETE" }),
      item({ id: "y", template_id: "CADRE_HANDOFF" }),
    ];
    expect(suggestedPhase(items)).toBe("processing");
    expect(suggestedPhase([items[0]])).toBe("closing");
    expect(suggestedPhase([])).toBe("application");
    expect(phaseCounts(items).map((p) => p.id)).not.toContain("lead");
  });
  it("reads the newest block reason", () => {
    expect(
      blockedReason([
        { to_status: "BLOCKED", note: "Old", at: "2026-09-01T00:00:00Z" },
        { to_status: "QUEUED", note: "Unblocked", at: "2026-09-02T00:00:00Z" },
        { to_status: "BLOCKED", note: "Appraisal invoice missing", at: "2026-09-03T00:00:00Z" },
      ]),
    ).toBe("Appraisal invoice missing");
    expect(blockedReason([])).toBe("");
  });
});
