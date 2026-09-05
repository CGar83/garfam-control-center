"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarMonths, format, isBefore, parseISO, startOfMonth } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Plus,
  ReceiptText,
  Target,
  TrendingDown,
  WalletCards
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateBadge } from "@/components/app/date-badge";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PrivacyMask } from "@/components/app/privacy-mask";
import { StatCard } from "@/components/app/stat-card";
import { DataTable } from "@/components/pages/data-table";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useAppData } from "@/components/app/providers";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";
import type { BudgetCategory, CreditCard as CreditCardRecord, FinancialTransaction, SinkingFund } from "@/lib/types";
import { isDueSoon, parseMaybeDate, safeNumber, titleCase } from "@/lib/utils";

type BudgetModuleKey = Extract<ModuleKey, "budgetSettings" | "budgetCategories" | "transactions" | "creditCards" | "sinkingFunds" | "bills">;

interface BudgetRow {
  record: BudgetCategory;
  actual: number;
  available: number;
  variance: number;
  endingBalance: number;
  percentUsed: number;
  status: "Over" | "Watch" | "On Track" | "Not Started";
}

interface GroupSummary {
  group: string;
  available: number;
  actual: number;
  remaining: number;
}

const moneyFormatter = Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function money(value: number) {
  return moneyFormatter.format(value);
}

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function MaskedMoney({ value }: { value: number }) {
  const formatted = money(value);
  return (
    <PrivacyMask value={formatted} sensitive>
      {formatted}
    </PrivacyMask>
  );
}

function MaskedPercent({ value }: { value: number }) {
  const formatted = percent(value);
  return (
    <PrivacyMask value={formatted} sensitive>
      {formatted}
    </PrivacyMask>
  );
}

function monthKey(value?: string | null) {
  const parsed = parseMaybeDate(value);
  return parsed ? format(parsed, "yyyy-MM") : "";
}

function monthStart(value: string) {
  const parsed = parseMaybeDate(value);
  return parsed ? startOfMonth(parsed) : startOfMonth(new Date());
}

function monthLabel(value: string) {
  return format(monthStart(value), "MMMM yyyy");
}

function utilizationStatus(value: number, highAlert: number, target: number, excellent: number) {
  if (value >= highAlert) return { label: "High", variant: "destructive" as const };
  if (value > target) return { label: "Reduce", variant: "warning" as const };
  if (value <= excellent) return { label: "Excellent", variant: "success" as const };
  return { label: "On Target", variant: "info" as const };
}

function plannedPayment(card: CreditCardRecord) {
  return safeNumber(card.minimum_payment) + safeNumber(card.extra_payment);
}

function cardUtilization(card: CreditCardRecord) {
  const limit = safeNumber(card.credit_limit);
  return limit > 0 ? safeNumber(card.current_balance) / limit : 0;
}

function actualByCategory(transactions: FinancialTransaction[]) {
  return transactions.reduce<Record<string, number>>((acc, transaction) => {
    if (transaction.transaction_type !== "expense") return acc;
    acc[transaction.category] = (acc[transaction.category] ?? 0) + safeNumber(transaction.amount);
    return acc;
  }, {});
}

function buildBudgetRows(categories: BudgetCategory[], transactions: FinancialTransaction[], includePriorBalances: boolean): BudgetRow[] {
  const actuals = actualByCategory(transactions);

  return categories.map((record) => {
    const actual = actuals[record.category] ?? 0;
    const available = safeNumber(record.monthly_plan) + (includePriorBalances && record.rollover ? safeNumber(record.prior_balance) : 0);
    const variance = safeNumber(record.monthly_plan) - actual;
    const endingBalance = available - actual;
    const percentUsed = available > 0 ? actual / available : actual > 0 ? 1 : 0;
    const status = actual > available && available > 0 ? "Over" : percentUsed >= 0.85 ? "Watch" : actual > 0 ? "On Track" : "Not Started";

    return { record, actual, available, variance, endingBalance, percentUsed, status };
  });
}

