const STATUS_ORDER = [
  "DRAFT",
  "QUEUED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETE",
  "CANCELLED",
];
const CLOSED = new Set(["COMPLETE", "CANCELLED"]);
const time = (value) => {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
};
const rate = (part, total) => (total ? Math.round((part / total) * 100) : null);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return sorted.length
    ? sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
    : null;
};
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  time(value) != null &&
  new Date(value).toISOString().slice(0, 10) === value;

// Every aggregate uses only the supplied authorized item set. Work statuses are
// current snapshots; handling-time entries are self-reports, never savings.
export function computeOperationsMetrics({
  items = [],
  activities = {},
  profiles = [],
  now = new Date().toISOString(),
  asOfDate,
} = {}) {
  const nowMs = time(now);
  if (nowMs == null) throw new Error("A valid report timestamp is required.");
  const today = asOfDate || new Date(nowMs).toISOString().slice(0, 10);
  if (!validDate(today))
    throw new Error("A valid report calendar date is required.");
  const rows = [
    ...new Map(
      items.filter((item) => item?.id).map((item) => [item.id, item]),
    ).values(),
  ];
  const names = Object.fromEntries(
    profiles.map((profile) => [profile.id, profile.full_name]),
  );
  const departments = new Map(),
    statusCounts = new Map(STATUS_ORDER.map((status) => [status, 0]));
  const loans = new Set(),
    durations = [],
    attention = [];
  const summary = {
    total: rows.length,
    active: 0,
    backlog: 0,
    blocked: 0,
    review: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    linked_items: 0,
    recorded_minutes: 0,
    time_entries: 0,
    items_with_time: 0,
    excluded_time_entries: 0,
    invalid_due_dates: 0,
  };
  for (const item of rows) {
    const department =
      item.department || item.template_snapshot?.department || "UNASSIGNED";
    if (!departments.has(department))
      departments.set(department, {
        department,
        total: 0,
        active: 0,
        blocked: 0,
        overdue: 0,
        completed: 0,
        cancelled: 0,
        linked_items: 0,
        recorded_minutes: 0,
        time_entries: 0,
        items_with_time: 0,
      });
    const dept = departments.get(department);
    dept.total++;
    statusCounts.set(
      item.status || "UNKNOWN",
      (statusCounts.get(item.status || "UNKNOWN") || 0) + 1,
    );
    const active = !CLOSED.has(item.status);
    if (active) {
      summary.active++;
      dept.active++;
    }
    if (["DRAFT", "QUEUED"].includes(item.status)) summary.backlog++;
    if (item.status === "BLOCKED") {
      summary.blocked++;
      dept.blocked++;
    }
    if (item.status === "REVIEW") summary.review++;
    if (item.status === "CANCELLED") {
      summary.cancelled++;
      dept.cancelled++;
    }
    if (item.status === "COMPLETE") {
      summary.completed++;
      dept.completed++;
      const start = time(item.created_at),
        end = time(item.completed_at);
      if (start != null && end != null && end >= start && end <= nowMs)
        durations.push((end - start) / 36e5);
    }
    const loan = String(item.loan_number || "").trim();
    if (loan) {
      summary.linked_items++;
      dept.linked_items++;
      loans.add(loan);
    }
    const validDue = validDate(item.due_date);
    if (item.due_date && !validDue) summary.invalid_due_dates++;
    const overdue = active && validDue && item.due_date < today;
    if (overdue) {
      summary.overdue++;
      dept.overdue++;
    }
    if (overdue || item.status === "BLOCKED")
      attention.push({
        ...item,
        department,
        owner: names[item.owner_id] || "Unassigned",
        overdue,
        reason:
          overdue && item.status === "BLOCKED"
            ? "Blocked and overdue"
            : overdue
              ? "Overdue"
              : "Blocked",
      });
    const activity =
      activities instanceof Map ? activities.get(item.id) : activities[item.id];
    const seen = new Set();
    let itemMinutes = 0,
      itemEntries = 0;
    for (const entry of activity?.timeEntries || []) {
      if (entry.id && seen.has(entry.id)) continue;
      if (entry.id) seen.add(entry.id);
      const minutes = Number(entry.minutes),
        at = time(entry.at);
      if (
        !Number.isFinite(minutes) ||
        minutes <= 0 ||
        minutes > 1440 ||
        at == null ||
        at > nowMs ||
        (entry.work_item_id && entry.work_item_id !== item.id)
      ) {
        summary.excluded_time_entries++;
        continue;
      }
      itemMinutes += minutes;
      itemEntries++;
    }
    summary.recorded_minutes += itemMinutes;
    summary.time_entries += itemEntries;
    dept.recorded_minutes += itemMinutes;
    dept.time_entries += itemEntries;
    if (itemEntries) {
      summary.items_with_time++;
      dept.items_with_time++;
    }
  }
  const denominator = summary.total - summary.cancelled;
  return {
    generated_at: now,
    as_of_date: today,
    summary: {
      ...summary,
      noncancelled: denominator,
      completion_pct: rate(summary.completed, denominator),
      linked_pct: rate(summary.linked_items, summary.total),
      unique_loans: loans.size,
      time_coverage_pct: rate(summary.items_with_time, summary.total),
      completed_timing_count: durations.length,
      median_completion_hours: median(durations),
    },
    departments: [...departments.values()]
      .map((dept) => ({
        ...dept,
        completion_pct: rate(dept.completed, dept.total - dept.cancelled),
        time_coverage_pct: rate(dept.items_with_time, dept.total),
      }))
      .sort((a, b) => a.department.localeCompare(b.department)),
    statuses: [...statusCounts].map(([status, count]) => ({ status, count })),
    attention: attention.sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        String(a.due_date || "9999").localeCompare(
          String(b.due_date || "9999"),
        ),
    ),
    attribution: {
      linked_items: summary.linked_items,
      unique_loans: loans.size,
      verified_lia_touchpoints: null,
      verified_funded_loans: null,
      measured_savings_minutes: null,
      status: "Unknown: LOS Connector evidence unavailable",
    },
  };
}
