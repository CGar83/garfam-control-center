import { z } from "zod";
import { containsUnsafeSecret } from "@/lib/utils";

const text = z.string().trim().min(1).max(180);
const notes = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .refine(
    (v) => !containsUnsafeSecret(v),
    "Do not enter passwords or full account identifiers.",
  );
const money = z.coerce.number().finite().min(0).max(1e10);
const nullableNumber = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().finite().min(0).max(max).nullable(),
  );
export const financeDate = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, "Enter a valid date.")
    .nullable(),
);
const date = financeDate;

export const allocationFields = [
  ["housing", "Housing payments"],
  ["debt_minimums", "Debt minimums"],
  ["utilities", "Utilities & insurance"],
  ["groceries", "Groceries & household"],
  ["transportation", "Transportation"],
  ["health", "Health & medical"],
  ["subscription_cap", "Subscription allowance"],
  ["lifestyle_cap", "Life & enjoyment"],
  ["reserve_contribution", "Emergency reserve"],
] as const;

export const recoveryPlanSchema = z.object({
  name: text,
  monthly_income: money,
  housing: money,
  debt_minimums: money,
  utilities: money,
  groceries: money,
  transportation: money,
  health: money,
  subscription_cap: money,
  lifestyle_cap: money,
  reserve_contribution: money,
  reserve_target: money,
  reserve_saved: money,
  score: nullableNumber(850).refine(
    (v) => v === null || (v >= 300 && Number.isInteger(v)),
    "Use a whole score from 300 to 850.",
  ),
  score_model: z.string().trim().max(120).nullable().optional(),
  as_of_date: date,
  start_date: date,
  notes,
});
export const subscriptionSchema = z.object({
  name: text,
  amount: money,
  frequency: z.enum(["monthly", "annual", "quarterly", "weekly", "biweekly"]),
  decision: z.enum(["review", "keep", "cancel", "pause"]),
  status: z.enum(["active", "cancelled", "paused"]),
  renewal_date: date,
  recommendation: z.string().trim().max(300).nullable().optional(),
  notes,
});
export const assetSchema = z.object({
  name: text,
  category: z.enum(["cash", "property", "vehicle", "investment", "other"]),
  estimated_value: nullableNumber(1e10),
  debt: nullableNumber(1e10),
  as_of_date: date,
  notes,
});
export const installmentSchema = z.object({
  name: text,
  balance: money,
  monthly_payment: money,
  apr: nullableNumber(1),
  due_date: date,
  notes,
});
export const financeActionSchema = z.object({
  title: text,
  phase: z.enum([
    "today",
    "this_week",
    "this_month",
    "next_90_days",
    "ongoing",
  ]),
  status: z.enum(["not_started", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: date,
  notes,
});
export const recoverySchemas = {
  recovery_plans: recoveryPlanSchema,
  recovery_subscriptions: subscriptionSchema,
  financial_assets: assetSchema,
  installment_debts: installmentSchema,
  finance_actions: financeActionSchema,
};
export type RecoveryTable = keyof typeof recoverySchemas;
export type RecoveryPlanValues = z.infer<typeof recoveryPlanSchema>;
