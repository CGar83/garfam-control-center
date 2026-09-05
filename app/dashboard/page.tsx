"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  CalendarPlus,
  ClipboardPlus,
  CreditCard,
  Goal,
  HeartPulse,
  HeartHandshake,
  Home,
  MessageSquarePlus,
  Plus,
  ReceiptText,
  School,
  ShoppingCart,
  WalletCards,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBadge } from "@/components/app/date-badge";
import { PageHeader } from "@/components/app/page-header";
import { PersonAvatar } from "@/components/app/person-avatar";
import { PriorityBadge } from "@/components/app/priority-badge";
import { PrivacyMask } from "@/components/app/privacy-mask";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { recordDate } from "@/lib/filtering";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";
import type { AnyRecord, Bill, EventRecord, HealthRecord, HomeRecord, TaskRecord, VehicleRecord } from "@/lib/types";
import { formatDateTime, isDueSoon, isOverdue, parseMaybeDate, recordMap, safeNumber } from "@/lib/utils";

function DashboardCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MiniList({ records, empty, render }: { records: AnyRecord[]; empty: string; render: (record: AnyRecord) => React.ReactNode }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-2">{records.slice(0, 5).map(render)}</div>;
}

const quickAdds: Array<{ label: string; module: ModuleKey; icon: typeof Plus; defaults?: Record<string, unknown> }> = [
  { label: "Add event", module: "calendar", icon: CalendarPlus },
  { label: "Add task", module: "tasks", icon: ClipboardPlus },
  { label: "Add grocery item", module: "grocery", icon: ShoppingCart },
  { label: "Add bill", module: "bills", icon: ReceiptText },
  { label: "Add transaction", module: "transactions", icon: Banknote },
  { label: "Add appointment", module: "health", icon: HeartPulse, defaults: { record_type: "Appointment" } },
  { label: "Add note", module: "communication", icon: MessageSquarePlus },
  { label: "Add relationship check-in", module: "relationship", icon: HeartHandshake }
];

