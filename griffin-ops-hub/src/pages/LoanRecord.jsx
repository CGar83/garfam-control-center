import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  Download,
  FileClock,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import {
  PageHeader,
  Surface,
  StageBadge,
  Table,
  Button,
  Callout,
  Label,
  fmtDate,
  fmtHours,
} from "../components/ui.jsx";
import { STAGE_LABEL } from "../lib/stages.js";
import { stageEnteredAt, downloadCsv } from "../lib/reports.js";
import { WorkBadge, NewWorkDialog } from "./Operations.jsx";
import { isCoordinationWork, evidenceSummary } from "../lib/coordination.js";
import {
  PHASES,
  GENERAL_PHASE,
  nextTemplateId,
  phaseTitle,
  templatePhase,
  uiShort,
  uiTitle,
  departmentLabel,
} from "../lib/catalog.js";
import { WORK_STATUS_LABEL } from "../lib/operations.js";
import {
  blockedReason,
  isOpen,
  isOverdue,
  localDate,
  phaseCounts,
  sortWork,
  suggestedPhase,
} from "../lib/workView.js";

const EMPTY = [];
const formatValue = (value) =>
  value == null || value === ""
    ? "Empty"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
const eventLabels = {
  COMPLETED: "Field completed",
  EDITED: "Field updated",
  VERIFIED: "Field verified",
  UNVERIFIED: "Verification removed",
};
const workEventLabel = (event, titles) => {
  const title = titles[event.work_item_id] || "Work item";
  switch (event.action) {
    case "CREATED":
      return `Work created: ${title}`;
    case "STATUS_CHANGED":
    case "SAMPLE_STATUS":
      return `${title}: ${WORK_STATUS_LABEL[event.from_status] || event.from_status || "Created"} → ${WORK_STATUS_LABEL[event.to_status] || event.to_status}`;
    case "UPDATED":
      return `${title}: saved ${Object.keys(event.changes || {}).length} change${Object.keys(event.changes || {}).length === 1 ? "" : "s"}`;
    case "TIME_LOGGED":
      return `${title}: ${event.minutes} minutes recorded`;
    case "LOAN_COORDINATION":
      return "Loan coordination context updated";
    default:
      return `${title}: ${String(event.action || "updated").replaceAll("_", " ").toLowerCase()}`;
  }
};
const safeLink = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};
const TABS = ["now", "work", "flow", "evidence", "dscr", "activity"];

function exportActivity(loanNumber, rows, names) {
  downloadCsv(
    `loan-${loanNumber.replace(/[^\w-]/g, "")}-activity.csv`,
    rows.map((row) => ({
      at: row.at,
      source: row.kind,
      record: row.worksheet_id || row.work_item_id || "",
      action: row.label,
      actor: names[row.actor_id] || row.actor_role || "Unknown actor",
      role: row.actor_role || "",
      note: row.note || "",
      recorded_values:
        row.value_snapshot == null && row.changes == null
          ? ""
          : JSON.stringify(row.value_snapshot ?? row.changes),
    })),
    ["at", "source", "record", "action", "actor", "role", "note", "recorded_values"],
  );
}

