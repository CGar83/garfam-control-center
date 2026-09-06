import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import type { DataStore, FamilyMember } from "@/lib/types";
import { choreCompletedOn, choreIsDueOn, daysUntil, routineCompletionFor, routineIsComplete, routineRunsOn } from "@/lib/streaks";
import { parseMaybeDate } from "@/lib/utils";

export type AgendaKind = "event" | "task" | "bill" | "appointment" | "chore" | "routine" | "meal" | "milestone" | "activity";

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  subtitle?: string | null;
  /** Full timestamp when the item has a time; null for all-day items. */
  at: Date | null;
  allDay: boolean;
  memberIds: string[];
  route: string;
  done: boolean;
  emoji?: string | null;
  sensitive?: boolean;
}

const kindOrder: Record<AgendaKind, number> = {
  routine: 0,
  chore: 1,
  event: 2,
  appointment: 3,
  task: 4,
  bill: 5,
  meal: 6,
  activity: 7,
  milestone: 8
};

export function sortAgenda(items: AgendaItem[]) {
  return [...items].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? 1 : -1;
    if (a.at && b.at && a.at.getTime() !== b.at.getTime()) return a.at.getTime() - b.at.getTime();
    if (a.done !== b.done) return a.done ? 1 : -1;
    return kindOrder[a.kind] - kindOrder[b.kind];
  });
}

/**
 * Everything happening for the family on a given day, unified so the Today
 * view and calendar can render one timeline instead of nine lists.
 */
export function buildAgenda(data: DataStore, date: Date, options: { includeSensitive?: boolean } = {}): AgendaItem[] {
  const day = startOfDay(date);
  const key = format(day, "yyyy-MM-dd");
  const items: AgendaItem[] = [];
  const includeSensitive = options.includeSensitive ?? true;

  for (const event of data.events) {
    const start = parseMaybeDate(event.start_at);
    if (!start || !isSameDay(start, day)) continue;
    items.push({
      id: event.id,
      kind: "event",
      title: event.title,
      subtitle: event.location || event.category,
      at: event.all_day ? null : start,
      allDay: event.all_day,
      memberIds: event.assigned_to ? [event.assigned_to] : [],
      route: `/calendar?record=${event.id}`,
      done: false
    });
  }

  for (const task of data.tasks) {
    const due = parseMaybeDate(task.due_at);
    if (!due || !isSameDay(due, day)) continue;
    const hasTime = task.due_at?.includes("T") && !/T00:00(:00)?/.test(task.due_at);
    items.push({
      id: task.id,
      kind: "task",
      title: task.title,
      subtitle: task.category,
      at: hasTime ? due : null,
      allDay: !hasTime,
      memberIds: task.assigned_to ? [task.assigned_to] : [],
      route: `/tasks?record=${task.id}`,
      done: task.status === "done"
    });
  }

  if (includeSensitive) {
    for (const bill of data.bills) {
      const due = parseMaybeDate(bill.due_date);
      if (!due || !isSameDay(due, day)) continue;
      items.push({
        id: bill.id,
        kind: "bill",
        title: `${bill.name} due`,
        subtitle: bill.autopay ? "Autopay" : "Manual payment",
        at: null,
        allDay: true,
        memberIds: [],
        route: `/bills?record=${bill.id}`,
        done: bill.status === "paid",
        sensitive: true
      });
    }

    for (const record of data.health_records) {
      const at = parseMaybeDate(record.appointment_date);
      if (!at || !isSameDay(at, day)) continue;
      const hasTime = record.appointment_date?.includes("T");
      items.push({
        id: record.id,
        kind: "appointment",
        title: record.provider_name ? `${record.provider_name}` : record.record_type,
        subtitle: record.record_type,
        at: hasTime ? at : null,
        allDay: !hasTime,
        memberIds: record.person_id ? [record.person_id] : [],
        route: `/health?record=${record.id}`,
        done: false,
        sensitive: true
      });
    }
  }

  for (const chore of data.chores) {
    if (!choreIsDueOn(chore, day)) continue;
    items.push({
      id: chore.id,
      kind: "chore",
      title: chore.title,
      subtitle: `${chore.points} pts · ${chore.time_of_day}`,
      at: null,
      allDay: true,
      memberIds: chore.assigned_to ? [chore.assigned_to] : [],
      route: "/chores",
      done: Boolean(choreCompletedOn(data.chore_completions, chore.id, day)),
      emoji: chore.emoji
    });
  }

  for (const routine of data.routines) {
    if (!routineRunsOn(routine, day)) continue;
    const completion = routineCompletionFor(data.routine_completions, routine.id, day);
    items.push({
      id: routine.id,
      kind: "routine",
      title: routine.title,
      subtitle: `${completion?.steps_done.length ?? 0}/${routine.steps.length} steps`,
      at: null,
      allDay: true,
      memberIds: routine.member_id ? [routine.member_id] : [],
      route: "/routines",
      done: routineIsComplete(routine, completion),
      emoji: routine.emoji
    });
  }

  for (const meal of data.meal_plans) {
    if (meal.meal_date !== key && !(parseMaybeDate(meal.meal_date) && isSameDay(parseMaybeDate(meal.meal_date) as Date, day))) continue;
    items.push({
      id: meal.id,
      kind: "meal",
      title: meal.title,
      subtitle: meal.meal_type,
      at: null,
      allDay: true,
      memberIds: meal.cook_id ? [meal.cook_id] : [],
      route: "/meals",
      done: false
    });
  }

  for (const milestone of data.milestones) {
    if (daysUntil(milestone.date, milestone.recurring_yearly, day) !== 0) continue;
    items.push({
      id: milestone.id,
      kind: "milestone",
      title: milestone.title,
      subtitle: milestone.kind,
      at: null,
      allDay: true,
      memberIds: milestone.member_id ? [milestone.member_id] : [],
      route: "/memories",
      done: false,
      emoji: milestone.emoji
    });
  }

  for (const idea of data.activity_ideas) {
    if (idea.status !== "planned" || !idea.scheduled_event_id) continue;
    const event = data.events.find((item) => item.id === idea.scheduled_event_id);
    if (!event) continue;
    const start = parseMaybeDate(event.start_at);
    if (!start || !isSameDay(start, day)) continue;
    // Already represented by the event; skip to avoid duplicates.
  }

  return sortAgenda(items);
}