export default function DashboardPage() {
  const { data } = useAppData();
  const { parents } = useFamilyMembers();
  const [selectedQuickAdd, setSelectedQuickAdd] = useState<(typeof quickAdds)[number] | null>(null);
  const selectedConfig = selectedQuickAdd ? moduleConfigs[selectedQuickAdd.module] : null;

  const dashboard = useMemo(() => {
    const todayEvents = data.events.filter((event) => isSameDay(parseISO(event.start_at), new Date()));
    const upcomingEvents = data.events
      .filter((event) => recordDate(event) && !isOverdue(event.start_at))
      .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
      .slice(0, 5);
    const overdueTasks = data.tasks.filter((task) => task.status !== "done" && isOverdue(task.due_at));
    const openTasks = data.tasks.filter((task) => task.status !== "done");
    const groceryOpen = data.grocery_items.filter((item) => !item.checked).length;
    const upcomingBills = data.bills.filter((bill) => bill.status !== "paid" && (isDueSoon(bill.due_date, 14) || bill.status === "overdue"));
    const upcomingAppointments = data.health_records.filter((record) => record.appointment_date && isDueSoon(record.appointment_date, 21));
    const schoolReminders = data.school_records.filter((record) => record.important_dates || record.pickup_notes);
    const homeMaintenance = data.home_records.filter((record) => isDueSoon(record.maintenance_due, 30));
    const vehicleMaintenance = data.vehicle_records.filter((record) => isDueSoon(record.maintenance_due, 30) || isDueSoon(record.registration_due, 30));
    const recentNotes = [...data.communication_notes].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()).slice(0, 4);
    const relationshipDue = [...data.relationship_records]
      .filter((record) => record.status !== "done")
      .sort((a, b) => parseISO(a.due_at ?? a.created_at).getTime() - parseISO(b.due_at ?? b.created_at).getTime())
      .slice(0, 4);
    const emergency = data.emergency_plan_items.slice(0, 3);
    const goals = data.family_goals.slice(0, 4);
    const monthlyBillTotal = data.bills.reduce((sum, bill) => sum + safeNumber(bill.amount), 0);
    const currentMonth = format(new Date(), "yyyy-MM");
    const budgetTransactions = data.financial_transactions.filter((transaction) => {
      const parsed = parseMaybeDate(transaction.transaction_date);
      return parsed ? format(parsed, "yyyy-MM") === currentMonth : false;
    });
    const budgetCategories = data.budget_categories.filter((category) => {
      const parsed = parseMaybeDate(category.budget_month);
      return parsed ? format(parsed, "yyyy-MM") === currentMonth : false;
    });
    const budgetIncome = budgetTransactions
      .filter((transaction) => transaction.transaction_type === "income")
      .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
    const budgetSpending = budgetTransactions
      .filter((transaction) => transaction.transaction_type === "expense")
      .reduce((sum, transaction) => sum + safeNumber(transaction.amount), 0);
    const budgetPlanned = budgetCategories.reduce((sum, category) => sum + safeNumber(category.monthly_plan), 0);
    const cardDebt = data.credit_cards.reduce((sum, card) => sum + safeNumber(card.current_balance), 0);
    const cardLimit = data.credit_cards.reduce((sum, card) => sum + safeNumber(card.credit_limit), 0);
    const sinkingSaved = data.sinking_funds.reduce((sum, fund) => sum + safeNumber(fund.saved_so_far), 0);

    return {
      todayEvents,
      upcomingEvents,
      overdueTasks,
      openTasks,
      groceryOpen,
      upcomingBills,
      upcomingAppointments,
      schoolReminders,
      homeMaintenance,
      vehicleMaintenance,
      recentNotes,
      relationshipDue,
      emergency,
      goals,
      monthlyBillTotal,
      budgetIncome,
      budgetSpending,
      budgetRemaining: budgetPlanned - budgetSpending,
      cardDebt,
      cardUtilization: cardLimit > 0 ? cardDebt / cardLimit : 0,
      sinkingSaved
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A daily command center for the family schedule, urgent follow-up, shared notes, bills, appointments, maintenance, and goals."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={dashboard.todayEvents.length} helper="scheduled events" tone="sage" />
        <StatCard label="Overdue Tasks" value={dashboard.overdueTasks.length} tone={dashboard.overdueTasks.length ? "red" : "green"} />
        <StatCard label="Grocery Items" value={dashboard.groceryOpen} helper="still needed" tone={dashboard.groceryOpen ? "yellow" : "green"} />
        <StatCard
          label="Monthly Bills"
          value={
            <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.monthlyBillTotal)} sensitive>
              {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.monthlyBillTotal)}
            </PrivacyMask>
          }
          tone="sage"
        />
        <StatCard
          label="Budget Remaining"
          value={
            <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetRemaining)} sensitive>
              {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetRemaining)}
            </PrivacyMask>
          }
          tone={dashboard.budgetRemaining < 0 ? "red" : "green"}
        />
        <StatCard
          label="Card Utilization"
          value={
            <PrivacyMask value={`${Math.round(dashboard.cardUtilization * 1000) / 10}%`} sensitive>
              {Math.round(dashboard.cardUtilization * 1000) / 10}%
            </PrivacyMask>
          }
          tone={dashboard.cardUtilization > 0.5 ? "red" : dashboard.cardUtilization > 0.3 ? "yellow" : "green"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Add</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {quickAdds.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.label} variant="outline" className="justify-start" onClick={() => setSelectedQuickAdd(item)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="Today's Schedule" icon={<CalendarPlus className="h-5 w-5" />}>
          <MiniList
            records={dashboard.todayEvents}
            empty="No events today."
            render={(record) => {
              const event = record as EventRecord;
              return (
                <div key={event.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(event.start_at)}</p>
                    </div>
                    <StatusBadge status={event.category} />
                  </div>
                </div>
              );
            }}
          />
        </DashboardCard>

        <DashboardCard title="Upcoming Events" icon={<CalendarPlus className="h-5 w-5" />}>
          <MiniList
            records={dashboard.upcomingEvents}
            empty="No upcoming events."
            render={(record) => {
              const event = record as EventRecord;
              return (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                  <DateBadge value={event.start_at} />
                </div>
              );
            }}
          />
        </DashboardCard>

        <DashboardCard title="Overdue Tasks" icon={<AlertTriangle className="h-5 w-5" />}>
          <MiniList
            records={dashboard.overdueTasks}
            empty="Nothing overdue."
            render={(record) => {
              const task = record as TaskRecord;
              return (
                <div key={task.id} className="rounded-md border border-red-200 bg-red-50 p-3 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{task.title}</p>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PersonAvatar personId={task.assigned_to} size="sm" />
                    <DateBadge value={task.due_at} />
                  </div>
                </div>
              );
            }}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="Open Tasks by Parent" icon={<ClipboardPlus className="h-5 w-5" />}>
          <div className="space-y-3">
            {parents.map((parent) => {
              const tasks = dashboard.openTasks.filter((task) => task.assigned_to === parent.id);
              return (
                <div key={parent.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <PersonAvatar personId={parent.id} />
                    <span className="text-sm font-semibold">{tasks.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>

        <DashboardCard title="Upcoming Bills" icon={<ReceiptText className="h-5 w-5" />}>
          <MiniList
            records={dashboard.upcomingBills}
            empty="No upcoming bills."
            render={(record) => {
              const bill = record as Bill;
              return (
                <div key={bill.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{bill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(bill.amount)} sensitive>
                        {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(bill.amount)}
                      </PrivacyMask>
                    </p>
                  </div>
                  <DateBadge value={bill.due_date} />
                </div>
              );
            }}
          />
        </DashboardCard>

        <DashboardCard title="Appointments" icon={<HeartPulse className="h-5 w-5" />}>
          <MiniList
            records={dashboard.upcomingAppointments}
            empty="No appointments soon."
            render={(record) => {
              const health = record as HealthRecord;
              return (
                <div key={health.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{health.provider_name || health.record_type}</p>
                      <PersonAvatar personId={health.person_id} size="sm" />
                    </div>
                    <DateBadge value={health.appointment_date} />
                  </div>
                </div>
              );
            }}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="School Reminders" icon={<School className="h-5 w-5" />}>
          <MiniList
            records={dashboard.schoolReminders}
            empty="No school reminders."
            render={(record) => (
              <div key={record.id} className="rounded-md border p-3">
                <p className="font-medium">{String(recordMap(record).school_name)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{String(recordMap(record).important_dates ?? "")}</p>
              </div>
            )}
          />
        </DashboardCard>

        <DashboardCard title="Home and Vehicle Due Soon" icon={<Wrench className="h-5 w-5" />}>
          <MiniList
            records={[...dashboard.homeMaintenance, ...dashboard.vehicleMaintenance]}
            empty="No maintenance due soon."
            render={(record) => {
              const title = "vehicle_name" in record ? (record as VehicleRecord).vehicle_name : (record as HomeRecord).title;
              const due = "vehicle_name" in record ? (record as VehicleRecord).maintenance_due : (record as HomeRecord).maintenance_due;
              return (
                <div key={record.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <p className="font-medium">{title}</p>
                  <DateBadge value={due} />
                </div>
              );
            }}
          />
        </DashboardCard>

        <DashboardCard title="Emergency Quick Access" icon={<Home className="h-5 w-5" />}>
          <MiniList
            records={dashboard.emergency}
            empty="No emergency plan items."
            render={(record) => (
              <div key={record.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{String(recordMap(record).title)}</p>
                  <PriorityBadge priority={String(recordMap(record).priority)} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <PrivacyMask value={String(recordMap(record).details ?? "")} sensitive>
                    {String(recordMap(record).details ?? "")}
                  </PrivacyMask>
                </p>
              </div>
            )}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardCard title="Recent Communication Notes" icon={<MessageSquarePlus className="h-5 w-5" />}>
          <MiniList
            records={dashboard.recentNotes}
            empty="No notes yet."
            render={(record) => (
              <div key={record.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{String(recordMap(record).title)}</p>
                  <PriorityBadge priority={String(recordMap(record).importance)} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{String(recordMap(record).message)}</p>
              </div>
            )}
          />
        </DashboardCard>

        <DashboardCard title="Relationship Touchpoints" icon={<HeartHandshake className="h-5 w-5" />}>
          <MiniList
            records={dashboard.relationshipDue}
            empty="No relationship touchpoints."
            render={(record) => (
              <div key={record.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{String(recordMap(record).title)}</p>
                  <StatusBadge status={String(recordMap(record).status)} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{String(recordMap(record).practice ?? recordMap(record).category ?? "")}</p>
              </div>
            )}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardCard title="Budget & Cards" icon={<WalletCards className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="mt-1 text-lg font-semibold">
                <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetIncome)} sensitive>
                  {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetIncome)}
                </PrivacyMask>
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Spending</p>
              <p className="mt-1 text-lg font-semibold">
                <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetSpending)} sensitive>
                  {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.budgetSpending)}
                </PrivacyMask>
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Card debt</p>
              <p className="mt-1 text-lg font-semibold">
                <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.cardDebt)} sensitive>
                  {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.cardDebt)}
                </PrivacyMask>
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Sinking funds saved</p>
              <p className="mt-1 text-lg font-semibold">
                <PrivacyMask value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.sinkingSaved)} sensitive>
                  {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dashboard.sinkingSaved)}
                </PrivacyMask>
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/budget">
              <CreditCard className="h-4 w-4" />
              Open Budget & Cards
            </Link>
          </Button>
        </DashboardCard>

        <DashboardCard title="Family Goals Progress" icon={<Goal className="h-5 w-5" />}>
          <MiniList
            records={dashboard.goals}
            empty="No goals yet."
            render={(record) => {
              const progress = safeNumber(recordMap(record).progress);
              return (
                <div key={record.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{String(recordMap(record).title)}</p>
                    <StatusBadge status={String(recordMap(record).status)} />
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            }}
          />
        </DashboardCard>
      </div>

      {selectedConfig ? (
        <RecordFormDialog
          config={selectedConfig}
          open={Boolean(selectedQuickAdd)}
          defaultOverrides={selectedQuickAdd?.defaults}
          onOpenChange={(open) => !open && setSelectedQuickAdd(null)}
        />
      ) : null}
    </div>
  );
}