function buildGroupSummaries(rows: BudgetRow[]): GroupSummary[] {
  const grouped = rows.reduce<Record<string, GroupSummary>>((acc, row) => {
    const group = row.record.group_name;
    const existing = acc[group] ?? { group, available: 0, actual: 0, remaining: 0 };
    existing.available += row.available;
    existing.actual += row.actual;
    existing.remaining += row.endingBalance;
    acc[group] = existing;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.actual - a.actual);
}

function statusVariant(status: BudgetRow["status"]) {
  if (status === "Over") return "destructive";
  if (status === "Watch") return "warning";
  if (status === "On Track") return "success";
  return "outline";
}

function BudgetVarianceTable({ rows }: { rows: BudgetRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No budget categories for this month"
        description="Add budget categories to compare monthly plan, actual spending, variance, and rollover balances."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Ending Balance</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.record.id}>
                  <TableCell>{row.record.group_name}</TableCell>
                  <TableCell className="font-medium">{row.record.category}</TableCell>
                  <TableCell>{titleCase(row.record.need_want_goal)}</TableCell>
                  <TableCell>
                    <MaskedMoney value={row.available} />
                  </TableCell>
                  <TableCell>
                    <MaskedMoney value={row.actual} />
                  </TableCell>
                  <TableCell>
                    <MaskedMoney value={row.variance} />
                  </TableCell>
                  <TableCell>
                    <MaskedMoney value={row.endingBalance} />
                  </TableCell>
                  <TableCell>
                    <PrivacyMask value={percent(row.percentUsed)} sensitive>
                      {percent(row.percentUsed)}
                    </PrivacyMask>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupSummaryGrid({ groups }: { groups: GroupSummary[] }) {
  if (!groups.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {groups.slice(0, 8).map((group) => (
        <Card key={group.group}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{group.group}</p>
              <Badge variant={group.remaining < 0 ? "destructive" : "info"}>
                <PrivacyMask value={money(group.remaining)} sensitive>
                  {money(group.remaining)}
                </PrivacyMask>
              </Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-[#CC5500]"
                style={{ width: `${Math.min(100, group.available > 0 ? (group.actual / group.available) * 100 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <PrivacyMask value={`${money(group.actual)} of ${money(group.available)}`} sensitive>
                {money(group.actual)} of {money(group.available)}
              </PrivacyMask>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreditCardPanel({
  cards,
  highAlert,
  target,
  excellent
}: {
  cards: CreditCardRecord[];
  highAlert: number;
  target: number;
  excellent: number;
}) {
  if (!cards.length) {
    return <EmptyState title="No credit cards tracked" description="Add card balances and limits to calculate utilization and paydown targets." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Card Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cards
            .slice()
            .sort((a, b) => cardUtilization(b) - cardUtilization(a))
            .map((card) => {
              const utilization = cardUtilization(card);
              const status = utilizationStatus(utilization, highAlert, target, excellent);
              const targetBalance = safeNumber(card.credit_limit) * target;
              const excellentBalance = safeNumber(card.credit_limit) * excellent;

              return (
                <div key={card.id} className="rounded-lg border bg-white/70 p-4 dark:bg-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{card.card_name}</p>
                      <p className="text-sm text-muted-foreground">{card.issuer || "Issuer not set"}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-[#CC5500]" style={{ width: `${Math.min(100, utilization * 100)}%` }} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                    <span>
                      Balance: <MaskedMoney value={safeNumber(card.current_balance)} />
                    </span>
                    <span>
                      Limit: <MaskedMoney value={safeNumber(card.credit_limit)} />
                    </span>
                    <span>
                      Utilization: <MaskedPercent value={utilization} />
                    </span>
                    <span>
                      Payment: <MaskedMoney value={plannedPayment(card)} />
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>30% target balance: {<MaskedMoney value={targetBalance} />}</span>
                    <span>10% target balance: {<MaskedMoney value={excellentBalance} />}</span>
                    <span>Due: {card.due_date ? <DateBadge value={card.due_date} /> : "No due date"}</span>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilization Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50/75 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>These thresholds are planning aids, not a guarantee of any credit score or approval result.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>90%</TableHead>
                  <TableHead>50%</TableHead>
                  <TableHead>30%</TableHead>
                  <TableHead>10%</TableHead>
                  <TableHead>5%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.card_name}</TableCell>
                    {[0.9, 0.5, 0.3, 0.1, 0.05].map((band) => (
                      <TableCell key={band}>
                        <MaskedMoney value={safeNumber(card.credit_limit) * band} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DebtPayoffPanel({ cards, strategy }: { cards: CreditCardRecord[]; strategy: string }) {
  const sorted = cards
    .filter((card) => safeNumber(card.current_balance) > 0)
    .slice()
    .sort((a, b) =>
      strategy === "snowball"
        ? safeNumber(a.current_balance) - safeNumber(b.current_balance)
        : safeNumber(b.apr) - safeNumber(a.apr)
    );

  if (!sorted.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debt Payoff Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Strategy: <span className="font-medium text-foreground">{titleCase(strategy)}</span>. Projection uses current balance, APR, minimum payment, and extra payment.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Planned Payment</TableHead>
                <TableHead>Monthly Interest</TableHead>
                <TableHead>Simple Months</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((card, index) => {
                const payment = plannedPayment(card);
                const balance = safeNumber(card.current_balance);
                const interest = (balance * safeNumber(card.apr)) / 12;
                const months = payment > 0 ? Math.ceil(balance / payment) : null;

                return (
                  <TableRow key={card.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{card.card_name}</TableCell>
                    <TableCell>{percent(safeNumber(card.apr))}</TableCell>
                    <TableCell>
                      <MaskedMoney value={balance} />
                    </TableCell>
                    <TableCell>
                      <MaskedMoney value={payment} />
                    </TableCell>
                    <TableCell>
                      <MaskedMoney value={interest} />
                    </TableCell>
                    <TableCell>{months ?? "Set payment"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SinkingFundPanel({ funds }: { funds: SinkingFund[] }) {
  if (!funds.length) {
    return <EmptyState title="No sinking funds tracked" description="Add savings goals for irregular expenses before they become emergencies." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {funds.map((fund) => {
        const target = safeNumber(fund.target_amount);
        const saved = safeNumber(fund.saved_so_far);
        const remaining = Math.max(0, target - saved);
        const targetDate = parseMaybeDate(fund.target_date);
        const monthsLeft = targetDate ? Math.max(1, differenceInCalendarMonths(targetDate, new Date()) + 1) : null;
        const recommended = monthsLeft ? remaining / monthsLeft : 0;
        const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
        const onTrack = safeNumber(fund.planned_monthly) >= recommended;

        return (
          <Card key={fund.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{fund.goal}</p>
                  <p className="text-sm text-muted-foreground">{fund.category}</p>
                </div>
                <Badge variant={onTrack ? "success" : "warning"}>{onTrack ? "On Track" : "Needs More"}</Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-[#ACE1AF]" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <span>
                  Saved: <MaskedMoney value={saved} /> of <MaskedMoney value={target} />
                </span>
                <span>
                  Remaining: <MaskedMoney value={remaining} />
                </span>
                <span>
                  Recommended monthly: <MaskedMoney value={recommended} />
                </span>
                <span>
                  Planned monthly: <MaskedMoney value={safeNumber(fund.planned_monthly)} />
                </span>
              </div>
              <div className="mt-3">{fund.target_date ? <DateBadge value={fund.target_date} /> : <Badge variant="outline">No target date</Badge>}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AnnualSummaryTable({ transactions, budgetYear }: { transactions: FinancialTransaction[]; budgetYear: number }) {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(budgetYear, index, 1);
    const key = format(monthDate, "yyyy-MM");
    const monthTransactions = transactions.filter((transaction) => monthKey(transaction.transaction_date) === key);
    const income = monthTransactions
      .filter((transaction) => transaction.transaction_type === "income")
      .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
    const spending = monthTransactions
      .filter((transaction) => transaction.transaction_type === "expense")
      .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
    const savings = income - spending;

    return { key, label: format(monthDate, "MMM"), income, spending, savings };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Spending</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Savings Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>
                    <MaskedMoney value={row.income} />
                  </TableCell>
                  <TableCell>
                    <MaskedMoney value={row.spending} />
                  </TableCell>
                  <TableCell>
                    <MaskedMoney value={row.savings} />
                  </TableCell>
                  <TableCell>
                    <MaskedPercent value={row.income > 0 ? row.savings / row.income : 0} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BudgetPage() {
  const { data } = useAppData();
  useRealtimeTable("budget_settings");
  useRealtimeTable("budget_categories");
  useRealtimeTable("financial_transactions");
  useRealtimeTable("credit_cards");
  useRealtimeTable("sinking_funds");
  useRealtimeTable("bills");
  const [activeDialog, setActiveDialog] = useState<BudgetModuleKey | null>(null);
  const sortedSettings = useMemo(
    () =>
      data.budget_settings
        .slice()
        .sort((a, b) => monthStart(b.budget_month).getTime() - monthStart(a.budget_month).getTime()),
    [data.budget_settings]
  );
  const settings = sortedSettings[0] ?? null;
  const selectedMonth = settings?.budget_month ?? format(startOfMonth(new Date()), "yyyy-MM-dd");
  const selectedMonthKey = monthKey(selectedMonth);
  const monthCategories = data.budget_categories.filter((category) => monthKey(category.budget_month) === selectedMonthKey);
  const monthTransactions = data.financial_transactions.filter((transaction) => monthKey(transaction.transaction_date) === selectedMonthKey);
  const includePriorBalances = settings?.include_prior_category_balances ?? true;
  const budgetRows = buildBudgetRows(monthCategories, monthTransactions, includePriorBalances);
  const groupSummaries = buildGroupSummaries(budgetRows);

  const actualIncome = monthTransactions
    .filter((transaction) => transaction.transaction_type === "income")
    .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
  const actualSpending = monthTransactions
    .filter((transaction) => transaction.transaction_type === "expense")
    .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
  const availableBudget = budgetRows.reduce((sum, row) => sum + row.available, 0);
  const savings = actualIncome - actualSpending;
  const savingsRate = actualIncome > 0 ? savings / actualIncome : 0;
  const budgetRemaining = availableBudget - actualSpending;
  const cardDebt = data.credit_cards.reduce((sum, card) => sum + safeNumber(card.current_balance), 0);
  const creditLimit = data.credit_cards.reduce((sum, card) => sum + safeNumber(card.credit_limit), 0);
  const overallUtilization = creditLimit > 0 ? cardDebt / creditLimit : 0;
  const upcomingBills = data.bills.filter((bill) => bill.status !== "paid" && bill.due_date && isDueSoon(bill.due_date, 14));
  const overdueBills = data.bills.filter((bill) => bill.status === "overdue" || (bill.due_date && isBefore(parseISO(bill.due_date), new Date())));
  const targetUtilization = settings?.target_utilization ?? 0.3;
  const excellentUtilization = settings?.excellent_utilization ?? 0.1;
  const highUtilizationAlert = settings?.high_utilization_alert ?? 0.5;
  const budgetYear = settings?.budget_year ?? new Date().getFullYear();

  const dialogConfig = activeDialog ? moduleConfigs[activeDialog] : null;
  const dialogDefaults = activeDialog
    ? {
        budget_month: selectedMonth,
        budget_year: budgetYear,
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        due_date: "",
        target_date: ""
      }
    : undefined;

  const addButtons: Array<{ key: BudgetModuleKey; label: string; icon: typeof Plus }> = [
    { key: "transactions", label: "Transaction", icon: Banknote },
    { key: "budgetCategories", label: "Category", icon: FileSpreadsheet },
    { key: "creditCards", label: "Credit Card", icon: CreditCard },
    { key: "sinkingFunds", label: "Sinking Fund", icon: Target },
    { key: "bills", label: "Bill", icon: ReceiptText },
    { key: "budgetSettings", label: "Settings", icon: WalletCards }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget & Cards"
        description={`Workbook-style monthly budget, credit utilization, payoff planning, sinking funds, and annual money summary for ${monthLabel(selectedMonth)}.`}
      />

      <div className="flex flex-wrap gap-2">
        {addButtons.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.key} variant={item.key === "transactions" ? "default" : "outline"} onClick={() => setActiveDialog(item.key)}>
              <Icon className="h-4 w-4" />
              Add {item.label}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Actual Income" value={<MaskedMoney value={actualIncome} />} icon={<Banknote className="h-5 w-5" />} tone="sage" />
        <StatCard label="Actual Spending" value={<MaskedMoney value={actualSpending} />} icon={<ReceiptText className="h-5 w-5" />} tone={actualSpending > availableBudget ? "red" : "yellow"} />
        <StatCard label="Savings Rate" value={<MaskedPercent value={savingsRate} />} icon={<TrendingDown className="h-5 w-5" />} tone={savingsRate >= 0.15 ? "green" : "yellow"} />
        <StatCard label="Budget Remaining" value={<MaskedMoney value={budgetRemaining} />} icon={<FileSpreadsheet className="h-5 w-5" />} tone={budgetRemaining < 0 ? "red" : "green"} />
        <StatCard label="Total Card Debt" value={<MaskedMoney value={cardDebt} />} icon={<CreditCard className="h-5 w-5" />} tone={cardDebt ? "yellow" : "green"} />
        <StatCard label="Overall Utilization" value={<MaskedPercent value={overallUtilization} />} icon={<WalletCards className="h-5 w-5" />} tone={overallUtilization >= highUtilizationAlert ? "red" : overallUtilization > targetUtilization ? "yellow" : "green"} />
        <StatCard label="Upcoming Bills" value={upcomingBills.length} helper={`${overdueBills.length} overdue`} icon={<CalendarClock className="h-5 w-5" />} tone={overdueBills.length ? "red" : "sage"} />
        <StatCard
          label="Sinking Funds"
          value={data.sinking_funds.length}
          helper={
            <PrivacyMask value={`${money(data.sinking_funds.reduce((sum, fund) => sum + safeNumber(fund.saved_so_far), 0))} saved`} sensitive>
              {money(data.sinking_funds.reduce((sum, fund) => sum + safeNumber(fund.saved_so_far), 0))} saved
            </PrivacyMask>
          }
          icon={<Target className="h-5 w-5" />}
          tone="sage"
        />
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="cards">Credit Cards</TabsTrigger>
            <TabsTrigger value="funds">Sinking Funds</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <GroupSummaryGrid groups={groupSummaries} />
          <CreditCardPanel cards={data.credit_cards} highAlert={highUtilizationAlert} target={targetUtilization} excellent={excellentUtilization} />
          <DebtPayoffPanel cards={data.credit_cards} strategy={settings?.payoff_strategy ?? "avalanche"} />
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <BudgetVarianceTable rows={budgetRows} />
          <DataTable config={moduleConfigs.budgetCategories} records={monthCategories} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <DataTable config={moduleConfigs.transactions} records={monthTransactions} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <CreditCardPanel cards={data.credit_cards} highAlert={highUtilizationAlert} target={targetUtilization} excellent={excellentUtilization} />
          <DataTable config={moduleConfigs.creditCards} records={data.credit_cards} />
        </TabsContent>

        <TabsContent value="funds" className="space-y-4">
          <SinkingFundPanel funds={data.sinking_funds} />
          <DataTable config={moduleConfigs.sinkingFunds} records={data.sinking_funds} />
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <AnnualSummaryTable transactions={data.financial_transactions} budgetYear={budgetYear} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <DataTable config={moduleConfigs.budgetSettings} records={data.budget_settings} />
        </TabsContent>
      </Tabs>

      {dialogConfig ? (
        <RecordFormDialog
          config={dialogConfig}
          open={Boolean(activeDialog)}
          defaultOverrides={dialogDefaults}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        />
      ) : null}
    </div>
  );
}