export function agendaForMember(items: AgendaItem[], memberId: string | null) {
  if (!memberId) return items;
  return items.filter((item) => item.memberIds.length === 0 || item.memberIds.includes(memberId));
}

export function greetingFor(date: Date, name?: string | null) {
  const hour = date.getHours();
  const part = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

export interface Nudge {
  id: string;
  tone: "warm" | "attention" | "celebrate";
  title: string;
  body: string;
  route: string;
  emoji: string;
}

/** Gentle, specific prompts that make the app worth opening every day. */
export function buildNudges(data: DataStore, currentMember: FamilyMember | null, members: FamilyMember[], today = new Date()): Nudge[] {
  const nudges: Nudge[] = [];
  const day = startOfDay(today);
  const key = format(day, "yyyy-MM-dd");
  const isParent = !currentMember || currentMember.role === "admin" || currentMember.role === "parent";

  const dinnerTonight = data.meal_plans.find((meal) => meal.meal_date === key && meal.meal_type === "Dinner");
  if (!dinnerTonight && today.getHours() >= 10) {
    nudges.push({
      id: "no-dinner",
      tone: "attention",
      title: "Dinner is unplanned",
      body: "Pick something from the recipe box before the 5pm scramble.",
      route: "/meals",
      emoji: "🍽️"
    });
  }

  if (isParent && currentMember) {
    const checkedInToday = data.checkins.some((checkin) => checkin.member_id === currentMember.id && checkin.checkin_date === key);
    if (!checkedInToday) {
      nudges.push({
        id: "checkin",
        tone: "warm",
        title: "Thirty-second check-in",
        body: "Log your mood and one thing you need. Your partner will see it.",
        route: "/checkin",
        emoji: "💬"
      });
    }
  }

  const overdueTasks = data.tasks.filter((task) => task.status !== "done" && task.due_at && parseISO(task.due_at) < day);
  if (overdueTasks.length > 0) {
    nudges.push({
      id: "overdue",
      tone: "attention",
      title: `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"}`,
      body: overdueTasks
        .slice(0, 2)
        .map((task) => task.title)
        .join(" · "),
      route: "/tasks",
      emoji: "⏰"
    });
  }

  const upcomingMilestones = data.milestones
    .map((milestone) => ({ milestone, days: daysUntil(milestone.date, milestone.recurring_yearly, day) }))
    .filter(({ days }) => days > 0 && days <= 7)
    .sort((a, b) => a.days - b.days);
  for (const { milestone, days } of upcomingMilestones.slice(0, 1)) {
    nudges.push({
      id: `milestone-${milestone.id}`,
      tone: "celebrate",
      title: `${milestone.title} in ${days} ${days === 1 ? "day" : "days"}`,
      body: milestone.notes || "Anything to prepare?",
      route: "/memories",
      emoji: milestone.emoji || "🎉"
    });
  }

  const kids = members.filter((member) => member.role === "viewer");
  const kidsWithFinishedChores = kids.filter((kid) => {
    const due = data.chores.filter((chore) => chore.assigned_to === kid.id && choreIsDueOn(chore, day));
    return due.length > 0 && due.every((chore) => choreCompletedOn(data.chore_completions, chore.id, day));
  });
  if (kidsWithFinishedChores.length > 0) {
    nudges.push({
      id: "chores-done",
      tone: "celebrate",
      title: `${kidsWithFinishedChores.map((kid) => kid.display_name.split(" ")[0]).join(" and ")} finished every chore`,
      body: "Worth a high five.",
      route: "/chores",
      emoji: "🙌"
    });
  }

  const weekStart = addDays(day, -day.getDay());
  const reviewedThisWeek = data.weekly_reviews.some((review) => review.week_start === format(weekStart, "yyyy-MM-dd") && review.completed_at);
  if (isParent && !reviewedThisWeek && (day.getDay() === 0 || day.getDay() === 6)) {
    nudges.push({
      id: "weekly-review",
      tone: "warm",
      title: "Sunday reset",
      body: "Ten minutes together: calendar, meals, chores, money, and one date.",
      route: "/planning",
      emoji: "🗓️"
    });
  }

  const memoryThisWeek = data.journal_entries.some((entry) => parseISO(entry.entry_date) >= addDays(day, -6));
  if (!memoryThisWeek) {
    nudges.push({
      id: "memory",
      tone: "warm",
      title: "Save one moment from this week",
      body: "A quote, a first, a small win. Future you will be glad.",
      route: "/memories",
      emoji: "📸"
    });
  }

  return nudges.slice(0, 4);
}
