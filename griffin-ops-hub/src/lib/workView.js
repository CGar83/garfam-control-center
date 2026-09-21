// Pure helpers that shape work items for the daily views (Home, Work, Loan).
// They read saved records only. They never infer LOS milestones or change state.
import { departmentRole } from "./operationsPolicy.js";
import { PHASES, GENERAL_PHASE, templatePhase, roleDepartment } from "./catalog.js";

export const CLOSED = Object.freeze(["COMPLETE", "CANCELLED"]);
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2 };

export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const isClosed = (item) => CLOSED.includes(item?.status);
export const isOpen = (item) => !!item && !isClosed(item);
export const isOverdue = (item, today = localDate()) =>
  isOpen(item) && !!item.due_date && item.due_date < today;
export const isDueToday = (item, today = localDate()) =>
  isOpen(item) && item.due_date === today;
export const isUnclaimed = (item) => isOpen(item) && !item.owner_id;

// Can this profile pick up an unassigned item in its own desk queue?
export function canClaim(item, profile) {
  return (
    !!item &&
    !!profile &&
    profile.active !== false &&
    isUnclaimed(item) &&
    item.status !== "DRAFT" &&
    departmentRole(item.department, profile.role) &&
    !!profile.branch &&
    profile.branch === item.branch
  );
}

// Items the profile's desk must act on next. Managers and admins see everything.
export function inMyDesk(item, profile) {
  if (!profile) return false;
  if (["MANAGER", "ADMIN"].includes(profile.role)) return true;
  return item.department === roleDepartment(profile.role);
}

