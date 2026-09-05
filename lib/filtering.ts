import { isSameDay, isThisWeek, parseISO } from "date-fns";
import type { AnyRecord, DataStore, TableName } from "@/lib/types";
import { parseMaybeDate, recordMap } from "@/lib/utils";

export interface FilterState {
  query: string;
  person: string;
  status: string;
  priority: string;
  category: string;
  date: "all" | "today" | "week" | "overdue";
}

export const defaultFilters: FilterState = {
  query: "",
  person: "all",
  status: "all",
  priority: "all",
  category: "all",
  date: "all"
};

const personKeys = ["assigned_to", "person_id", "child_id", "created_by", "added_by", "owner", "owner_name"] as const;
const dateKeys = [
  "due_at",
  "due_date",
  "start_at",
  "needed_by",
  "appointment_date",
  "maintenance_due",
  "registration_due",
  "renewal_date",
  "target_date",
  "meal_date",
  "related_date",
  "budget_month",
  "transaction_date"
] as const;

export function recordText(record: AnyRecord) {
  return Object.entries(record)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .map(([, value]) => String(value))
    .join(" ")
    .toLowerCase();
}

export function recordDate(record: AnyRecord) {
  for (const key of dateKeys) {
    const value = recordMap(record)[key];
    if (typeof value === "string") {
      const parsed = parseMaybeDate(value);
      if (parsed) return parsed;
    }
  }

  return null;
}

export function recordPerson(record: AnyRecord) {
  for (const key of personKeys) {
    const value = recordMap(record)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }

  return "";
}

export function applyRecordFilters<TRecord extends AnyRecord>(records: TRecord[], filters: FilterState) {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    const rec = recordMap(record);
    const matchesQuery = !query || recordText(record).includes(query);
    const matchesPerson = filters.person === "all" || recordPerson(record) === filters.person;
    const matchesStatus = filters.status === "all" || rec.status === filters.status;
    const matchesPriority = filters.priority === "all" || rec.priority === filters.priority || rec.importance === filters.priority;
    const matchesCategory =
      filters.category === "all" ||
      rec.category === filters.category ||
      rec.record_type === filters.category ||
      rec.group_name === filters.category ||
      rec.need_want_goal === filters.category ||
      rec.transaction_type === filters.category;
    const date = recordDate(record);
    const matchesDate =
      filters.date === "all" ||
      (filters.date === "today" && date !== null && isSameDay(date, new Date())) ||
      (filters.date === "week" && date !== null && isThisWeek(date, { weekStartsOn: 0 })) ||
      (filters.date === "overdue" && date !== null && date < new Date());

    return matchesQuery && matchesPerson && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });
}

export interface SearchResult {
  table: TableName;
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

const searchableTables: TableName[] = [
  "tasks",
  "events",
  "grocery_items",
  "bills",
  "financial_accounts",
  "budget_settings",
  "budget_categories",
  "financial_transactions",
  "credit_cards",
  "sinking_funds",
  "contacts",
  "documents",
  "health_records",
  "home_records",
  "vehicle_records",
  "communication_notes",
  "relationship_records",
  "activity_ideas"
];

const routes: Partial<Record<TableName, string>> = {
  tasks: "/tasks",
  events: "/calendar",
  grocery_items: "/grocery",
  bills: "/bills",
  financial_accounts: "/accounts",
  budget_settings: "/budget",
  budget_categories: "/budget",
  financial_transactions: "/budget",
  credit_cards: "/budget",
  sinking_funds: "/budget",
  contacts: "/contacts",
  documents: "/documents",
  health_records: "/health",
  home_records: "/home",
  vehicle_records: "/vehicles",
  communication_notes: "/communication",
  relationship_records: "/relationship",
  activity_ideas: "/activities"
};

export function getRecordTitle(record: AnyRecord) {
  const rec = recordMap(record);
  return String(
    rec.title ??
      rec.name ??
      rec.institution_name ??
      rec.card_name ??
      rec.goal ??
      rec.description ??
      rec.budget_month ??
      rec.provider_name ??
      rec.school_name ??
      rec.vehicle_name ??
      rec.category ??
      "Untitled"
  );
}

export function searchData(data: DataStore, query: string): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return searchableTables.flatMap((table) =>
    data[table]
      .filter((record) => recordText(record).includes(normalized))
      .slice(0, 6)
      .map((record) => ({
        table,
        id: record.id,
        title: getRecordTitle(record),
        subtitle: table.replace(/_/g, " "),
        route: `${routes[table] ?? "/dashboard"}?record=${record.id}`
      }))
  );
}

export function sortByNearestDate<TRecord extends AnyRecord>(records: TRecord[]) {
  return [...records].sort((a, b) => {
    const dateA = recordDate(a);
    const dateB = recordDate(b);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return parseISO(dateA.toISOString()).getTime() - parseISO(dateB.toISOString()).getTime();
  });
}