function CoordinationEditor({ loan, onSaved }) {
  const { db } = useAuth();
  const supported = db.capabilities?.loanCoordination !== false;
  const [editing, setEditing] = useState(false);
  const [phase, setPhase] = useState(loan.hub_phase || "");
  const [status, setStatus] = useState(loan.observed_los_status || "");
  const [note, setNote] = useState(loan.coordination_note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await db.setLoanCoordination(loan.loan_number, {
        hubPhase: phase,
        observedLosStatus: status,
        note,
      });
      setEditing(false);
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="loan-context-bar">
      <div>
        <span className="eyebrow">HUB COORDINATION PHASE</span>
        <strong>{loan.hub_phase ? phaseTitle(loan.hub_phase) : "Not set"}</strong>
        <small>Human-set. Not a LendingPad milestone.</small>
      </div>
      <div>
        <span className="eyebrow">OBSERVED LOS STATUS</span>
        <strong>{loan.observed_los_status || "Not recorded"}</strong>
        <small>
          Manual note, unverified
          {loan.coordination_recorded_at
            ? ` · ${fmtDate(loan.coordination_recorded_at)}`
            : ""}
        </small>
      </div>
      <div>
        <span className="eyebrow">COORDINATION NOTE</span>
        <strong className="loan-context-note">
          {loan.coordination_note || "None"}
        </strong>
        <small>What the next person should know first.</small>
      </div>
      <div className="loan-context-action">
        {supported ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Update
          </Button>
        ) : (
          <small>Read-only in this connected workspace.</small>
        )}
      </div>
      {editing && (
        <div className="loan-context-form">
          <div className="g2">
            <div>
              <Label htmlFor="hub-phase">Hub coordination phase</Label>
              <select
                id="hub-phase"
                className="sel"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                disabled={busy}
              >
                <option value="">Not set</option>
                {PHASES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="los-status">Observed LOS status</Label>
              <input
                id="los-status"
                className="inp"
                value={status}
                maxLength={200}
                placeholder="As seen in LendingPad, e.g. Submitted to UW"
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="span2">
              <Label htmlFor="coordination-note">Coordination note</Label>
              <input
                id="coordination-note"
                className="inp"
                value={note}
                maxLength={200}
                placeholder="One line the next owner needs first"
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="heading-actions">
            <Button variant="brand" size="sm" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save context"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoanRecord() {
  const { loanNumber } = useParams();
  const { db, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "now";
  const phaseFilter = params.get("phase") || "";
  const setTab = (next, extra = {}) => {
    const copy = new URLSearchParams(params);
    if (next === "now") copy.delete("tab");
    else copy.set("tab", next);
    for (const [key, value] of Object.entries(extra)) {
      if (value) copy.set(key, value);
      else copy.delete(key);
    }
    setParams(copy, { replace: true });
  };
  const [auditFilter, setAuditFilter] = useState("all");
  const [creating, setCreating] = useState(null);
  const [b, reload, loading, error] = useAsync(async () => {
    const [loan, worksheets, profiles, workItems, loanEvents] = await Promise.all([
      db.findLoan(loanNumber),
      db.listWorksheets({ loanNumber }),
      db.listProfiles(),
      db.listWorkItems({ loanNumber }),
      db.listLoanEvents ? db.listLoanEvents(loanNumber).catch(() => []) : [],
    ]);
    const [activity, schemas] = await Promise.all([
      Promise.all(worksheets.map((w) => db.getActivity(w.id))),
      Promise.all(
        [...new Set(worksheets.map((w) => w.form_type))].map((type) =>
          db.getSchema(type),
        ),
      ),
    ]);
    const labels = {};
    for (const schema of schemas)
      for (const section of schema?.sections || [])
        for (const field of section.fields || []) {
          if (field.key) labels[field.key] = field.label || field.key;
          for (const item of field.items || [])
            labels[item.key] = item.label || item.key;
          for (const [part, key] of Object.entries(field.keys || {}))
            labels[key] = `${field.label || "Address"} · ${part}`;
          if (field.ynKey) labels[field.ynKey] = field.label || field.ynKey;
          if (field.valueKey)
            labels[field.valueKey] = `${field.label || field.valueKey} · value`;
        }
    const transitions = activity.flatMap((a) => a.transitions || []);
    const events = activity.flatMap((a) => a.events || []);
    const titles = Object.fromEntries(
      workItems.map((item) => [item.id, uiShort(item.template_id, item.title)]),
    );
    const timeline = [
      ...transitions.map((t) => ({
        ...t,
        kind: "transition",
        label: `${t.from_stage ? STAGE_LABEL[t.from_stage] || t.from_stage : "Created"} → ${STAGE_LABEL[t.to_stage] || t.to_stage}`,
      })),
      ...events.map((e) => ({
        ...e,
        kind: "field",
        label: `${eventLabels[e.action] || e.action}: ${labels[e.field_key] || e.field_key}`,
      })),
      ...loanEvents.map((e) => ({
        ...e,
        kind: "work",
        label: workEventLabel(e, titles),
      })),
    ].sort(
      (a, b) =>
        (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0),
    );
    return {
      loan,
      worksheets,
      profiles,
      transitions,
      events,
      loanEvents,
      timeline,
      labels,
      workItems,
      titles,
    };
  }, [db, loanNumber, profile?.id]);
  const workItems = b?.workItems || EMPTY;
  const counts = useMemo(() => phaseCounts(workItems), [workItems]);

  if (loading)
    return (
      <div className="empty" role="status">
        Loading loan record and activity…
      </div>
    );
  if (error || !b)
    return (
      <Callout type="restriction" title="Loan record could not load">
        <p>{error?.message || "No loan data was returned."}</p>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </Callout>
    );
  const names = Object.fromEntries(
    b.profiles.map((p) => [p.id, p.full_name.replace("Demo ", "")]),
  );
  const canCreate = ["LO", "LOA", "MANAGER", "ADMIN"].includes(profile?.role);
  if (!b.loan)
    return (
      <>
        <Button variant="outline" to="/loans">
          <ArrowLeft size={14} /> All loans
        </Button>
        <PageHeader
          eyebrow="Loan record"
          title={<span className="mono">#{loanNumber}</span>}
          lede="This loan number does not have a record available to your account."
        >
          {canCreate && (
            <Button
              variant="brand"
              to={`/new?loan=${encodeURIComponent(loanNumber)}`}
            >
              Start a submission worksheet
            </Button>
          )}
        </PageHeader>
      </>
    );

  const l = b.loan;
  const today = localDate();
  const openWork = workItems.filter(isOpen);
  const blockedWork = openWork.filter((item) => item.status === "BLOCKED");
  const nextWork = sortWork(openWork, "priority").sort(
    (a, c) => (c.status === "BLOCKED") - (a.status === "BLOCKED"),
  )[0];
  const latestComplete = [...workItems]
    .filter((item) => item.status === "COMPLETE")
    .sort((a, c) => String(c.completed_at || c.updated_at).localeCompare(String(a.completed_at || a.updated_at)))[0];
  const suggestedNext =
    latestComplete && nextTemplateId(latestComplete.template_id);
  const suggestionOpen =
    suggestedNext && openWork.some((item) => item.template_id === suggestedNext);
  const evidenceItems = workItems.filter(isCoordinationWork);
  const latest = [...b.worksheets].sort(
    (a, c) =>
      (new Date(c.updated_at).getTime() || 0) -
      (new Date(a.updated_at).getTime() || 0),
  )[0];
  const data = latest?.data || {};
  const enteredAt = latest ? stageEnteredAt(latest, b.transitions) : null;
  const inStageHours = enteredAt
    ? (Date.now() - new Date(enteredAt).getTime()) / 36e5
    : null;
  const resultLink = safeLink(data.liaLink);
  const reportedUse = ["Yes", "No"].includes(data.liaUsed)
    ? data.liaUsed
    : "Unanswered";
  const audit = b.timeline.filter(
    (row) =>
      auditFilter === "all" ||
      (auditFilter === "transitions"
        ? row.kind === "transition"
        : auditFilter === "verification"
          ? ["VERIFIED", "UNVERIFIED"].includes(row.action)
          : auditFilter === "work"
            ? row.kind === "work"
            : row.kind === "field"),
  );
  const amount = Number(data.la);
  const flowPhase = l.hub_phase || suggestedPhase(workItems);
  const workByPhase = [...PHASES, GENERAL_PHASE]
    .map((phase) => ({
      ...phase,
      items: sortWork(
        workItems.filter((item) => templatePhase(item.template_id) === phase.id),
        "priority",
      ).sort((a, c) => isOpen(c) - isOpen(a)),
    }))
    .filter((phase) => phase.items.length && (!phaseFilter || phase.id === phaseFilter));

  return (
    <>
      <Link className="record-back" to="/loans">
        <ArrowLeft size={14} /> Loans
      </Link>
      <PageHeader
        eyebrow="Loan record"
        title={
          <>
            {l.borrower_last || data.cln || "Borrower not entered"}{" "}
            <span className="faint">/</span>{" "}
            <span className="mono">{l.loan_number}</span>
          </>
        }
        lede={`${l.product_type || latest?.form_type || "Product not set"} · ${l.branch || "Branch not set"} · LO ${names[l.lo_id] || "unassigned"} · MLP ${names[l.mlp_id] || "unassigned"} · Processor ${names[l.processor_id] || "unassigned"}`}
      >
        <Button
          variant="outline"
          to={`/journey?loan=${encodeURIComponent(l.loan_number)}&phase=${flowPhase}`}
        >
          Flow <ArrowUpRight size={15} />
        </Button>
        {latest && (
          <Button variant="outline" to={`/worksheets/${latest.id}`}>
            DSCR worksheet <ArrowUpRight size={15} />
          </Button>
        )}
        <Button variant="brand" onClick={() => setCreating({ template: "" })}>
          Start work <ArrowUpRight size={15} />
        </Button>
      </PageHeader>
      <CoordinationEditor loan={l} onSaved={reload} />
      <ol className="phase-stepper" aria-label="Hub coordination phases">
        {counts
          .filter((phase) => phase.id !== "general")
          .map((phase, index) => {
            const current = flowPhase === phase.id;
            return (
              <li
                key={phase.id}
                className={`${current ? "current" : ""} ${phase.open ? "has-open" : ""} ${phase.blocked ? "has-blocked" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setTab("work", { phase: phaseFilter === phase.id ? "" : phase.id })}
                  aria-pressed={phaseFilter === phase.id}
                  title={`${phase.open} open · ${phase.complete} complete`}
                >
                  <span className="phase-index">{String(index + 1).padStart(2, "0")}</span>
                  <b>{phase.short}</b>
                  <small>
                    {phase.open
                      ? `${phase.open} open${phase.blocked ? ` · ${phase.blocked} blocked` : ""}`
                      : phase.complete
                        ? `${phase.complete} complete`
                        : "No Hub work"}
                  </small>
                </button>
              </li>
            );
          })}
      </ol>
      <div className="report-tabs loan-tabs" role="tablist" aria-label="Loan record view">
        {[
          ["now", "Now"],
          ["work", `Work (${openWork.length} open · ${workItems.length})`],
          ["flow", "Flow"],
          ["evidence", `Evidence (${evidenceItems.length})`],
          ...(b.worksheets.length
            ? [["dscr", `DSCR (${b.worksheets.length})`]]
            : []),
          ["activity", `Activity (${b.timeline.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`loan-tab-${id}`}
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id, { phase: "" })}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="stack"
        role="region"
        id={`loan-panel-${tab}`}
        aria-labelledby={`loan-tab-${tab}`}
      >
        {tab === "now" && (
          <>
            <div className="grid-eq loan-now-grid">
              <Surface
                title="Next action"
                kicker="The single next Hub action. Blocked work is named, not silent."
              >
                {!nextWork ? (
                  <div className="empty">
                    No open Hub work on this loan.
                    <div className="heading-actions" style={{ marginTop: 12 }}>
                      <Button variant="brand" onClick={() => setCreating({ template: "" })}>
                        Start work
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="loan-now">
                    <div>
                      <span className="eyebrow">
                        {nextWork.status === "BLOCKED" ? "UNBLOCK FIRST" : "NEXT ACTION"}
                      </span>
                      <h3>
                        <Link to={`/work/${nextWork.id}`}>
                          {uiShort(nextWork.template_id, nextWork.title)}
                        </Link>
                      </h3>
                      <p>
                        {departmentLabel(nextWork.department)} ·{" "}
                        {names[nextWork.owner_id] || "Unassigned"} · target{" "}
                        <span className={isOverdue(nextWork, today) ? "ops-late" : ""}>
                          {nextWork.due_date || "not set"}
                        </span>
                      </p>
                    </div>
                    <WorkBadge status={nextWork.status} />
                  </div>
                )}
                {suggestedNext && !suggestionOpen && (
                  <div className="next-handoff compact">
                    <div>
                      <span className="eyebrow">SUGGESTED NEXT FORM</span>
                      <strong>{uiTitle(suggestedNext)}</strong>
                      <p>
                        Follows the completed {uiShort(latestComplete.template_id)}.
                        A suggestion, not a required sequence.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCreating({ template: suggestedNext })}>
                      Start <ArrowRight size={13} />
                    </Button>
                  </div>
                )}
              </Surface>
              <Surface
                title={`Blocked (${blockedWork.length})`}
                kicker="Every block names the missing artifact and who recorded it."
              >
                {!blockedWork.length ? (
                  <div className="empty">Nothing on this loan is blocked.</div>
                ) : (
                  <ul className="loan-blockers">
                    {blockedWork.map((item) => {
                      const reason = blockedReason(
                        b.loanEvents.filter((e) => e.work_item_id === item.id),
                      );
                      return (
                        <li key={item.id}>
                          <CircleAlert size={16} />
                          <div>
                            <Link to={`/work/${item.id}`}>
                              <b>{uiShort(item.template_id, item.title)}</b>
                            </Link>
                            <p>{reason || "No block reason was recorded."}</p>
                            <small>
                              {departmentLabel(item.department)} ·{" "}
                              {names[item.owner_id] || "Unassigned"}
                            </small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Surface>
            </div>
            <div className="grid-eq">
              <Surface title="File ownership" kicker="Current assignments for this loan.">
                <dl className="record-facts">
                  <div>
                    <dt>Loan officer</dt>
                    <dd>{names[l.lo_id] || "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>MLP</dt>
                    <dd>{names[l.mlp_id] || "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Processor</dt>
                    <dd>{names[l.processor_id] || "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Open work owners</dt>
                    <dd>
                      {[...new Set(openWork.map((item) => names[item.owner_id] || "Unassigned"))].join(", ") || "None"}
                    </dd>
                  </div>
                </dl>
              </Surface>
              <Surface
                title="Loan snapshot"
                kicker="Values from the latest worksheet. Subject to human verification."
              >
                <dl className="record-facts">
                  <div>
                    <dt>Requested amount</dt>
                    <dd>
                      {Number.isFinite(amount) && amount > 0
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(amount)
                        : "Not entered"}
                    </dd>
                  </div>
                  <div>
                    <dt>Property</dt>
                    <dd>
                      {[data.st1, data.city, data.state, data.zip]
                        .filter(Boolean)
                        .join(", ") || "Not entered"}
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded lock date</dt>
                    <dd>{l.lock_date || data.lockDate || "Not entered"}</dd>
                  </div>
                  <div>
                    <dt>Disclosures sent</dt>
                    <dd>{l.disclosure_sent_at || data.discDate || "Not entered"}</dd>
                  </div>
                  <div>
                    <dt>Submission stage</dt>
                    <dd>
                      {latest ? <StageBadge stage={latest.stage} /> : "No worksheet"}
                      {enteredAt ? (
                        <span className="small muted"> · {fmtHours(inStageHours)} in stage</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Guided Loan Pricing in LIA</dt>
                    <dd>
                      {reportedUse} <span className="small muted">· LO-reported</span>
                      {reportedUse === "Yes" && resultLink ? (
                        <>
                          {" "}
                          <a href={resultLink} target="_blank" rel="noopener noreferrer">
                            result <ArrowUpRight size={12} />
                          </a>
                        </>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </Surface>
            </div>
            <Surface
              title="Latest activity"
              right={
                <Button variant="outline" size="sm" onClick={() => setTab("activity")}>
                  Full audit trail <ArrowUpRight size={13} />
                </Button>
              }
            >
              {!b.timeline.length ? (
                <div className="empty">No activity has been recorded.</div>
              ) : (
                <ul className="timeline">
                  {b.timeline.slice(0, 6).map((row, index) => (
                    <li key={`${row.kind}-${row.id || index}`}>
                      <b>{row.label}</b>
                      <span className="who">
                        {" "}· {names[row.actor_id] || row.actor_role || "Unknown actor"} · {fmtDate(row.at)}
                      </span>
                      {row.note && <div className="note-t">{row.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </>
        )}
        {tab === "work" && (
          <Surface
            title={phaseFilter ? `Work in ${phaseTitle(phaseFilter)}` : "Work by phase"}
            kicker="Open items first inside each phase. These records do not change LOS milestones."
            right={
              <div className="heading-actions">
                {phaseFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setTab("work", { phase: "" })}>
                    All phases
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setCreating({ template: "" })}>
                  Start work <ArrowUpRight size={13} />
                </Button>
              </div>
            }
          >
            {!workByPhase.length ? (
              <div className="empty">
                {phaseFilter
                  ? "No Hub work in this phase yet."
                  : "No operations work has been created for this loan."}
              </div>
            ) : (
              workByPhase.map((phase) => (
                <section key={phase.id} className="loan-work-phase">
                  <header>
                    <span className="eyebrow">{phase.title}</span>
                    <small>
                      {phase.items.filter(isOpen).length} open · {phase.items.length} total
                    </small>
                  </header>
                  <div className="ops-table-wrap" tabIndex={0} role="region" aria-label={`Work in ${phase.title}`}>
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Work</th>
                          <th>Team / owner</th>
                          <th>Status</th>
                          <th>Internal target</th>
                          <th>Last saved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase.items.map((item) => (
                          <tr key={item.id} className={isOpen(item) ? "" : "closed"}>
                            <td>
                              <Link className="ops-work-title" to={`/work/${item.id}`}>
                                {uiShort(item.template_id, item.title)}
                              </Link>
                              <small>
                                {item.title !== uiTitle(item.template_id) ? `${item.title} · ` : ""}
                                v{item.template_version}
                              </small>
                            </td>
                            <td>
                              <b>{departmentLabel(item.department)}</b>
                              <small>{names[item.owner_id] || "Unassigned"}</small>
                            </td>
                            <td>
                              <WorkBadge status={item.status} />
                            </td>
                            <td className={isOverdue(item, today) ? "ops-late" : ""}>
                              {item.due_date || "Not set"}
                            </td>
                            <td>{fmtDate(item.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </Surface>
        )}
        {tab === "flow" && (
          <Surface
            title="Hub coordination phases"
            kicker="A reference map. Selecting a phase does not set LendingPad status."
            right={
              <Button
                variant="outline"
                size="sm"
                to={`/journey?loan=${encodeURIComponent(l.loan_number)}&phase=${flowPhase}`}
              >
                Open the playbook <ArrowUpRight size={13} />
              </Button>
            }
          >
            <div className="loan-flow-phases">
              {counts.map((phase) => {
                const related = workItems.filter(
                  (item) => templatePhase(item.template_id) === phase.id,
                );
                return (
                  <article key={phase.id} className={flowPhase === phase.id ? "current" : ""}>
                    <header>
                      <b>{phase.title}</b>
                      <small>
                        {phase.open} open · {phase.total} total
                      </small>
                    </header>
                    <p>{phase.job}</p>
                    {sortWork(related).slice(0, 4).map((item) => (
                      <Link key={item.id} to={`/work/${item.id}`}>
                        {uiShort(item.template_id, item.title)}
                        <WorkBadge status={item.status} />
                      </Link>
                    ))}
                    {!related.length && (
                      <span className="small muted">
                        No Hub work in this phase yet. Outside the Hub: {phase.outside}.
                      </span>
                    )}
                    {phase.id !== "general" && (
                      <Link
                        className="loan-flow-open"
                        to={`/journey?loan=${encodeURIComponent(l.loan_number)}&phase=${phase.id}`}
                      >
                        Playbook steps <ArrowRight size={13} />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </Surface>
        )}
        {tab === "evidence" && (
          <Surface
            title="Evidence & handoffs"
            kicker="Work items write evidence. Completing them is not LOS condition clearance."
            right={
              <Button variant="outline" size="sm" to="/evidence">
                Evidence desk <ArrowUpRight size={13} />
              </Button>
            }
          >
            {!evidenceItems.length ? (
              <div className="empty">
                No coordination packets on this loan.
                <div className="heading-actions" style={{ marginTop: 12 }}>
                  <Button variant="outline" size="sm" onClick={() => setCreating({ template: "CONDITION_FOLLOWUP" })}>
                    Start a condition follow-up
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="home-now-list">
                {evidenceItems.map((item) => (
                  <li key={item.id}>
                    <Link to={`/work/${item.id}`}>
                      <span>
                        <b>{uiShort(item.template_id, item.title)}</b>
                        <small>
                          Evidence: {evidenceSummary(item).state} ·{" "}
                          {names[item.owner_id] || "Unassigned"}
                        </small>
                      </span>
                      <WorkBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        )}
        {tab === "dscr" && (
          <Surface
            title="DSCR worksheet"
            kicker="A workflow type on this loan, not a separate product."
            right={
              canCreate ? (
                <Button variant="outline" size="sm" to={`/new?loan=${encodeURIComponent(l.loan_number)}`}>
                  New worksheet
                </Button>
              ) : null
            }
          >
            {!b.worksheets.length ? (
              <div className="empty">No DSCR worksheet on this loan.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stage</th>
                    <th>Stage entered</th>
                    <th>Last saved</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {b.worksheets.map((w) => {
                    const entered = stageEnteredAt(w, b.transitions);
                    return (
                      <tr key={w.id}>
                        <td>
                          <b>{w.form_type}</b>
                          <div className="small muted mono">{w.id.slice(0, 8)}</div>
                        </td>
                        <td>
                          <StageBadge stage={w.stage} />
                        </td>
                        <td>{entered ? fmtDate(entered) : "Not recorded"}</td>
                        <td>{fmtDate(w.updated_at)}</td>
                        <td className="num">
                          <Button variant="outline" size="sm" to={`/worksheets/${w.id}`}>
                            Open <ArrowUpRight size={13} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Surface>
        )}
        {tab === "activity" && (
          <Surface
            title="Recorded activity"
            kicker={
              db.mode === "local"
                ? "One timeline: worksheet stages, field events, and every operations work event. Local demonstration ledger."
                : "One timeline: worksheet stages, field events, and every operations work event available to your account."
            }
            right={
              <Button
                variant="outline"
                size="sm"
                disabled={!audit.length}
                onClick={() => exportActivity(l.loan_number, audit, names)}
              >
                <Download size={14} /> Export shown
              </Button>
            }
          >
            <div className="report-toolbar">
              <FileClock size={18} />
              <div className="ops-tabs" role="group" aria-label="Filter activity">
                {[
                  ["all", "All"],
                  ["work", "Work events"],
                  ["transitions", "Worksheet stages"],
                  ["fields", "Field changes"],
                  ["verification", "Verification"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={auditFilter === id ? "selected" : ""}
                    aria-pressed={auditFilter === id}
                    onClick={() => setAuditFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="small muted">{audit.length} records</span>
            </div>
            {!audit.length ? (
              <div className="empty">No recorded activity matches this view.</div>
            ) : (
              <ol className="timeline audit-timeline">
                {audit.map((row, index) => (
                  <li className="audit-entry" key={`${row.kind}-${row.id || index}`}>
                    <div className="row-meta">
                      <b>{row.label}</b>
                      <span
                        className={`badge ${row.kind === "transition" ? "brand" : row.kind === "work" ? "outline" : "muted"}`}
                      >
                        {row.kind === "transition"
                          ? "Stage change"
                          : row.kind === "work"
                            ? "Work"
                            : ["VERIFIED", "UNVERIFIED"].includes(row.action)
                              ? "Verification"
                              : "Field change"}
                      </span>
                    </div>
                    <div className="who">
                      {names[row.actor_id] || row.actor_role || "Unknown actor"}
                      {row.actor_role ? ` · ${row.actor_role}` : ""} ·{" "}
                      <time dateTime={row.at} title={row.at}>
                        {fmtDate(row.at)}
                      </time>
                      {row.worksheet_id ? (
                        <>
                          {" "}·{" "}
                          <Link to={`/worksheets/${row.worksheet_id}`}>
                            Worksheet {String(row.worksheet_id).slice(0, 8)}
                          </Link>
                        </>
                      ) : row.work_item_id ? (
                        <>
                          {" "}·{" "}
                          <Link to={`/work/${row.work_item_id}`}>
                            {b.titles[row.work_item_id] || "Open work item"}
                          </Link>
                        </>
                      ) : null}
                    </div>
                    {row.note && <div className="note-t">{row.note}</div>}
                    {(row.value_snapshot != null || row.changes != null) && (
                      <details className="audit-values">
                        <summary>View recorded values</summary>
                        {row.value_snapshot &&
                        typeof row.value_snapshot === "object" &&
                        ("from" in row.value_snapshot || "to" in row.value_snapshot) ? (
                          <dl className="record-facts">
                            <div>
                              <dt>Before</dt>
                              <dd>{formatValue(row.value_snapshot.from)}</dd>
                            </div>
                            <div>
                              <dt>After</dt>
                              <dd>{formatValue(row.value_snapshot.to)}</dd>
                            </div>
                          </dl>
                        ) : row.changes ? (
                          <dl className="record-facts">
                            {Object.entries(row.changes).map(([key, change]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>
                                  {formatValue(change?.from)} → {formatValue(change?.to)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p>{formatValue(row.value_snapshot)}</p>
                        )}
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Surface>
        )}
      </div>
      {!l.lo_id && !openWork.length && (
        <div className="report-attribution">
          <ShieldAlert size={22} />
          <div>
            <h2>No owner and no open work.</h2>
            <p>Assign the file through a work item so someone is accountable for the next step.</p>
          </div>
        </div>
      )}
      {creating && (
        <NewWorkDialog
          initialLoan={l.loan_number}
          initialTemplate={creating.template || undefined}
          onClose={() => {
            setCreating(null);
            reload();
          }}
          profiles={b.profiles}
          loans={[l]}
          openWork={workItems}
        />
      )}
    </>
  );
}
