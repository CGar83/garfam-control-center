import { describe, expect, it } from "vitest";
import {
  monthlyEquivalent,
  paydownBelow,
  payoffProjection,
  recoverySummary,
  subscriptionScenario,
} from "@/lib/finance/calculations";
import { validateFinanceValues, proposalSchema } from "@/lib/finance/assistant";
import {
  assetSchema,
  recoveryPlanSchema,
  subscriptionSchema,
} from "@/lib/finance/schemas";
import {
  parseRecoveryWorkbook,
  parseRecoveryHtml,
  importIdentity,
  type SheetRows,
} from "@/lib/finance/import";
import { recoveryConfigs } from "@/lib/finance/modules";
import type {
  RecoveryPlan,
  RecoverySubscription,
  FinancialAsset,
} from "@/lib/types";

describe("financial calculations", () => {
  it("keeps what-if cuts separate and treats invalid targets as unknown", () => {
    expect(subscriptionScenario(200, "75.50")).toEqual({
      monthly: 124.5,
      annual: 1494,
    });
    expect(subscriptionScenario(100, "200")).toEqual({
      monthly: -100,
      annual: -1200,
    });
    for (const target of ["", " ", "-1", "bad", "Infinity"])
      expect(subscriptionScenario(200, target)).toBeNull();
  });
  it("targets strictly below the threshold, including fractional-cent limits", () => {
    expect(paydownBelow(1000, 1000, 0.9)).toBe(100.01);
    expect(paydownBelow(900, 1000, 0.9)).toBe(0.01);
    expect(paydownBelow(899.99, 1000, 0.9)).toBe(0);
    expect(paydownBelow(100, 100.01, 0.3)).toBe(70);
    expect(paydownBelow(100, 0, 0.3)).toBeNull();
  });
  it("normalizes billing frequencies without counting cancellation plans as completed", () => {
    expect(monthlyEquivalent(120, "annual")).toBe(10);
    expect(monthlyEquivalent(30, "quarterly")).toBe(10);
    expect(monthlyEquivalent(12, "weekly")).toBe(52);
    expect(monthlyEquivalent(24, "biweekly")).toBe(52);
    const subs = [
      {
        amount: 120,
        frequency: "annual",
        decision: "cancel",
        status: "active",
      },
      {
        amount: 20,
        frequency: "monthly",
        decision: "cancel",
        status: "cancelled",
      },
    ] as RecoverySubscription[];
    const result = recoverySummary(undefined, [], subs, [], []);
    expect(result.currentRecurring).toBe(10);
    expect(result.potentialSavings).toBe(10);
    expect(result.projectedRecurring).toBe(0);
  });
  it("keeps deficits and excludes unknown equity", () => {
    const plan = {
      ...recoveryConfigs.recoveryPlan.defaultValues,
      monthly_income: 1000,
      housing: 1200,
    } as RecoveryPlan;
    const assets = [
      { estimated_value: 1000, debt: null },
      { estimated_value: 500, debt: 200 },
    ] as FinancialAsset[];
    const result = recoverySummary(plan, [], [], assets, []);
    expect(result.surplus).toBe(-200);
    expect(result.incompleteAssets).toBe(1);
    expect(result.knownEquity).toBe(300);
    expect(result.utilization).toBeNull();
  });
  it("handles unknown APR, no progress, zero interest, and interest-bearing payoff", () => {
    expect(payoffProjection(1000, null, 100).months).toBeNull();
    expect(payoffProjection(1000, 0.24, 10).reason).toContain(
      "does not reduce",
    );
    expect(payoffProjection(1000, 0, 100)).toEqual({
      months: 10,
      interest: 0,
      reason: null,
    });
    expect(payoffProjection(1000, 0.12, 100).months).toBe(11);
  });
});