// Urgency-first, then target date, then most recently touched.
export function sortWork(items, key = "priority") {
  const copy = [...items];
  const byTarget = (a, b) =>
    (a.due_date || "9999-99-99").localeCompare(b.due_date || "9999-99-99");
  const byUpdated = (a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  const byPriority = (a, b) =>
    (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
  const byLoan = (a, b) =>
    String(a.loan_number).localeCompare(String(b.loan_number));
  const comparators = {
    priority: (a, b) => byPriority(a, b) || byTarget(a, b) || byUpdated(a, b),
    target: (a, b) => byTarget(a, b) || byPriority(a, b) || byUpdated(a, b),
    updated: (a, b) => byUpdated(a, b) || byPriority(a, b),
    loan: (a, b) => byLoan(a, b) || byPriority(a, b) || byTarget(a, b),
    title: (a, b) =>
      String(a.title).localeCompare(String(b.title)) || byPriority(a, b),
    status: (a, b) =>
      String(a.status).localeCompare(String(b.status)) || byPriority(a, b),
  };
  return copy.sort(comparators[key] || comparators.priority);
}

// The buckets a person reads at the start of the day.
export function bucketWork(items = [], profile, today = localDate()) {
  const open = items.filter(isOpen);
  const mine = open.filter((item) => item.owner_id === profile?.id);
  const desk = open.filter((item) => inMyDesk(item, profile));
  return {
    open,
    mine,
    desk,
    blocked: open.filter((item) => item.status === "BLOCKED"),
    overdue: open.filter((item) => isOverdue(item, today)),
    dueToday: open.filter((item) => isDueToday(item, today)),
    review: desk.filter((item) => item.status === "REVIEW"),
    unclaimed: desk.filter((item) => canClaim(item, profile)),
    drafts: open.filter(
      (item) => item.status === "DRAFT" && item.created_by === profile?.id,
    ),
  };
}

// Urgency lanes for a personal list. Each item appears once, in its first lane.
export function laneWork(items = [], today = localDate()) {
  const lanes = [
    { id: "overdue", label: "Past target", tone: "red", items: [] },
    { id: "blocked", label: "Blocked", tone: "amber", items: [] },
    { id: "today", label: "Due today", tone: "brand", items: [] },
    { id: "review", label: "Ready for review", tone: "green", items: [] },
    { id: "upcoming", label: "Upcoming", tone: "", items: [] },
  ];
  for (const item of sortWork(items.filter(isOpen), "target")) {
    const lane = isOverdue(item, today)
      ? "overdue"
      : item.status === "BLOCKED"
        ? "blocked"
        : isDueToday(item, today)
          ? "today"
          : item.status === "REVIEW"
            ? "review"
            : "upcoming";
    lanes.find((entry) => entry.id === lane).items.push(item);
  }
  return lanes.filter((lane) => lane.items.length);
}

// Work rolled up per loan, so the queue can read like a file list.
export function groupByLoan(items = [], loans = [], today = localDate()) {
  const borrowers = Object.fromEntries(
    loans.map((loan) => [loan.loan_number, loan.borrower_last]),
  );
  const groups = new Map();
  for (const item of items) {
    const key = item.loan_number;
    if (!groups.has(key))
      groups.set(key, {
        loan_number: key,
        borrower_last: borrowers[key] || item.borrower_last || "",
        items: [],
        open: 0,
        blocked: 0,
        overdue: 0,
        nextTarget: null,
      });
    const group = groups.get(key);
    group.items.push(item);
    if (isOpen(item)) {
      group.open += 1;
      if (item.status === "BLOCKED") group.blocked += 1;
      if (isOverdue(item, today)) group.overdue += 1;
      if (item.due_date && (!group.nextTarget || item.due_date < group.nextTarget))
        group.nextTarget = item.due_date;
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, items: sortWork(group.items) }))
    .sort(
      (a, b) =>
        b.overdue - a.overdue ||
        b.blocked - a.blocked ||
        (a.nextTarget || "9999").localeCompare(b.nextTarget || "9999") ||
        a.loan_number.localeCompare(b.loan_number),
    );
}

// One row per desk: what a manager scans before the stand-up.
export function deskSummary(items = [], today = localDate()) {
  const desks = [
    ["LO", "Origination", "lo"],
    ["MLP", "MLP", "mlp"],
    ["PROCESSOR", "Processing", "processing"],
    ["CLOSING", "Closing", "closing"],
    ["LOCK_DESK", "Lock desk", "lock"],
  ];
  return desks.map(([department, label, desk]) => {
    const open = items.filter(
      (item) => item.department === department && isOpen(item),
    );
    return {
      department,
      label,
      desk,
      open: open.length,
      blocked: open.filter((item) => item.status === "BLOCKED").length,
      overdue: open.filter((item) => isOverdue(item, today)).length,
      unclaimed: open.filter((item) => !item.owner_id && item.status !== "DRAFT")
        .length,
      review: open.filter((item) => item.status === "REVIEW").length,
    };
  });
}

// Which coordination phase has open Hub work on this loan? Reference only.
export function phaseCounts(items = []) {
  return [...PHASES, GENERAL_PHASE].map((phase) => {
    const related = items.filter(
      (item) => templatePhase(item.template_id) === phase.id,
    );
    return {
      ...phase,
      total: related.length,
      open: related.filter(isOpen).length,
      blocked: related.filter((item) => item.status === "BLOCKED").length,
      complete: related.filter((item) => item.status === "COMPLETE").length,
    };
  });
}

// The phase a Flow view should open on: the earliest phase with open work,
// otherwise the latest phase with any work, otherwise the first phase.
export function suggestedPhase(items = []) {
  const counts = phaseCounts(items).filter((phase) => phase.id !== "general");
  return (
    counts.find((phase) => phase.open)?.id ||
    [...counts].reverse().find((phase) => phase.total)?.id ||
    PHASES[0].id
  );
}

// The most recent note that explains why an item is blocked, if one was recorded.
export function blockedReason(events = []) {
  const entry = [...events]
    .filter((event) => event.to_status === "BLOCKED")
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
  return entry?.note || "";
}

export function ageDays(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now - time) / 86400000));
}

export function relativeAge(iso, now = Date.now()) {
  const days = ageDays(iso, now);
  if (days == null) return "";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
