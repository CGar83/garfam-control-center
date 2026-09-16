"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  FileUp,
  Landmark,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { DataTable } from "@/components/pages/data-table";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { FinanceImportDialog } from "@/components/finance/import-dialog";
import { WorkspaceAssistant } from "@/components/assistant/workspace-assistant";
import { StrategyGuide } from "@/components/finance/strategy-guide";
import { SubscriptionScenario } from "@/components/finance/subscription-scenario";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs, type ModuleConfig } from "@/lib/modules";
import { recoveryConfigs } from "@/lib/finance/modules";
import { allocationFields } from "@/lib/finance/schemas";
import {
  money,
  monthlyEquivalent,
  paydownBelow,
  payoffProjection,
  recoverySummary,
} from "@/lib/finance/calculations";
import { cn, formatDate, titleCase } from "@/lib/utils";
import type {
  AnyRecord,
  CreditCard as CardRecord,
  RecoveryPlan,
} from "@/lib/types";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0 border-b px-1 py-5 sm:border-b-0 sm:border-r sm:px-5 last:border-0">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p
        className={cn(
          "mt-3 break-words text-2xl font-semibold tabular-nums",
          alert && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {detail && (
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function Milestones({ cards }: { cards: CardRecord[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0.9, 0.7, 0.5, 0.3].map((threshold, index) => {
        const unknown = cards.some((c) => c.credit_limit <= 0);
        const paydown = cards.reduce(
          (s, c) =>
            s +
            (paydownBelow(c.current_balance, c.credit_limit, threshold) ?? 0),
          0,
        );
        const complete = cards.length > 0 && !unknown && paydown === 0;
        return (
          <div
            key={threshold}
            className={cn(
              "rounded-lg border bg-card p-4",
              complete && "border-[#ACE1AF] bg-[#ACE1AF]/10",
            )}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Milestone {index + 1}</span>
              {complete && (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              )}
            </div>
            <p className="mt-3 font-semibold">
              Every card below {threshold * 100}%
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {!cards.length || unknown ? "Not calculated" : money(paydown)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {complete
                ? "Reached at recorded balances"
                : "Paydown from current balances"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CashFlow({ plan }: { plan: RecoveryPlan }) {
  const total = allocationFields.reduce((s, [key]) => s + plan[key], 0);
  return (
    <div className="space-y-4">
      {allocationFields.map(([key, label], i) => (
        <div key={key}>
          <div className="mb-1.5 flex justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="mr-2 text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              {label}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {money(plan[key])}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                key === "reserve_contribution"
                  ? "bg-[#ACE1AF]"
                  : "bg-primary/65",
              )}
              style={{
                width: `${Math.min(100, plan.monthly_income > 0 ? (plan[key] / plan.monthly_income) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-2 border-t pt-4 text-sm font-semibold">
        <span>Unallocated for extra paydown</span>
        <span
          className={cn(
            "tabular-nums",
            total > plan.monthly_income && "text-destructive",
          )}
        >
          {money(plan.monthly_income - total)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Planning allocations, not bank activity. Card payments and subscription
        costs are included in these allowances; they are not added a second
        time.
      </p>
    </div>
  );
}

function FinanceHub() {
  const { data, familyId, currentUser, currentMember, loading, updateRecord } =
    useAppData();
  const { privacyMode } = usePrivacyMode();
  const { toast } = useToast();
  const plans = useRealtimeTable("recovery_plans").filter(
    (r) => r.family_id === familyId,
  );
  const subscriptions = useRealtimeTable("recovery_subscriptions").filter(
    (r) => r.family_id === familyId,
  );
  const assets = useRealtimeTable("financial_assets").filter(
    (r) => r.family_id === familyId,
  );
  const debts = useRealtimeTable("installment_debts").filter(
    (r) => r.family_id === familyId,
  );
  const actions = useRealtimeTable("finance_actions").filter(
    (r) => r.family_id === familyId,
  );
  const cards = useRealtimeTable("credit_cards").filter(
    (r) => r.family_id === familyId,
  );
  useRealtimeTable("bills");
  const [planId, setPlanId] = useState("");
  const [tab, setTab] = useState("overview");
  const [importOpen, setImportOpen] = useState(false);
  const [editor, setEditor] = useState<{
    config: ModuleConfig;
    record?: AnyRecord;
  } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const requestedRecord = useSearchParams().get("record") ?? "";
  const handledRecord = useRef("");
  useEffect(() => {
    if (
      !requestedRecord ||
      privacyMode ||
      handledRecord.current === requestedRecord
    )
      return;
    const destinations = [
      ["recovery_plans", "plan"],
      ["recovery_subscriptions", "subscriptions"],
      ["financial_assets", "assets"],
      ["installment_debts", "credit"],
      ["finance_actions", "plan"],
    ] as const;
    for (const [table, destination] of destinations) {
      const record = data[table].find(
        (r) => r.id === requestedRecord && r.family_id === familyId,
      );
      if (!record) continue;
      handledRecord.current = requestedRecord;
      setTab(destination);
      if (table === "recovery_plans") setPlanId(record.id);
      if (table === "recovery_subscriptions" && "name" in record)
        setQuery(record.name);
      break;
    }
  }, [data, familyId, privacyMode, requestedRecord]);
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const summary = recoverySummary(plan, cards, subscriptions, assets, debts);
  const canEdit =
    !!currentMember && ["admin", "parent"].includes(currentMember.role);
  const complete = actions.filter((a) => a.status === "done").length;
  const add = (config: ModuleConfig) =>
    canEdit ? (
      <Button size="sm" variant="outline" onClick={() => setEditor({ config })}>
        <Plus className="h-4 w-4" />
        {config.addLabel}
      </Button>
    ) : null;
  const records = (config: ModuleConfig, items: AnyRecord[]) => (
    <div className="min-w-0 space-y-4">
      <SectionHeading title={config.title} action={add(config)} />
      {items.length ? (
        <DataTable config={config} records={items} readOnly={!canEdit} />
      ) : (
        <div className="border-y py-10 text-center text-sm text-muted-foreground">
          {config.emptyTitle}
        </div>
      )}
    </div>
  );

  if (loading)
    return (
      <div className="animate-pulse space-y-5" aria-label="Loading finances">
        <div className="h-10 w-48 rounded-lg bg-muted" />
        <div className="h-36 rounded-lg bg-muted" />
      </div>
    );
  if (privacyMode)
    return (
      <section className="page-wrap space-y-8">
        <PageHeader title="Finances" />
        <div className="flex flex-col items-center border-y py-16 text-center">
          <LockKeyhole className="h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">
            Financial details are hidden
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Turn off privacy mode to view this workspace.
          </p>
        </div>
      </section>
    );

  return (
    <div className="page-wrap min-w-0 space-y-7">
      <PageHeader
        title="Finances"
        description="A clear plan for your money. One place to follow through."
        secondaryAction={
          canEdit && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" />
              Import files
            </Button>
          )
        }
        action={
          <Button onClick={() => setTab("assistant")}>
            <Sparkles className="h-4 w-4" />
            Ask assistant
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>Family financial workspace</span>
        </div>
        <span>
          {plan?.as_of_date
            ? `Figures verified ${formatDate(plan.as_of_date)}`
            : "Figures need statement verification"}
        </span>
      </div>
      <div className="grid grid-cols-2 border-y bg-card/50 sm:grid-cols-4">
        <Metric
          label="Monthly income plan"
          value={plan ? money(plan.monthly_income) : "Set your plan"}
          detail="Take-home income baseline"
          icon={Wallet}
        />
        <Metric
          label="Available for paydown"
          value={summary.surplus === null ? "Not set" : money(summary.surplus)}
          detail={
            summary.surplus !== null && summary.surplus < 0
              ? "Allocations exceed income"
              : "After all plan allocations"
          }
          icon={ArrowDownRight}
          alert={summary.surplus !== null && summary.surplus < 0}
        />
        <Metric
          label="Revolving utilization"
          value={
            summary.utilization === null
              ? "Not available"
              : `${(summary.utilization * 100).toFixed(1)}%`
          }
          detail={`${cards.length} tracked cards`}
          icon={CreditCard}
          alert={summary.utilization !== null && summary.utilization >= 0.9}
        />
        <Metric
          label="Potential monthly cuts"
          value={money(summary.potentialSavings)}
          detail="Planned, not yet confirmed"
          icon={ArrowUpRight}
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full rounded-lg border-0 border-b bg-transparent p-0 pb-2 shadow-none">
          {[
            ["overview", "Overview"],
            ["plan", "Recovery plan"],
            ["credit", "Credit & debt"],
            ["subscriptions", "Subscriptions"],
            ["assets", "Assets"],
            ["assistant", "Assistant"],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="space-y-8 pt-3">
          {!plan && (
            <div className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Start with a monthly plan
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import your recovery files or enter your income and fixed
                  allocations.
                </p>
              </div>
              {add(recoveryConfigs.recoveryPlan)}
            </div>
          )}
          <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section>
              <SectionHeading
                title="Your next moves"
                detail={`${complete} of ${actions.length} recovery actions complete`}
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTab("plan")}
                  >
                    Full plan
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                }
              />
              {actions
                .filter((a) => a.status !== "done")
                .slice(0, 5)
                .map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 border-b py-4"
                  >
                    <button
                      title="Complete action"
                      aria-label={`Complete ${action.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border hover:border-primary focus-ring"
                      disabled={!canEdit || pending !== null}
                      onClick={async () => {
                        setPending(action.id);
                        try {
                          await updateRecord("finance_actions", action.id, {
                            status: "done",
                          });
                          toast({
                            title: "Action complete",
                            variant: "success",
                          });
                        } catch {
                          toast({
                            title: "Could not save",
                            variant: "destructive",
                          });
                        } finally {
                          setPending(null);
                        }
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">
                        {action.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {titleCase(action.phase)}
                        {action.due_date && ` · ${formatDate(action.due_date)}`}
                      </p>
                    </div>
                  </div>
                ))}
              {!actions.some((a) => a.status !== "done") && (
                <div className="border-y py-7 text-sm text-muted-foreground">
                  {actions.length
                    ? "Your current action list is complete."
                    : "Add the concrete steps you want to take this week."}
                </div>
              )}
              <div className="mt-4">{add(recoveryConfigs.financeActions)}</div>
            </section>
            <section className="border-t pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
              <SectionHeading
                title="Monthly money waterfall"
                action={
                  plan &&
                  canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Edit recovery plan"
                      onClick={() =>
                        setEditor({
                          config: recoveryConfigs.recoveryPlan,
                          record: plan,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )
                }
              />
              {plan ? (
                <CashFlow plan={plan} />
              ) : (
                <p className="py-6 text-sm text-muted-foreground">
                  Your income and allocations will appear here.
                </p>
              )}
            </section>
          </div>
          <section>
            <SectionHeading
              title="Credit recovery milestones"
              detail="Planning checkpoints using each card's current balance and limit."
            />
            <Milestones cards={cards} />
            <p className="mt-3 text-xs text-muted-foreground">
              Amounts target one cent below each milestone and exclude future
              interest or charges. These are not credit-score guarantees.
            </p>
          </section>
          <div className="grid gap-6 border-t pt-6 sm:grid-cols-3">
            {[
              {
                href: "/budget",
                title: "Budget & transactions",
                desc: "Monthly plan, actual spending, cards, and savings.",
              },
              {
                href: "/bills",
                title: "Bills & due dates",
                desc: "Required payments and upcoming obligations.",
              },
              {
                href: "/accounts",
                title: "Accounts & access",
                desc: "Institution details and secure login references.",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-start justify-between gap-3 focus-ring"
              >
                <div>
                  <h3 className="text-sm font-semibold group-hover:text-primary">
                    {l.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {l.desc}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="plan" className="space-y-8 pt-3">
          <SectionHeading
            title="Recovery strategy"
            detail="Protect required payments, fund essentials, then assign the surplus."
            action={
              plan && canEdit ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditor({
                      config: recoveryConfigs.recoveryPlan,
                      record: plan,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                  Edit plan
                </Button>
              ) : (
                add(recoveryConfigs.recoveryPlan)
              )
            }
          />
          {plans.length > 1 && (
            <label className="block text-sm">
              Active plan
              <select
                className="ml-3 rounded-lg border bg-background p-2"
                value={plan?.id}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-8 lg:grid-cols-2">
            {plan && <CashFlow plan={plan} />}
            <div className="space-y-5">
              <div className="border-b pb-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Target className="h-4 w-4" />
                  Emergency reserve
                </h3>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {plan ? money(plan.reserve_saved) : "Not set"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {plan && `of ${money(plan.reserve_target)}`}
                  </span>
                </p>
                {plan && (
                  <progress
                    className="mt-3 h-2 w-full accent-[#ACE1AF]"
                    value={plan.reserve_saved}
                    max={Math.max(1, plan.reserve_target)}
                    aria-label="Emergency reserve progress"
                  />
                )}
              </div>
              <div>
                <h3 className="font-semibold">Credit score reference</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {plan?.score ?? "Not recorded"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan?.score_model ||
                    "Add the bureau, scoring model, and verified date."}
                </p>
              </div>
              <div className="border-t pt-5 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Keep payments current. Confirm statement dates and balances
                  before making a paydown plan. Once APRs are known, compare an
                  interest-first approach with smaller-balance priorities.
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-primary underline"
                  href="https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-and-keep-a-good-credit-score-en-318/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CFPB credit-building guidance
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <StrategyGuide />
          {records(recoveryConfigs.financeActions, actions)}
          {plans.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Manage saved plans
              </summary>
              <div className="mt-4">
                {records(recoveryConfigs.recoveryPlan, plans)}
              </div>
            </details>
          )}
        </TabsContent>
        <TabsContent value="credit" className="min-w-0 space-y-8 pt-3">
          <SectionHeading
            title="Card-by-card paydown"
            detail="Update recorded balances as statements arrive."
            action={add(moduleConfigs.creditCards)}
          />
          <Milestones cards={cards} />
          <div className="overflow-x-auto">
            <Table className="min-w-[850px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Balance / limit</TableHead>
                  <TableHead>Utilization</TableHead>
                  {[90, 70, 50, 30].map((n) => (
                    <TableHead key={n}>To &lt;{n}%</TableHead>
                  ))}
                  <TableHead>Payoff estimate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => {
                  const projection = payoffProjection(
                    c.current_balance,
                    c.apr,
                    c.minimum_payment + c.extra_payment,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <button
                          className="text-left font-medium hover:text-primary focus-ring"
                          disabled={!canEdit}
                          onClick={() =>
                            setEditor({
                              config: moduleConfigs.creditCards,
                              record: c,
                            })
                          }
                        >
                          {c.card_name}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {c.apr === null
                            ? "APR unknown"
                            : `${(c.apr * 100).toFixed(2)}% APR`}
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {money(c.current_balance)}
                        <p className="text-xs text-muted-foreground">
                          of {money(c.credit_limit)}
                        </p>
                      </TableCell>
                      <TableCell
                        className={
                          c.current_balance >= c.credit_limit
                            ? "text-destructive"
                            : ""
                        }
                      >
                        {c.credit_limit > 0
                          ? `${((c.current_balance / c.credit_limit) * 100).toFixed(1)}%`
                          : "Limit unknown"}
                      </TableCell>
                      {[0.9, 0.7, 0.5, 0.3].map((t) => (
                        <TableCell key={t} className="tabular-nums">
                          {paydownBelow(
                            c.current_balance,
                            c.credit_limit,
                            t,
                          ) === null
                            ? "Not calculated"
                            : money(
                                paydownBelow(
                                  c.current_balance,
                                  c.credit_limit,
                                  t,
                                )!,
                              )}
                        </TableCell>
                      ))}
                      <TableCell>
                        {projection.months === null
                          ? projection.reason
                          : `${projection.months} months`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {!cards.length && (
            <p className="text-sm text-muted-foreground">
              Add card balances and limits to calculate paydown targets.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Estimates assume fixed payments, APR / 12 monthly interest, no fees
            or new charges, and no payment redistribution. Confirm minimums and
            APRs with each issuer.
          </p>
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Manage card records
            </summary>
            <div className="mt-4">
              {records(moduleConfigs.creditCards, cards)}
            </div>
          </details>
          <section>
            {records(recoveryConfigs.installments, debts)}
            <p className="mt-4 text-sm text-muted-foreground">
              Remaining installment debt:{" "}
              <span className="font-medium text-foreground">
                {money(summary.debtBalance)}
              </span>
              . Recorded monthly payments:{" "}
              <span className="font-medium text-foreground">
                {money(summary.debtPayments)}
              </span>
              . Only count freed payments after a debt is confirmed paid off.
            </p>
          </section>
        </TabsContent>
        <TabsContent value="subscriptions" className="space-y-7 pt-3">
          <SectionHeading
            title="Recurring spend, with intention"
            detail="Choose what stays. Track what actually changes."
            action={add(recoveryConfigs.subscriptions)}
          />
          <div className="grid grid-cols-2 gap-5 border-y py-5 sm:grid-cols-4">
            {[
              ["Current monthly", money(summary.currentRecurring)],
              [
                "Plan allowance",
                plan ? money(plan.subscription_cap) : "Not set",
              ],
              ["After planned cuts", money(summary.projectedRecurring)],
              [
                "Potential annual savings",
                money(summary.potentialSavings * 12),
              ],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <SubscriptionScenario current={summary.currentRecurring} />
          <label className="block max-w-md text-sm">
            <span className="sr-only">Search subscriptions</span>
            <input
              className="h-11 w-full rounded-lg border bg-background px-3"
              placeholder="Search services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subscriptions
              .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              .map((s) => (
                <article key={s.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold">
                        {s.name}
                      </h3>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {money(monthlyEquivalent(s.amount, s.frequency))}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}
                          / month
                        </span>
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={`Edit ${s.name}`}
                        onClick={() =>
                          setEditor({
                            config: recoveryConfigs.subscriptions,
                            record: s,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant={s.status === "active" ? "outline" : "success"}
                    >
                      {titleCase(s.status)}
                    </Badge>
                    <Badge
                      variant={
                        s.decision === "review" ? "warning" : "secondary"
                      }
                    >
                      Plan: {titleCase(s.decision)}
                    </Badge>
                  </div>
                  {s.recommendation && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Source suggestion: {s.recommendation}
                    </p>
                  )}
                </article>
              ))}
          </div>
          {!subscriptions.length && (
            <p className="border-y py-8 text-center text-sm text-muted-foreground">
              Import your subscription list or add a service.
            </p>
          )}
          {!!subscriptions.length &&
            !subscriptions.some((s) =>
              s.name.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <p className="py-6 text-sm text-muted-foreground">
                No services match your search.
              </p>
            )}
          <p className="text-xs text-muted-foreground">
            Choosing cancel or pause records your plan. It does not contact the
            provider. Update confirmed service status after you complete the
            change.
          </p>
          {subscriptions.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Manage all subscription records
              </summary>
              <div className="mt-4">
                <DataTable
                  config={recoveryConfigs.subscriptions}
                  records={subscriptions}
                  readOnly={!canEdit}
                />
              </div>
            </details>
          )}
        </TabsContent>
        <TabsContent value="assets" className="space-y-6 pt-3">
          <div className="flex flex-wrap items-center gap-5 border-b pb-6">
            <Landmark className="h-7 w-7 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">
                Known asset equity
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {money(summary.knownEquity)}
              </p>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">
              {summary.incompleteAssets} assets have incomplete values. This is
              asset equity, not total household net worth. Unsecured debt is
              tracked separately.
            </p>
          </div>
          {records(recoveryConfigs.assets, assets)}
          {records(
            moduleConfigs.finances,
            data.financial_accounts.filter((a) => a.family_id === familyId),
          )}
        </TabsContent>
        <TabsContent value="assistant" className="pt-3">
          <WorkspaceAssistant page="/finances"
            key={`${familyId}:${currentUser.id}:${currentMember?.id}`}
          />
        </TabsContent>
      </Tabs>
      {canEdit && (
        <FinanceImportDialog
          key={familyId}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
      {editor && canEdit && (
        <RecordFormDialog
          config={editor.config}
          record={editor.record}
          open
          onOpenChange={(open) => !open && setEditor(null)}
        />
      )}
    </div>
  );
}

export default function FinancesPage() {
  return (
    <Suspense
      fallback={
        <p className="py-8 text-sm text-muted-foreground">
          Loading finances...
        </p>
      }
    >
      <FinanceHub />
    </Suspense>
  );
}
