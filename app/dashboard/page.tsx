"use client";

import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { useAppData } from "@/components/app/providers";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { memberCanAccessPath } from "@/lib/access-control";
import { formatDate, parseMaybeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data, currentMember } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const access = (path: string) => memberCanAccessPath(currentMember, path);
  const today = startOfDay(new Date());
  const inRange = (value?: string | null, days = 7) => {
    const date = parseMaybeDate(value);
    return !!date && date >= today && date < addDays(today, days);
  };
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const overdue = openTasks.filter((task) => {
    const date = parseMaybeDate(task.due_at);
    return date && date < today;
  });
  const completed = data.tasks.filter((task) => {
    const date = parseMaybeDate(task.completed_at);
    return (
      task.status === "done" &&
      date &&
      date >= addDays(today, -7) &&
      date <= new Date()
    );
  });
  const schedule = data.events
    .filter(
      (event) =>
        inRange(event.start_at) &&
        (event.category !== "Medical" || (!privacyMode && access("/health"))) &&
        (event.category !== "Bills" || (!privacyMode && access("/finances"))),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const bills = data.bills.filter(
    (bill) =>
      bill.status !== "paid" &&
      (inRange(bill.due_date, 14) ||
        bill.status === "overdue" ||
        (!!parseMaybeDate(bill.due_date) &&
          parseMaybeDate(bill.due_date)! < today)),
  );
  const maintenance = [
    ...data.home_records.map((row) => ({
      id: row.id,
      title: row.title,
      due: row.maintenance_due,
      href: "/home",
    })),
    ...data.vehicle_records.map((row) => ({
      id: row.id,
      title: row.vehicle_name,
      due: row.maintenance_due ?? row.registration_due,
      href: "/vehicles",
    })),
  ].filter((row) => inRange(row.due, 30));
  const goals = data.family_goals.filter(
    (goal) =>
      (goal.category !== "Financial" ||
        (!privacyMode && access("/finances"))) &&
      (goal.category !== "Health" || (!privacyMode && access("/health"))),
  );
  return (
    <div className="app-page">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(today, "MMM d")} – {format(addDays(today, 6), "MMM d")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Household Review</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Look ahead together, close open loops, and choose the week’s
            priorities.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/today">Go to Today</Link>
        </Button>
      </header>
      <section
        className="grid grid-cols-3 gap-4 border-y py-5"
        aria-label="Weekly task summary"
      >
        {[
          ["Completed in seven days", completed.length],
          ["Open tasks", openTasks.length],
          ["Overdue", overdue.length],
        ].map(([label, count]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Look at the next seven days</h2>
          <Link href="/calendar" className="text-sm text-primary underline">
            Calendar
          </Link>
        </div>
        {schedule.length ? (
          <ul className="divide-y">
            {schedule.slice(0, 8).map((event) => (
              <li key={event.id}>
                <Link
                  className="flex min-h-12 items-center justify-between gap-4 py-3 text-sm focus-ring"
                  href={`/calendar?record=${encodeURIComponent(event.id)}&table=events`}
                >
                  <span className="min-w-0 break-words font-medium">
                    {event.title}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(event.start_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No events in the next seven days.
          </p>
        )}
      </section>
      <section className="space-y-3 border-t pt-5">
        <h2 className="text-lg font-semibold">Agree on priorities</h2>
        <p className="text-sm text-muted-foreground">
          {overdue.length
            ? `${overdue.length} overdue ${overdue.length === 1 ? "task needs" : "tasks need"} a decision: finish, reassign, or reschedule.`
            : "No overdue tasks. Choose the work that matters this week."}
        </p>
        <ul className="divide-y">
          {(overdue.length ? overdue : openTasks).slice(0, 5).map((task) => (
            <li key={task.id}>
              <Link
                className="block py-3 text-sm font-medium focus-ring"
                href={`/tasks?record=${encodeURIComponent(task.id)}&table=tasks`}
              >
                {task.title}
              </Link>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline">
          <Link href="/tasks">Review tasks</Link>
        </Button>
        {access("/planning") && (
          <Button asChild variant="ghost">
            <Link href="/planning">Plan together</Link>
          </Button>
        )}
      </section>
      {!privacyMode && access("/bills") && (
        <section className="space-y-3 border-t pt-5">
          <h2 className="text-lg font-semibold">Check household costs</h2>
          <p className="text-sm text-muted-foreground">
            {bills.length} unpaid bills overdue or due within two weeks.
          </p>
          <ul className="divide-y">
            {bills.slice(0, 5).map((bill) => (
              <li key={bill.id}>
                <Link
                  className="flex justify-between gap-3 py-3 text-sm focus-ring"
                  href={`/bills?record=${encodeURIComponent(bill.id)}&table=bills`}
                >
                  <span>{bill.name}</span>
                  <span>
                    {Number(bill.amount).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline">
            <Link href="/finances">Review finances</Link>
          </Button>
        </section>
      )}
      {privacyMode && (
        <p className="border-t pt-5 text-sm text-muted-foreground">
          Financial and health details are hidden in privacy mode.
        </p>
      )}
      <section className="space-y-3 border-t pt-5">
        <h2 className="text-lg font-semibold">Prepare for what’s coming</h2>
        {maintenance.length ? (
          <ul className="divide-y">
            {maintenance.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  className="flex justify-between gap-3 py-3 text-sm focus-ring"
                  href={item.href}
                >
                  <span>{item.title}</span>
                  <span>{formatDate(item.due)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No home or vehicle maintenance due in the next 30 days.
          </p>
        )}
        {!privacyMode && access("/health") && (
          <Link
            href="/health"
            className="inline-block py-2 text-sm text-primary underline"
          >
            Review appointments and health records
          </Link>
        )}
      </section>
      <section className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keep goals moving</h2>
          <Link href="/goals" className="text-sm text-primary underline">
            Goals
          </Link>
        </div>
        {goals.length ? (
          goals.slice(0, 4).map((goal) => (
            <div key={goal.id}>
              <p className="mb-2 text-sm font-medium">{goal.title}</p>
              <progress
                className="h-2 w-full accent-primary"
                aria-label={`${goal.title} progress`}
                max={100}
                value={Math.min(100, Math.max(0, goal.progress))}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a family goal to work toward together.
          </p>
        )}
      </section>
    </div>
  );
}
