import { STAGE_ORDER } from "./stages.js";

// The browser reports use this module. SQL/BI consumers must use the same cohort
// definitions; a saved field's updated_at is never a stage-entry timestamp.
const epoch = (value) => {
  if (!value) return null;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : null;
};
const elapsed = (from, to, unit = 36e5) => {
  const a = epoch(from);
  const b = epoch(to);
  return a != null && b != null && b >= a ? (b - a) / unit : null;
};
const median = (values) => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const rate = (part, total) => (total ? Math.round((part / total) * 100) : null);
const byTime = (a, b) => (epoch(a.at) ?? 0) - (epoch(b.at) ?? 0);
const isDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  return (
    epoch(value) != null && new Date(value).toISOString().slice(0, 10) === value
  );
};

export function stageEnteredAt(
  worksheet,
  transitions = [],
  now = new Date().toISOString(),
) {
  const end = epoch(now);
  return (
    transitions
      .filter(
        (t) =>
          t.worksheet_id === worksheet.id &&
          t.to_stage === worksheet.stage &&
          epoch(t.at) != null &&
          epoch(t.at) <= end,
      )
      .sort(byTime)
      .at(-1)?.at || null
  );
}

// Quoting alone does not protect a spreadsheet from formula execution. Prefix
// risky text, including formulas hidden behind whitespace/control characters.
export function csvCell(value) {
  let text = String(value ?? "");
  // eslint-disable-next-line no-control-regex -- CSV formula defense must handle control-character prefixes.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows, columns) {
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}