describe("finance validation and action boundaries", () => {
  it("rejects invalid dates, negative money, and out-of-range scores", () => {
    const base = recoveryConfigs.recoveryPlan.defaultValues;
    expect(
      recoveryPlanSchema.safeParse({ ...base, monthly_income: -1 }).success,
    ).toBe(false);
    expect(
      recoveryPlanSchema.safeParse({ ...base, as_of_date: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(recoveryPlanSchema.safeParse({ ...base, score: 900 }).success).toBe(
      false,
    );
    expect(
      recoveryPlanSchema.parse({ ...base, score: "", as_of_date: "" }).score,
    ).toBeNull();
    expect(
      assetSchema.parse({
        name: "Car",
        category: "vehicle",
        estimated_value: "",
        debt: "",
        as_of_date: "",
      }).debt,
    ).toBeNull();
  });
  it("never accepts family changes or unexpected columns from a model", () => {
    expect(() =>
      validateFinanceValues("finance_actions", "update", {
        family_id: "another-family",
      }),
    ).toThrow();
    expect(() =>
      validateFinanceValues("finance_actions", "update", {
        sql: "delete everything",
      }),
    ).toThrow();
    expect(() =>
      validateFinanceValues("credit_cards", "update", { current_balance: -1 }),
    ).toThrow();
    expect(() => validateFinanceValues("bills", "update", {})).toThrow();
    expect(() =>
      validateFinanceValues("bills", "update", { due_date: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      validateFinanceValues("credit_cards", "update", {
        password_location: "Some vault",
      }),
    ).toThrow();
    expect(
      validateFinanceValues("credit_cards", "update", { current_balance: 55 }),
    ).toEqual({ current_balance: 55 });
    expect(
      proposalSchema.safeParse({ table: "family_members", operation: "delete" })
        .success,
    ).toBe(false);
  });
  it("validates create fields and does not fill unrelated defaults in partial updates", () => {
    expect(() =>
      validateFinanceValues("finance_actions", "create", {
        title: "Missing fields",
      }),
    ).toThrow();
    expect(
      validateFinanceValues("recovery_subscriptions", "update", {
        decision: "cancel",
      }),
    ).toEqual({ decision: "cancel" });
    expect(
      subscriptionSchema.safeParse({
        name: "Service",
        amount: 10,
        frequency: "daily",
        decision: "review",
        status: "active",
      }).success,
    ).toBe(false);
  });
});

describe("source integration", () => {
  it("imports workbook data without sample transactions and flags inconsistent totals", () => {
    const hub = Array.from({ length: 17 }, () => Array<unknown>(5).fill(null));
    hub[4][1] = 5000;
    const rows: SheetRows = {
      "Recovery Hub": hub,
      "Recovery Subscriptions": Array.from({ length: 44 }, () =>
        Array<unknown>(6).fill(null),
      ),
      "Asset Register": [
        ["Asset"],
        ["Home", "Real Estate", null, null],
        ["TOTAL", null, 20],
      ],
      Transactions: [["Sample paycheck", 9000]],
      "Credit Cards": Array.from({ length: 7 }, () => []),
    };
    rows["Recovery Subscriptions"][1] = [
      "Sample service",
      10,
      "Cancel",
      null,
      null,
      "Source rationale",
    ];
    rows["Recovery Subscriptions"][40] = ["Current recurring estimate", 20];
    rows["Credit Cards"][6] = [
      "Example Visa",
      "Example",
      "Household",
      100,
      1000,
      null,
      25,
      0,
      25,
      null,
      null,
      "No",
    ];
    const result = parseRecoveryWorkbook(rows);
    expect(result).toHaveLength(4);
    expect(
      result.find((r) => r.table === "financial_assets")?.values
        .estimated_value,
    ).toBeNull();
    expect(
      result.find((r) => r.table === "recovery_subscriptions")?.values.decision,
    ).toBe("review");
    expect(
      result.find((r) => r.table === "recovery_subscriptions")?.warnings[0],
    ).toContain("$10.00");
    expect(
      result.find((r) => r.table === "credit_cards")?.values.apr,
    ).toBeNull();
    expect(
      result.some((r) => (r.table as string) === "financial_transactions"),
    ).toBe(false);
  });
  it("parses HTML as inert data and does not execute source scripts", () => {
    const html =
      '<div class="card"><div class="label">Income baseline</div><div class="kpi">$5,000/mo</div></div><div class="card"><h2>Monthly money waterfall</h2><table><tr><th>Name</th></tr><tr><td>Mortgage</td><td>$2,000</td></tr></table></div><script>window.sourceScriptRan=true</script>';
    const result = parseRecoveryHtml(html);
    expect(result[0].values.monthly_income).toBe(5000);
    expect(result[0].values.housing).toBe(2000);
    expect(result[0].values.score_model).toBeNull();
    expect(result[0].values.reserve_target).toBe(0);
    expect(
      (window as unknown as Record<string, unknown>).sourceScriptRan,
    ).toBeUndefined();
  });
  it("reads reserve targets and score labels from the source rather than hardcoding a household", () => {
    const html =
      '<div class="card"><div class="label">Income baseline</div><div class="kpi">$5000</div></div><div class="card"><div class="label">Credit score baseline</div><div class="kpi">700</div><div class="subtle">Example model baseline.</div></div><div class="card"><h2>Money waterfall</h2><table><tr><th>Name</th></tr><tr><td>Emergency reserve</td><td>$200</td><td>Build to a $2500 reserve.</td></tr></table></div>';
    const plan = parseRecoveryHtml(html)[0].values;
    expect(plan.score_model).toBe("Example model");
    expect(plan.reserve_target).toBe(2500);
    expect(plan.reserve_contribution).toBe(200);
  });
  it("matches the same card across sources and keeps different limits distinct", () => {
    expect(
      importIdentity("credit_cards", {
        issuer: "Example Bank",
        card_name: "Example Visa",
        credit_limit: 1000,
      }),
    ).toBe(
      importIdentity("credit_cards", {
        issuer: "Example Bank",
        card_name: "Example",
        credit_limit: 1000,
      }),
    );
    expect(
      importIdentity("credit_cards", { issuer: "Example", credit_limit: 1000 }),
    ).not.toBe(
      importIdentity("credit_cards", { issuer: "Example", credit_limit: 2000 }),
    );
  });
});
