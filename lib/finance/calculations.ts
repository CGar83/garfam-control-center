import type {
  CreditCard,
  FinancialAsset,
  InstallmentDebt,
  RecoveryPlan,
  RecoverySubscription,
} from "@/lib/types";
import { allocationFields } from "./schemas";

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export const roundMoney = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export function subscriptionScenario(current: number, target: string) {
  if (!target.trim()) return null;
  const amount = Number(target);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e10) return null;
  const monthly = roundMoney(current - amount);
  return { monthly, annual: roundMoney(monthly * 12) };
}

export function monthlyEquivalent(
  amount: number,
  frequency: RecoverySubscription["frequency"],
) {
  return roundMoney(
    amount *
      {
        monthly: 1,
        annual: 1 / 12,
        quarterly: 1 / 3,
        weekly: 52 / 12,
        biweekly: 26 / 12,
      }[frequency],
  );
}

// One cent below the threshold, computed in cents to avoid floating point boundary errors.
export function paydownBelow(
  balance: number,
  limit: number,
  threshold: number,
): number | null {
  if (!Number.isFinite(limit) || limit <= 0 || threshold <= 0 || threshold > 1)
    return null;
  const targetCents = Math.max(
    0,
    Math.ceil(Math.round(limit * 100) * threshold - 1e-8) - 1,
  );
  return Math.max(0, Math.round(balance * 100) - targetCents) / 100;
}

export function recoverySummary(
  plan: RecoveryPlan | undefined,
  cards: CreditCard[],
  subscriptions: RecoverySubscription[],
  assets: FinancialAsset[],
  debts: InstallmentDebt[],
) {
  const allocated = roundMoney(
    plan ? allocationFields.reduce((sum, [key]) => sum + plan[key], 0) : 0,
  );
  const balance = roundMoney(
    cards.reduce((sum, card) => sum + Number(card.current_balance), 0),
  );
  const limit = roundMoney(
    cards.reduce((sum, card) => sum + Number(card.credit_limit), 0),
  );
  const currentRecurring = roundMoney(
    subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.frequency), 0),
  );
  const potentialSavings = roundMoney(
    subscriptions
      .filter(
        (s) =>
          s.status === "active" && ["cancel", "pause"].includes(s.decision),
      )
      .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.frequency), 0),
  );
  const knownEquity = roundMoney(
    assets
      .filter((a) => a.estimated_value !== null && a.debt !== null)
      .reduce((sum, a) => sum + a.estimated_value! - a.debt!, 0),
  );
  return {
    allocated,
    balance,
    limit,
    utilization:
      limit > 0 && cards.every((c) => c.credit_limit > 0)
        ? balance / limit
        : null,
    surplus: plan ? roundMoney(plan.monthly_income - allocated) : null,
    currentRecurring,
    potentialSavings,
    projectedRecurring: roundMoney(currentRecurring - potentialSavings),
    knownEquity,
    incompleteAssets: assets.filter(
      (a) => a.estimated_value === null || a.debt === null,
    ).length,
    debtBalance: roundMoney(debts.reduce((s, d) => s + d.balance, 0)),
    debtPayments: roundMoney(
      debts
        .filter((d) => d.balance > 0)
        .reduce((s, d) => s + d.monthly_payment, 0),
    ),
  };
}

export function payoffProjection(
  balance: number,
  apr: number | null,
  monthlyPayment: number,
  months = 120,
) {
  if (apr === null) return { months: null, interest: null, reason: "Add APR" };
  let remaining = Math.round(balance * 100);
  let interest = 0;
  const payment = Math.round(monthlyPayment * 100);
  if (remaining <= 0) return { months: 0, interest: 0, reason: null };
  if (payment <= Math.round((remaining * apr) / 12))
    return {
      months: null,
      interest: null,
      reason: "Payment does not reduce the balance",
    };
  for (let month = 1; month <= months; month++) {
    const charge = Math.round((remaining * apr) / 12);
    interest += charge;
    remaining = Math.max(0, remaining + charge - payment);
    if (remaining === 0)
      return { months: month, interest: interest / 100, reason: null };
  }
  return {
    months: null,
    interest: interest / 100,
    reason: `More than ${months} months`,
  };
}