export function downloadCsv(name, rows, columns = Object.keys(rows[0] || {})) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff", toCsv(rows, columns)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function computeReports({
  loans = [],
  worksheets = [],
  transitions = [],
  events = [],
  profiles = [],
  now = new Date().toISOString(),
} = {}) {
  const name = (id) =>
    profiles.find((p) => p.id === id)?.full_name ||
    (id ? String(id).slice(0, 8) : "Unassigned");
  const validTransitions = transitions.filter(
    (t) => epoch(t.at) != null && epoch(t.at) <= epoch(now),
  );
  const histories = new Map(
    worksheets.map((w) => [
      w.id,
      validTransitions.filter((t) => t.worksheet_id === w.id).sort(byTime),
    ]),
  );
  const loanMap = new Map(loans.map((l) => [l.loan_number, l]));
  for (const w of worksheets)
    if (!loanMap.has(w.loan_number))
      loanMap.set(w.loan_number, { loan_number: w.loan_number });
  const loanFor = (w) => loanMap.get(w.loan_number) || {};

  const aging = worksheets
    .filter((w) => w.stage !== "COMPLETE")
    .map((w) => {
      const loan = loanFor(w);
      const entered = stageEnteredAt(w, histories.get(w.id), now);
      return {
        worksheet_id: w.id,
        loan_number: w.loan_number,
        borrower_last: w.data?.cln || loan.borrower_last || "",
        stage: w.stage,
        entered_at: entered,
        hours_in_stage: elapsed(entered, now),
        lo: name(loan.lo_id),
        mlp: name(loan.mlp_id),
        processor: name(loan.processor_id),
      };
    })
    .sort((a, b) => (b.hours_in_stage ?? -1) - (a.hours_in_stage ?? -1));

  // One submitted worksheet is one observation. Repeated returns do not inflate
  // the returned-file numerator; return_events records that separate workload.
  const loMap = new Map();
  const mlpMap = new Map();
  for (const w of worksheets) {
    const loan = loanFor(w);
    const ts = histories.get(w.id);
    const firstSubmit = ts.find((t) => t.to_stage === "LO_SUBMITTED");
    if (!firstSubmit) continue;
    const k = loan.lo_id || "unassigned";
    if (!loMap.has(k))
      loMap.set(k, {
        lo_id: k,
        lo: name(loan.lo_id),
        submissions: 0,
        pushbacks: 0,
        return_events: 0,
        draft_hours: [],
      });
    const row = loMap.get(k);
    const returns = ts.filter(
      (t) =>
        t.to_stage === "RETURNED_TO_LO" && epoch(t.at) >= epoch(firstSubmit.at),
    );
    row.submissions++;
    row.pushbacks += returns.length ? 1 : 0;
    row.return_events += returns.length;
    row.draft_hours.push(
      elapsed(
        ts.find((t) => t.to_stage === "DRAFT")?.at || w.created_at,
        firstSubmit.at,
      ),
    );

    if (!loan.mlp_id) continue;
    if (!mlpMap.has(loan.mlp_id))
      mlpMap.set(loan.mlp_id, {
        mlp_id: loan.mlp_id,
        mlp: name(loan.mlp_id),
        files: 0,
        hours: [],
        overrides: 0,
        verified_fields: 0,
      });
    const mlp = mlpMap.get(loan.mlp_id);
    const firstStp = ts.find(
      (t) =>
        t.to_stage === "SUBMITTED_TO_PROCESSING" &&
        epoch(t.at) >= epoch(firstSubmit.at),
    );
    mlp.files++;
    mlp.hours.push(elapsed(firstSubmit.at, firstStp?.at));
    mlp.overrides += ts.filter(
      (t) =>
        t.from_stage === "MLP_REVIEW" &&
        t.to_stage === "SUBMITTED_TO_PROCESSING",
    ).length;
    mlp.verified_fields += Object.values(w.verified || {}).filter(
      Boolean,
    ).length;
  }
  const loQuality = [...loMap.values()]
    .map((r) => ({
      lo_id: r.lo_id,
      lo: r.lo,
      submissions: r.submissions,
      pushbacks: r.pushbacks,
      return_events: r.return_events,
      pushback_rate: rate(r.pushbacks, r.submissions),
      median_draft_hours: median(r.draft_hours),
    }))
    .sort((a, b) => b.pushback_rate - a.pushback_rate);
  const mlpVerification = [...mlpMap.values()].map((r) => ({
    mlp_id: r.mlp_id,
    mlp: r.mlp,
    files: r.files,
    median_review_hours: median(r.hours),
    completed_files: r.hours.filter(Number.isFinite).length,
    overrides: r.overrides,
    verified_fields: r.verified_fields,
  }));

  // Loan cohort: each loan appears once even when it has several worksheets.
  // Use the loan's current lock date, then the latest worksheet if absent.
  const lockToStp = [];
  const attributionRows = [];
  for (const loan of loanMap.values()) {
    const ws = worksheets
      .filter((w) => w.loan_number === loan.loan_number)
      .sort(
        (a, b) =>
          (epoch(b.updated_at || b.created_at) ?? 0) -
          (epoch(a.updated_at || a.created_at) ?? 0),
      );
    const current = ws[0];
    const rawLock =
      loan.lock_date || ws.find((w) => w.data?.lockDate)?.data.lockDate;
    const lock =
      isDate(rawLock) && epoch(rawLock) <= epoch(now) ? rawLock : null;
    const stps = ws
      .flatMap((w) => histories.get(w.id))
      .filter((t) => t.to_stage === "SUBMITTED_TO_PROCESSING")
      .sort(byTime);
    const stp = lock ? stps.find((t) => epoch(t.at) >= epoch(lock))?.at : null;
    const days = elapsed(lock, stp, 864e5);
    lockToStp.push({
      loan_number: loan.loan_number,
      worksheet_id: current?.id,
      lo: name(loan.lo_id),
      lock_date: lock,
      stp_at: stp || null,
      days: days == null ? null : Math.round(days * 10) / 10,
      raw_days: days,
      stage: loan.current_stage || current?.stage || "DRAFT",
      timing_issue:
        rawLock && !lock
          ? "Invalid or future lock date"
          : lock && stps.length && !stp
            ? "STP precedes current lock date"
            : null,
    });
    const reported = current?.data?.liaUsed;
    attributionRows.push({
      loan_number: loan.loan_number,
      worksheet_id: current?.id,
      lo: name(loan.lo_id),
      reported_use: ["Yes", "No"].includes(reported) ? reported : "Unanswered",
      result_link_present:
        reported === "Yes" && !!String(current?.data?.liaLink || "").trim(),
      evidence_status: "LOS Connector not connected",
    });
  }
  const locked = lockToStp.filter((r) => r.lock_date).length;
  const withDays = lockToStp.map((r) => r.raw_days).filter(Number.isFinite);
  const lockToStpSummary = {
    locked,
    reached_stp: withDays.length,
    conversion_pct: rate(withDays.length, locked),
    median_days: median(withDays),
    under_3: withDays.filter((d) => d <= 3).length,
    under_5: withDays.filter((d) => d <= 5).length,
    under_7: withDays.filter((d) => d <= 7).length,
    timing_issues: lockToStp.filter((r) => r.timing_issue).length,
  };
  const answered = attributionRows.filter(
    (r) => r.reported_use !== "Unanswered",
  ).length;
  const attribution = {
    total_loans: attributionRows.length,
    answered,
    unanswered: attributionRows.length - answered,
    reported_yes: attributionRows.filter((r) => r.reported_use === "Yes")
      .length,
    reported_no: attributionRows.filter((r) => r.reported_use === "No").length,
    result_links: attributionRows.filter((r) => r.result_link_present).length,
    tagging_pct: rate(answered, attributionRows.length),
    los_connected: false,
    verified_funded_loans: null,
    rows: attributionRows,
  };
  const stageDistribution = STAGE_ORDER.map((stage) => ({
    stage,
    count: worksheets.filter((w) => w.stage === stage).length,
  }));
  const worksheetIds = new Set(worksheets.map((w) => w.id));
  const recordedEvents = events.filter(
    (e) =>
      worksheetIds.has(e.worksheet_id) &&
      epoch(e.at) != null &&
      epoch(e.at) <= epoch(now),
  );
  const totals = {
    loans: loanMap.size,
    worksheets: worksheets.length,
    open_worksheets: aging.length,
    returned_worksheets: aging.filter((w) => w.stage.startsWith("RETURNED"))
      .length,
    submitted_worksheets: loQuality.reduce((n, r) => n + r.submissions, 0),
    return_events: loQuality.reduce((n, r) => n + r.return_events, 0),
    returned_files: loQuality.reduce((n, r) => n + r.pushbacks, 0),
    recorded_field_events: recordedEvents.length,
    stage_clock_gaps: aging.filter((w) => w.hours_in_stage == null).length,
  };
  return {
    aging,
    loQuality,
    mlpVerification,
    lockToStp,
    lockToStpSummary,
    attribution,
    stageDistribution,
    totals,
    generated_at: now,
  };
}
