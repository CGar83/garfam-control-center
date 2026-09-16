import { schemas } from "@/lib/schemas";
import type { DataStore } from "@/lib/types";
import { recoveryConfigs } from "./modules";
import { roundMoney } from "./calculations";

export type ImportTable =
  | "recovery_plans"
  | "recovery_subscriptions"
  | "financial_assets"
  | "installment_debts"
  | "finance_actions"
  | "credit_cards";
export interface ImportCandidate {
  table: ImportTable;
  name: string;
  values: Record<string, unknown>;
  source: string;
  warnings: string[];
}
export type SheetRows = Record<string, unknown[][]>;
const value = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const amount = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const parsed = Number(value(v).replace(/[$,]/g, ""));
  if (!Number.isFinite(parsed))
    throw new Error(
      "A source amount is invalid. Check the file before importing.",
    );
  return parsed;
};

function candidate(
  table: ImportTable,
  name: string,
  values: Record<string, unknown>,
  source: string,
  warnings: string[] = [],
): ImportCandidate {
  return {
    table,
    name,
    values: schemas[table].parse(values),
    source,
    warnings,
  };
}

export function parseRecoveryWorkbook(sheets: SheetRows): ImportCandidate[] {
  const results: ImportCandidate[] = [];
  const hub = sheets["Recovery Hub"];
  if (!hub)
    throw new Error('The workbook must contain a "Recovery Hub" sheet.');
  const cell = (row: number, col: number) => hub[row - 1]?.[col - 1];
  results.push(
    candidate(
      "recovery_plans",
      "Workbook recovery plan",
      {
        ...recoveryConfigs.recoveryPlan.defaultValues,
        name: "Recovery plan",
        monthly_income: amount(cell(5, 2)),
        housing: amount(cell(5, 5)),
        utilities: amount(cell(6, 5)),
        debt_minimums: amount(cell(7, 5)),
        groceries: amount(cell(8, 5)),
        transportation: amount(cell(9, 5)),
        health: amount(cell(10, 5)),
        subscription_cap: amount(cell(11, 5)),
        lifestyle_cap: amount(cell(12, 5)),
        reserve_contribution: amount(cell(15, 5)),
        notes:
          "Imported from Recovery Hub. Reserve target and saved balance need verification. Extra payoff is recalculated from income less allocations.",
      },
      "Workbook / Recovery Hub",
      [
        "Reserve target, reserve saved, and source date are not provided. Verify these after import.",
      ],
    ),
  );
  for (const row of (sheets["Recovery Subscriptions"] ?? []).slice(1, 38)) {
    if (!value(row[0]) || typeof row[1] !== "number") continue;
    results.push(
      candidate(
        "recovery_subscriptions",
        value(row[0]),
        {
          name: value(row[0]),
          amount: amount(row[1]),
          frequency: "monthly",
          decision: ["keep", "cancel", "pause"].includes(
            value(row[3]).toLowerCase(),
          )
            ? value(row[3]).toLowerCase()
            : "review",
          status: "active",
          renewal_date: null,
          recommendation: value(row[2]),
          notes: value(row[5]),
        },
        "Workbook / Recovery Subscriptions",
      ),
    );
  }
  const subscriptions = results.filter(
    (r) => r.table === "recovery_subscriptions",
  );
  const listed = roundMoney(
    subscriptions.reduce((s, r) => s + Number(r.values.amount), 0),
  );
  const stated = sheets["Recovery Subscriptions"]?.[40]?.[1];
  if (
    typeof stated === "number" &&
    Math.abs(stated - listed) > 0.01 &&
    subscriptions[0]
  ) {
    subscriptions[0].warnings.push(
      `Listed services total $${listed.toFixed(2)}; the workbook summary states $${stated.toFixed(2)}. The hub uses the listed records.`,
    );
  }
  for (const row of (sheets["Asset Register"] ?? []).slice(1)) {
    const name = value(row[0]);
    if (!name || name.toUpperCase() === "TOTAL") continue;
    results.push(
      candidate(
        "financial_assets",
        name,
        {
          name,
          category: /real estate/i.test(value(row[1]))
            ? "property"
            : /vehicle/i.test(value(row[1]))
              ? "vehicle"
              : "other",
          estimated_value:
            row[2] == null || row[2] === "" ? null : amount(row[2]),
          debt: row[3] == null || row[3] === "" ? null : amount(row[3]),
          as_of_date: null,
          notes: value(row[5]),
        },
        "Workbook / Asset Register",
      ),
    );
  }
  for (const row of (sheets["Credit Cards"] ?? []).slice(6, 18)) {
    if (!value(row[0]) || typeof row[3] !== "number") continue;
    results.push(
      candidate(
        "credit_cards",
        value(row[0]),
        {
          card_name: value(row[0]),
          issuer: value(row[1]),
          owner_name: value(row[2]),
          current_balance: amount(row[3]),
          credit_limit: amount(row[4]),
          apr: row[5] == null || row[5] === "" ? null : amount(row[5]),
          minimum_payment: amount(row[6]),
          extra_payment: amount(row[7]),
          statement_day: row[9] ?? null,
          due_day: row[10] ?? null,
          autopay: value(row[11]).toLowerCase() === "yes",
          notes:
            "Imported from workbook Credit Cards; verify against the latest statement.",
        },
        "Workbook / Credit Cards",
        [
          "The source row includes a sample annotation. Verify balance, APR, autopay, and payment before selecting.",
        ],
      ),
    );
  }
  return results;
}

