import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Download,
  Link2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import {
  Badge,
  Button,
  LoadState,
  PageHeader,
  fmtHours,
} from "../components/ui.jsx";
import { downloadCsv } from "../lib/reports.js";
import { WORK_STATUS_LABEL } from "../lib/operations.js";
import { computeOperationsMetrics } from "../lib/operationsMetrics.js";

const DEPARTMENTS = {
  LO: "Origination",
  LOA: "Loan assistance",
  MLP: "File preparation",
  PROCESSOR: "Processing",
  CLOSING: "Closing",
  LOCK_DESK: "Lock desk",
  UNASSIGNED: "Unassigned",
};
const percentage = (value) => (value == null ? "Unavailable" : `${value}%`);
const calendarDate = (iso) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function OperationsInsights() {
  const { db, profile } = useAuth();
  const [department, setDepartment] = useState("");
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [items, profiles] = await Promise.all([
      db.listWorkItems(),
      db.listProfiles(),
    ]);
    const activity = await Promise.all(
      items.map((item) => db.getWorkActivity(item.id)),
    );
    return {
      items,
      profiles,
      activities: Object.fromEntries(
        items.map((item, index) => [item.id, activity[index]]),
      ),
      generated_at: new Date().toISOString(),
    };
  }, [db, profile?.id]);
  const metrics = useMemo(
    () =>
      bundle
        ? computeOperationsMetrics({
            items: bundle.items.filter(
              (item) =>
                !department ||
                (item.department ||
                  item.template_snapshot?.department ||
                  "UNASSIGNED") === department,
            ),
            activities: bundle.activities,
            profiles: bundle.profiles,
            now: bundle.generated_at,
            asOfDate: calendarDate(bundle.generated_at),
          })
        : null,
    [bundle, department],
  );
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  const s = metrics.summary;
  const departments = [
    ...new Set(
      bundle.items.map(
        (item) =>
          item.department || item.template_snapshot?.department || "UNASSIGNED",
      ),
    ),
  ].sort();
  const maxStatus = Math.max(1, ...metrics.statuses.map((row) => row.count));

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONS / INSIGHTS"
        title="Measure the work behind the loan."
        lede="Recorded work, internal target dates, and self-reported handling time across the records available to your account."
      >
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={15} />
          Refresh
        </Button>
        <Button
          variant="outline"
          disabled={!metrics.departments.length}
          onClick={() =>
            downloadCsv("operations-by-department.csv", metrics.departments)
          }
        >
          <Download size={15} />
          Export team metrics
        </Button>
      </PageHeader>
      <div className="ops-filters">
        <label htmlFor="insights-department" className="small muted">
          Report scope
        </label>
        <select
          id="insights-department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">All permitted departments</option>
          {departments.map((value) => (
            <option key={value} value={value}>
              {DEPARTMENTS[value] || value}
            </option>
          ))}
        </select>
        <span className="small muted">
          {s.total} work items · as of {metrics.as_of_date} · all available
          history
        </span>
        <Badge variant={db.mode === "local" ? "warn" : "muted"}>
          {db.mode === "local" ? "Demonstration records" : "Permitted records"}
        </Badge>
      </div>
      <div className="ops-stat-grid">
        {[
          {
            label: "Open work",
            value: s.active,
            detail: `${s.backlog} draft or queued · ${s.review} ready for review`,
            Icon: CircleAlert,
          },
          {
            label: "Blocked / past target",
            value: `${s.blocked} / ${s.overdue}`,
            detail: "Open work only; a task can be in both counts",
            Icon: CircleAlert,
            tone: "amber",
          },
          {
            label: "Recorded active minutes",
            value: s.recorded_minutes,
            detail: `${s.time_entries} self-reported time entries`,
            Icon: Clock3,
          },
          {
            label: "Loan-linked work",
            value: `${s.linked_items} / ${s.total}`,
            detail: `${s.unique_loans} distinct loan numbers`,
            Icon: Link2,
          },
        ].map((stat) => (
          <div key={stat.label} className={`ops-stat ${stat.tone || ""}`}>
            <div>
              <span>{stat.label}</span>
              <stat.Icon size={18} />
            </div>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </div>
      <div className="readiness-grid">
        <section className="ops-panel ops-field-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Current work status</h2>
              <p>Each work item is counted once in its current status.</p>
            </div>
            <Badge>{s.total} items</Badge>
          </div>
          <div className="report-stage-list">
            {metrics.statuses.map((row) => (
              <div className="report-stage-row" key={row.status}>
                <div className="row-meta">
                  <span>{WORK_STATUS_LABEL[row.status] || row.status}</span>
                  <b>{row.count}</b>
                </div>
                <div className="track">
                  <div
                    className={`bar-fill${row.status === "COMPLETE" ? " ok" : ""}`}
                    style={{ width: `${(row.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="ops-panel ops-field-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Completion and coverage</h2>
              <p>Observation counts make the limits visible.</p>
            </div>
          </div>
          <dl className="record-facts">
            <div>
              <dt>Current work completion</dt>
              <dd>
                {percentage(s.completion_pct)}
                <small className="ops-row-meta">
                  {s.completed} complete / {s.noncancelled} noncancelled items
                </small>
              </dd>
            </div>
            <div>
              <dt>Handling-time coverage</dt>
              <dd>
                {percentage(s.time_coverage_pct)}
                <small className="ops-row-meta">
                  {s.items_with_time} of {s.total} work items have a recorded
                  time entry
                </small>
              </dd>
            </div>
            <div>
              <dt>Median creation-to-completion</dt>
              <dd>
                {fmtHours(s.median_completion_hours)}
                <small className="ops-row-meta">
                  {s.completed_timing_count} valid completed pairs; elapsed
                  calendar time
                </small>
              </dd>
            </div>
            <div>
              <dt>Measured time savings</dt>
              <dd>
                Unknown
                <small className="ops-row-meta">
                  No comparable handling-time baseline or control cohort
                </small>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Department performance</h2>
            <p>
              Current department assignment. Logged minutes describe reported
              work performed.
            </p>
          </div>
        </div>
        {!metrics.departments.length ? (
          <div className="ops-empty">
            <Clock3 size={28} />
            <h3>No work records in this scope.</h3>
            <p>
              Create work and record actual handling time to establish a
              baseline.
            </p>
            <Button variant="brand" to="/workflows">
              Browse workflows
              <ArrowRight size={14} />
            </Button>
          </div>
        ) : (
          <div
            className="ops-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Work by department"
          >
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="num">Open</th>
                  <th className="num">Blocked</th>
                  <th className="num">Past target</th>
                  <th className="num">Complete</th>
                  <th className="num">Recorded minutes</th>
                  <th className="num">Time coverage</th>
                </tr>
              </thead>
              <tbody>
                {metrics.departments.map((row) => (
                  <tr key={row.department}>
                    <td>
                      <b>{DEPARTMENTS[row.department] || row.department}</b>
                      <small>{row.linked_items} loan-linked items</small>
                    </td>
                    <td className="num">{row.active}</td>
                    <td className="num">{row.blocked}</td>
                    <td className="num">{row.overdue}</td>
                    <td className="num">
                      {row.completed} / {row.total - row.cancelled}
                    </td>
                    <td className="num">{row.recorded_minutes}</td>
                    <td className="num">{percentage(row.time_coverage_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Blocked and past-target work</h2>
            <p>
              {metrics.attention.length} items need attention. Past target
              compares the internal due date with the report calendar date.
            </p>
          </div>
          <Button variant="outline" size="sm" to="/operations">
            Open portfolio
            <ArrowRight size={14} />
          </Button>
        </div>
        {!metrics.attention.length ? (
          <div className="ops-empty">
            <p>No blocked or past-target records in this scope.</p>
          </div>
        ) : (
          <div
            className="ops-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Items requiring attention"
          >
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Work / loan</th>
                  <th>Owner</th>
                  <th>Attention</th>
                  <th>Target date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.attention.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="ops-work-title" to={`/work/${item.id}`}>
                        {item.title ||
                          item.template_snapshot?.title ||
                          item.template_id}
                      </Link>
                      <small>#{item.loan_number || "Not linked"}</small>
                    </td>
                    <td>{item.owner}</td>
                    <td>
                      <Badge variant="warn">{item.reason}</Badge>
                    </td>
                    <td>{item.due_date || "Not set"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.attention.length > 10 && (
              <p className="small muted">
                Showing 10 of {metrics.attention.length}. The portfolio contains
                the complete queue.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="report-attribution">
        <ShieldAlert size={23} />
        <div>
          <h2>Loan linkage is the start of attribution.</h2>
          <p>
            {s.linked_items} work items reference {s.unique_loans} loan numbers.
            Verified LIA touchpoints and funded-loan outcomes are unavailable.
            The LOS Connector and measured baselines are required to establish
            LIA’s impact.
          </p>
        </div>
        <Button variant="outline" size="sm" to="/integrations">
          Connection plan
          <ArrowRight size={14} />
        </Button>
      </div>
      <details className="report-methodology">
        <summary>Metric definitions and evidence limits</summary>
        <p>
          Scope is the selected department within records returned for the
          current user. Current completion is complete items divided by
          noncancelled items. Open excludes complete and cancelled; backlog is
          draft plus queued. Closed items never count as past target.
        </p>
        <p>
          Handling time is the sum of unique valid entries greater than zero and
          at most 1,440 minutes, including fractional minutes, with nonfuture
          timestamps. It is self-reported active work, separate from elapsed
          creation-to-completion time. Missing time entries are missing
          coverage, not proof that work required no effort. Work completion does
          not establish loan funding.
        </p>
        <p>
          Target dates are internal dates. This view compares them with{" "}
          {metrics.as_of_date}, the browser calendar date when the report
          loaded. It does not calculate TRID or another regulatory deadline.
        </p>
        {(s.excluded_time_entries > 0 || s.invalid_due_dates > 0) && (
          <p>
            Data quality: {s.excluded_time_entries} invalid time entries and{" "}
            {s.invalid_due_dates} invalid target dates were excluded from their
            respective calculations.
          </p>
        )}
      </details>
    </>
  );
}
