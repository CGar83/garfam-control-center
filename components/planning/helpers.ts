import { addDays, differenceInCalendarDays, format, getDay, isSameDay, startOfDay, startOfWeek, subDays } from "date-fns";
import { buildAgenda, type AgendaItem } from "@/lib/daily-brief";
import { choreProgressForDay, dateKey } from "@/lib/streaks";
import type { Bill, DataStore, FamilyMember, WeeklyReview } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export type StepKey = "wins" | "calendar" | "meals" | "chores" | "money" | "connection";

export interface StepMeta {
  key: StepKey;
  title: string;
  prompt: string;
  emoji: string;
}

export const stepMeta: StepMeta[] = [
  { key: "wins", title: "Wins", prompt: "What went right this week? Say it out loud before you fix anything.", emoji: "🏆" },
  { key: "calendar", title: "The week ahead", prompt: "Walk the calendar together. Who is where, and who is driving?", emoji: "📅" },
  { key: "meals", title: "Dinners", prompt: "Fill the open nights now so 5pm never becomes a negotiation.", emoji: "🍽️" },
  { key: "chores", title: "Kids and chores", prompt: "How did the kids do? Adjust the load, celebrate the streaks.", emoji: "🧹" },
  { key: "money", title: "Money", prompt: "What is due this week? No surprises for either of you.", emoji: "💳" },
  { key: "connection", title: "Us", prompt: "Date night, one worry each, one focus. End with appreciation.", emoji: "💛" }
];

/** Sunday-start week. On Saturday, default to the week that begins tomorrow so the ritual looks forward. */
export function defaultWeekStart(today = new Date()) {
  const base = startOfDay(today);
  return getDay(base) === 6 ? startOfWeek(addDays(base, 1), { weekStartsOn: 0 }) : startOfWeek(base, { weekStartsOn: 0 });
}

export function weekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** The seven days before the selected week (the week being reviewed). */
export function previousWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => subDays(weekStart, 7 - index));
}

export function weekLabel(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  return sameMonth ? `${format(weekStart, "MMM d")} – ${format(end, "d")}` : `${format(weekStart, "MMM d")} – ${format(end, "MMM d")}`;
}

export function weekRelativeLabel(weekStart: Date, today = new Date()) {
  const current = startOfWeek(startOfDay(today), { weekStartsOn: 0 });
  const diff = differenceInCalendarDays(weekStart, current) / 7;
  if (diff === 0) return "This week";
  if (diff === 1) return "Next week";
  if (diff === -1) return "Last week";
  return diff > 0 ? `In ${diff} weeks` : `${Math.abs(diff)} weeks ago`;
}

export function findReview(reviews: WeeklyReview[], weekStart: Date) {
  const key = dateKey(weekStart);
  return reviews.find((review) => review.week_start === key) ?? null;
}

export interface WinsStats {
  choresDone: number;
  tasksDone: number;
  memoriesAdded: number;
}

export function winsStats(data: DataStore, days: Date[]): WinsStats {
  const keys = new Set(days.map(dateKey));
  const first = startOfDay(days[0]);
  const last = addDays(startOfDay(days[days.length - 1]), 1);
  return {
    choresDone: data.chore_completions.filter((completion) => keys.has(completion.completed_on)).length,
    tasksDone: data.tasks.filter((task) => {
      const completed = parseMaybeDate(task.completed_at);
      return task.status === "done" && completed && completed >= first && completed < last;
    }).length,
    memoriesAdded: data.journal_entries.filter((entry) => keys.has(entry.entry_date)).length
  };
}

export interface DayAgenda {
  day: Date;
  items: AgendaItem[];
}

const planningKinds = new Set<AgendaItem["kind"]>(["event", "appointment", "milestone"]);

export function weekAgenda(data: DataStore, days: Date[], includeSensitive: boolean): DayAgenda[] {
  return days.map((day) => ({
    day,
    items: buildAgenda(data, day, { includeSensitive }).filter((item) => planningKinds.has(item.kind))
  }));
}

export interface DinnerSlot {
  day: Date;
  title: string | null;
}

export function dinnerSlots(data: DataStore, days: Date[]): DinnerSlot[] {
  return days.map((day) => {
    const key = dateKey(day);
    const meal = data.meal_plans.find((plan) => plan.meal_type === "Dinner" && plan.meal_date === key);
    return { day, title: meal?.title ?? null };
  });
}

export interface KidChoreSummary {
  member: FamilyMember;
  due: number;
  done: number;
  percent: number;
  points: number;
}

export function kidChoreSummaries(data: DataStore, kids: FamilyMember[], days: Date[]): KidChoreSummary[] {
  return kids.map((member) => {
    let due = 0;
    let done = 0;
    let points = 0;
    for (const day of days) {
      const progress = choreProgressForDay(data.chores, data.chore_completions, member.id, day);
      due += progress.due.length;
      done += progress.done.length;
      points += progress.pointsEarned;
    }
    return { member, due, done, points, percent: due === 0 ? 0 : Math.round((done / due) * 100) };
  });
}

export function billsDueInWeek(bills: Bill[], days: Date[]) {
  const due = bills.filter((bill) => {
    if (bill.status === "paid") return false;
    const date = parseMaybeDate(bill.due_date);
    return date && days.some((day) => isSameDay(day, date));
  });
  return {
    bills: [...due].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    total: due.reduce((sum, bill) => sum + bill.amount, 0)
  };
}

export function excerpt(value?: string | null, max = 90) {
  const text = (value ?? "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