export function parseRecoveryHtml(html: string): ImportCandidate[] {
  // DOMParser creates an inert document. Never mount the attached HTML or execute its scripts.
  const doc = new DOMParser().parseFromString(html, "text/html");
  const results: ImportCandidate[] = [];
  const sections = Array.from(doc.querySelectorAll(".card"));
  const section = (heading: RegExp) =>
    sections.find((s) =>
      heading.test(s.querySelector("h2")?.textContent ?? ""),
    );
  const rows = (heading: RegExp) =>
    Array.from(section(heading)?.querySelectorAll("tr") ?? [])
      .slice(1)
      .map((row) =>
        Array.from(row.querySelectorAll("td")).map(
          (c) => c.textContent?.trim() ?? "",
        ),
      );
  const waterfall = rows(/money waterfall/i);
  if (!waterfall.length)
    throw new Error(
      "This HTML does not contain the expected recovery waterfall.",
    );
  const amountStarting = (s: string) =>
    amount(s.match(/\$?[\d,]+(?:\.\d+)?/)?.[0] ?? "0");
  const allocation = (pattern: RegExp) =>
    waterfall
      .filter((r) => pattern.test(r[0]))
      .reduce((s, r) => s + amountStarting(r[1]), 0);
  const kpi = (pattern: RegExp) =>
    sections
      .find((s) => pattern.test(s.querySelector(".label")?.textContent ?? ""))
      ?.querySelector(".kpi")?.textContent ?? "";
  const reserveText = waterfall.find((r) => /emergency/i.test(r[0]))?.[2] ?? "";
  const reserveTarget = reserveText.match(/\$[\d,]+(?:\.\d+)?/)?.[0];
  const scoreModel =
    sections
      .find((s) =>
        /score baseline/i.test(s.querySelector(".label")?.textContent ?? ""),
      )
      ?.querySelector(".subtle")
      ?.textContent?.replace(/\s+baseline\.?\s*$/i, "")
      .trim() || null;
  results.push(
    candidate(
      "recovery_plans",
      "HTML recovery plan",
      {
        ...recoveryConfigs.recoveryPlan.defaultValues,
        name: "Recovery plan",
        monthly_income: amountStarting(kpi(/income baseline/i)),
        housing: allocation(/mortgage|home equity/i),
        debt_minimums: allocation(/credit-card|auto \+ upgrade/i),
        utilities: allocation(/utilities/i),
        groceries: allocation(/groceries/i),
        transportation: allocation(/transportation/i),
        health: allocation(/health/i),
        subscription_cap: allocation(/subscriptions/i),
        lifestyle_cap: allocation(/life \+/i),
        reserve_contribution: allocation(/emergency/i),
        reserve_target: reserveTarget ? amount(reserveTarget) : 0,
        score: kpi(/score baseline/i)
          ? amountStarting(kpi(/score baseline/i))
          : null,
        score_model: scoreModel,
        notes:
          "Imported HTML planning assumptions. Source date and current reserve savings are not supplied.",
      },
      "HTML / Money waterfall",
      [
        "This plan differs from the workbook. Choose one, then verify the amounts and statement dates.",
        "Current reserve savings are not supplied. Verify the reserve target and saved balance after import.",
      ],
    ),
  );
  for (const r of rows(/card-by-card/i)) {
    results.push(
      candidate(
        "credit_cards",
        r[0],
        {
          card_name: r[0],
          issuer: r[0].replace(/\s+\d+$/, ""),
          current_balance: amount(r[1]),
          credit_limit: amount(r[2]),
          apr: null,
          minimum_payment: 0,
          extra_payment: 0,
          autopay: false,
          notes:
            "HTML snapshot. APR, individual minimum, statement date, and autopay require verification.",
        },
        "HTML / Card recovery targets",
        [
          "APR and individual minimums were not supplied. Add them before relying on payoff projections.",
        ],
      ),
    );
  }
  for (const r of rows(/subscription cuts/i)) {
    results.push(
      candidate(
        "recovery_subscriptions",
        r[0],
        {
          name: r[0],
          amount: amount(r[1]),
          frequency: "monthly",
          decision: "review",
          status: "active",
          renewal_date: null,
          recommendation: r[2],
          notes:
            "Source recommendation only; no cancellation has been performed.",
        },
        "HTML / Subscriptions",
      ),
    );
  }
  for (const r of rows(/small-balance/i)) {
    results.push(
      candidate(
        "installment_debts",
        r[0],
        {
          name: r[0],
          balance: amountStarting(r[1]),
          monthly_payment: amountStarting(r[2]),
          apr: null,
          due_date: null,
          notes: r[3],
        },
        "HTML / Small-balance sweep",
      ),
    );
  }
  for (const item of Array.from(
    section(/90-day/i)?.querySelectorAll(".txt") ?? [],
  )) {
    const full = item.textContent?.trim() ?? "";
    const prefix = full.split(":")[0].toLowerCase();
    const title = full.slice(full.indexOf(":") + 1).trim();
    results.push(
      candidate(
        "finance_actions",
        title,
        {
          title,
          phase:
            prefix === "today"
              ? "today"
              : prefix === "this week"
                ? "this_week"
                : prefix === "this month"
                  ? "this_month"
                  : prefix === "ongoing"
                    ? "ongoing"
                    : "next_90_days",
          status: "not_started",
          priority: prefix === "today" ? "high" : "medium",
          due_date: null,
          notes:
            "Imported planning action. Timing is a goal, not a guaranteed credit outcome.",
        },
        "HTML / Action checklist",
      ),
    );
  }
  return results;
}

export function importIdentity(
  table: ImportTable,
  values: Record<string, unknown>,
) {
  if (table === "recovery_plans") return "recovery_plans:plan";
  const name =
    table === "credit_cards"
      ? `${values.issuer || values.card_name} ${values.credit_limit}`
      : (values.name ?? values.title);
  return `${table}:${String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}`;
}

export function existingImportRecord(
  candidate: ImportCandidate,
  data: DataStore,
  familyId: string,
) {
  return data[candidate.table].find(
    (r) =>
      r.family_id === familyId &&
      importIdentity(
        candidate.table,
        r as unknown as Record<string, unknown>,
      ) === importIdentity(candidate.table, candidate.values),
  );
}
