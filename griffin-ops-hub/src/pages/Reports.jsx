import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import {
  PageHeader,
  StatStrip,
  Surface,
  StageBadge,
  Table,
  Button,
  Callout,
  fmtHours,
  fmtDate,
} from "../components/ui.jsx";
import { STAGE_LABEL } from "../lib/stages.js";
import { downloadCsv } from "../lib/reports.js";

const Export = ({ name, rows, columns }) => (
  <Button
    variant="outline"
    size="sm"
    disabled={!rows.length}
    onClick={() => downloadCsv(name, rows, columns)}
  >
    <Download size={14} /> Export CSV
  </Button>
);
const percent = (value) => (value == null ? "—" : `${value}%`);
const days = (value) =>
  value == null ? "—" : `${Math.round(value * 10) / 10}d`;

export default function Reports() {
  const { db, profile } = useAuth();
  const [r, reload, loading, error] = useAsync(
    () => db.reports(),
    [db, profile?.id],
  );
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  if (loading)
    return (
      <div className="empty" role="status">
        Building your operational report…
      </div>
    );
  if (error || !r)
    return (
      <Callout type="restriction" title="Reports could not load">
        <p>{error?.message || "No report data was returned."}</p>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </Callout>
    );
  const s = r.lockToStpSummary;
  const a = r.attribution;
  const filter = search.trim().toLowerCase();
  const aging = r.aging.filter(
    (row) =>
      (!stage || row.stage === stage) &&
      (!filter ||
        [
          row.loan_number,
          row.borrower_last,
          row.lo,
          row.mlp,
          row.processor,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(filter),
        )),
  );
  const maxStage = Math.max(
    1,
    ...r.stageDistribution.map((item) => item.count),
  );
  const returnedPct = r.totals.submitted_worksheets
    ? Math.round(
        (r.totals.returned_files / r.totals.submitted_worksheets) * 100,
      )
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Performance / Reports"
        title="Operational intelligence"
        lede="See where work slows down, where handoffs repeat, and what the audit trail can prove."
      >
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={15} /> Refresh report
        </Button>
      </PageHeader>
      <div className="report-context">
        <span>
          <span className="status-dot" />{" "}
          {db.mode === "local"
            ? "Local demonstration data"
            : "Your permitted records"}
        </span>
        <span>All available history · Updated {fmtDate(r.generated_at)}</span>
      </div>
      <StatStrip
        cells={[
          {
            fig: percent(s.conversion_pct),
            label: "Lock-to-STP conversion",
            sub: `${s.reached_stp} of ${s.locked} locked loans reached processing`,
            brand: true,
          },
          {
            fig: days(s.median_days),
            label: "Median lock → processing",
            sub: `${s.reached_stp} loans with valid timestamp pairs`,
          },
          {
            fig: r.totals.open_worksheets,
            label: "Open worksheets",
            sub: `${r.totals.returned_worksheets} currently returned for follow-up`,
          },
          {
            fig: percent(returnedPct),
            label: "Submitted files returned",
            sub: `${r.totals.returned_files} of ${r.totals.submitted_worksheets} submitted worksheets`,
          },
        ]}
      />
      <div className="report-tabs" role="group" aria-label="Report view">
        {[
          ["overview", "Pipeline overview"],
          ["team", "Team performance"],
          ["attribution", "LIA attribution"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            id={`tab-${id}`}
            aria-pressed={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "attribution" && <span className="report-tab-dot" />}
          </button>
        ))}
      </div>

      <div
        className="stack"
        role="region"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "overview" && (
          <>
            <div className="grid-eq">
              <Surface
                title="Pipeline distribution"
                kicker="Current stage of each worksheet. A loan can have more than one worksheet."
                right={
                  <span className="badge muted">
                    {r.totals.worksheets} worksheets
                  </span>
                }
              >
                <div className="report-stage-list">
                  {r.stageDistribution.map((item) => (
                    <div className="report-stage-row" key={item.stage}>
                      <div className="row-meta">
                        <span>{STAGE_LABEL[item.stage]}</span>
                        <span className="fig">{item.count}</span>
                      </div>
                      <div className="track">
                        <div
                          className={`bar-fill${item.stage === "COMPLETE" ? " ok" : ""}`}
                          style={{ width: `${(item.count / maxStage) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
              <Surface
                title="What the data tells you"
                kicker="A clear boundary between workflow progress and business outcomes."
              >
                <div className="report-insight">
                  <span className="report-insight-icon">
                    <TrendingUp size={20} />
                  </span>
                  <div>
                    <h3>
                      {s.reached_stp
                        ? `${s.reached_stp} locked ${s.reached_stp === 1 ? "loan has" : "loans have"} reached processing`
                        : "Processing throughput starts with the first handoff"}
                    </h3>
                    <p className="muted">
                      {s.reached_stp
                        ? `${s.under_3} within 3 days · ${s.under_5} within 5 days · ${s.under_7} within 7 days. These are cumulative calendar-day counts from the same locked-loan cohort.`
                        : "A valid lock date and a recorded processing transition are needed to calculate elapsed time."}
                    </p>
                  </div>
                </div>
                <div className="report-insight">
                  <span className="report-insight-icon">
                    <RefreshCw size={20} />
                  </span>
                  <div>
                    <h3>{r.totals.return_events} return-to-LO events</h3>
                    <p className="muted">
                      Across {r.totals.returned_files} submitted worksheets. The
                      return rate counts each affected worksheet once, even if
                      it is returned repeatedly.
                    </p>
                  </div>
                </div>
                <div className="report-insight">
                  <span className="report-insight-icon">
                    <ShieldAlert size={20} />
                  </span>
                  <div>
                    <h3>Funded-loan impact is unverified</h3>
                    <p className="muted">
                      LIA usage is reported by the LO. The LOS Connector must
                      link those touchpoints to funding events before
                      productivity or cycle-time impact can be established.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTab("attribution")}
                    >
                      Inspect attribution <ArrowUpRight size={14} />
                    </Button>
                  </div>
                </div>
              </Surface>
            </div>

            <Surface
              title="Stage aging"
              kicker="Time since the latest recorded entry into the current stage. Saving fields does not reset this clock."
              right={
                <Export
                  name="stage-aging.csv"
                  rows={aging}
                  columns={[
                    "loan_number",
                    "borrower_last",
                    "stage",
                    "entered_at",
                    "hours_in_stage",
                    "lo",
                    "mlp",
                    "processor",
                  ]}
                />
              }
            >
              <div className="report-toolbar">
                <label className="report-search">
                  <Search size={16} />
                  <input
                    aria-label="Search stage aging"
                    placeholder="Search loan, borrower, or owner…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <select
                  className="sel"
                  aria-label="Filter stage aging"
                  value={stage}
                  onChange={(event) => setStage(event.target.value)}
                >
                  <option value="">All open stages</option>
                  {r.stageDistribution
                    .filter((item) => item.stage !== "COMPLETE")
                    .map((item) => (
                      <option key={item.stage} value={item.stage}>
                        {STAGE_LABEL[item.stage]}
                      </option>
                    ))}
                </select>
                <span className="small muted">
                  {aging.length}{" "}
                  {aging.length === 1 ? "worksheet" : "worksheets"}
                </span>
              </div>
              {!aging.length ? (
                <div className="empty">
                  {search || stage
                    ? "No worksheets match these filters."
                    : "No open worksheets to age."}
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Loan / borrower</th>
                      <th>Stage</th>
                      <th className="num">In stage</th>
                      <th>Loan officer</th>
                      <th>MLP</th>
                      <th>Processor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aging.map((row) => (
                      <tr key={row.worksheet_id}>
                        <td>
                          <Link
                            className="mono"
                            to={`/worksheets/${row.worksheet_id}`}
                          >
                            {row.loan_number}
                          </Link>
                          <div className="small muted">
                            {row.borrower_last || "Borrower not entered"}
                          </div>
                        </td>
                        <td>
                          <StageBadge stage={row.stage} />
                        </td>
                        <td
                          className="num"
                          title={
                            row.entered_at
                              ? `Entered ${fmtDate(row.entered_at)}`
                              : "No valid stage-entry event"
                          }
                        >
                          {row.hours_in_stage == null ? (
                            <span className="muted">Not recorded</span>
                          ) : (
                            fmtHours(row.hours_in_stage)
                          )}
                        </td>
                        <td>{row.lo}</td>
                        <td>{row.mlp}</td>
                        <td>{row.processor}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {r.totals.stage_clock_gaps > 0 && (
                <p className="small muted">
                  {r.totals.stage_clock_gaps} open worksheets are missing a
                  valid current-stage event and are excluded from age
                  comparisons.
                </p>
              )}
            </Surface>
            <Surface
              title="Lock to processing"
              kicker="One row per loan. Timing uses the current lock date and the first processing handoff on or after that date."
              right={
                <Export
                  name="lock-to-processing.csv"
                  rows={r.lockToStp}
                  columns={[
                    "loan_number",
                    "lo",
                    "lock_date",
                    "stp_at",
                    "days",
                    "stage",
                    "timing_issue",
                  ]}
                />
              }
            >
              {!r.lockToStp.length ? (
                <div className="empty">No loan records yet.</div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Loan</th>
                      <th>Loan officer</th>
                      <th>Lock date</th>
                      <th>Processing handoff</th>
                      <th className="num">Elapsed</th>
                      <th>Current stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lockToStp.map((row) => (
                      <tr key={row.loan_number}>
                        <td>
                          <Link
                            className="mono"
                            to={`/loans/${encodeURIComponent(row.loan_number)}`}
                          >
                            {row.loan_number}
                          </Link>
                        </td>
                        <td>{row.lo}</td>
                        <td className="mono">
                          {row.lock_date || "Not recorded"}
                        </td>
                        <td>
                          {row.stp_at
                            ? fmtDate(row.stp_at)
                            : row.timing_issue || "Not reached"}
                        </td>
                        <td className="num">{days(row.days)}</td>
                        <td>
                          <StageBadge stage={row.stage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Surface>
          </>
        )}

        {tab === "team" && (
          <>
            <Surface
              title="LO submission quality"
              kicker="Submitted worksheets grouped by the loan’s current LO assignment. Returns count distinct submitted worksheets."
              right={
                <Export
                  name="lo-submission-quality.csv"
                  rows={r.loQuality}
                  columns={[
                    "lo",
                    "submissions",
                    "pushbacks",
                    "return_events",
                    "pushback_rate",
                    "median_draft_hours",
                  ]}
                />
              }
            >
              {!r.loQuality.length ? (
                <div className="empty">
                  Team metrics appear after the first LO submission.
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Loan officer</th>
                      <th className="num">Submitted</th>
                      <th className="num">Returned files</th>
                      <th className="num">Return events</th>
                      <th className="num">Return rate</th>
                      <th className="num">Median draft time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.loQuality.map((row) => (
                      <tr key={row.lo_id}>
                        <td>
                          <b>{row.lo}</b>
                        </td>
                        <td className="num">{row.submissions}</td>
                        <td className="num">{row.pushbacks}</td>
                        <td className="num">{row.return_events}</td>
                        <td className="num">{percent(row.pushback_rate)}</td>
                        <td className="num">
                          {fmtHours(row.median_draft_hours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Surface>
            <Surface
              title="MLP handoff performance"
              kicker="Elapsed calendar time from the first LO submission to the first processing handoff, including waits and rework."
              right={
                <Export
                  name="mlp-handoff-performance.csv"
                  rows={r.mlpVerification}
                  columns={[
                    "mlp",
                    "files",
                    "completed_files",
                    "median_review_hours",
                    "overrides",
                    "verified_fields",
                  ]}
                />
              }
            >
              {!r.mlpVerification.length ? (
                <div className="empty">
                  No submitted worksheets have an MLP assigned.
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>MLP</th>
                      <th className="num">Submitted files assigned</th>
                      <th className="num">Reached processing</th>
                      <th className="num">Median elapsed</th>
                      <th className="num">Overrides</th>
                      <th className="num">Fields currently verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.mlpVerification.map((row) => (
                      <tr key={row.mlp_id}>
                        <td>
                          <b>{row.mlp}</b>
                        </td>
                        <td className="num">{row.files}</td>
                        <td className="num">{row.completed_files}</td>
                        <td className="num">
                          {fmtHours(row.median_review_hours)}
                        </td>
                        <td className="num">{row.overrides}</td>
                        <td className="num">{row.verified_fields}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <p className="small muted">
                Assignments are current, not historical attribution to the
                person who performed every action. Elapsed time is not labor
                time. An override is a direct MLP Review → Submitted to
                Processing transition.
              </p>
            </Surface>
          </>
        )}

        {tab === "attribution" && (
          <>
            <div className="report-attribution">
              <ShieldAlert size={24} />
              <div>
                <h2>Usage signals are present. Impact evidence is pending.</h2>
                <p>
                  The LOS Connector is not connected. No funded-loan
                  attribution, labor savings, or application-to-funding
                  improvement can be verified from these records.
                </p>
              </div>
              <span className="badge warn">Connection required</span>
            </div>
            <StatStrip
              cells={[
                {
                  fig: percent(a.tagging_pct),
                  label: "LIA tagging completion",
                  sub: `${a.answered} of ${a.total_loans} loans answered Yes or No`,
                },
                {
                  fig: a.reported_yes,
                  label: "LIA use reported",
                  sub: "LO worksheet response; unverified",
                },
                {
                  fig: a.result_links,
                  label: "Result links recorded",
                  sub: "Link presence does not verify the result",
                },
                {
                  fig: "Unavailable",
                  label: "Verified funded-loan coverage",
                  sub: "Requires LOS Connector evidence",
                  small: true,
                },
              ]}
            />
            <Surface
              title="Loan-level attribution readiness"
              kicker="One loan per row, using its most recently updated worksheet. These are current declarations, not verified historical touchpoints."
              right={
                <Export
                  name="lia-attribution-readiness.csv"
                  rows={a.rows}
                  columns={[
                    "loan_number",
                    "lo",
                    "reported_use",
                    "result_link_present",
                    "evidence_status",
                  ]}
                />
              }
            >
              {!a.rows.length ? (
                <div className="empty">
                  Create a worksheet and record whether Guided Loan Pricing was
                  run in LIA.
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Loan</th>
                      <th>Loan officer</th>
                      <th>LIA reported use</th>
                      <th>Result link</th>
                      <th>Funding evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.rows.map((row) => (
                      <tr key={row.loan_number}>
                        <td>
                          <Link
                            className="mono"
                            to={`/loans/${encodeURIComponent(row.loan_number)}`}
                          >
                            {row.loan_number}
                          </Link>
                        </td>
                        <td>{row.lo}</td>
                        <td>
                          <span
                            className={`badge ${row.reported_use === "Unanswered" ? "warn" : "muted"}`}
                          >
                            {row.reported_use}
                          </span>
                        </td>
                        <td>
                          {row.result_link_present
                            ? "Recorded, unverified"
                            : "Not recorded"}
                        </td>
                        <td className="muted">Not connected</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Surface>
            <Surface
              title="Evidence needed to prove impact"
              kicker="The audit layer connects activity to measurable loan outcomes."
            >
              <ol className="report-evidence-list">
                <li>
                  <b>Link the loan.</b> Match each LIA session to the stable LOS
                  loan identifier.
                </li>
                <li>
                  <b>Record the touchpoint.</b> Capture the action, actor,
                  source event ID, and timestamp.
                </li>
                <li>
                  <b>Verify the outcome.</b> Reconcile application and funding
                  events from the LOS.
                </li>
                <li>
                  <b>Measure the difference.</b> Establish comparable cohorts
                  and measured handling time before claiming productivity or
                  cycle-time improvement.
                </li>
              </ol>
            </Surface>
          </>
        )}
      </div>
      <details className="report-methodology">
        <summary>Metric definitions & data boundaries</summary>
        <div>
          <p>
            <b>Scope:</b> all records returned for the current user. Open-stage
            and team metrics count worksheets. Lock conversion and attribution
            count distinct loan numbers. No unobserved records are estimated.
          </p>
          <p>
            <b>Lock-to-STP conversion:</b> loans with a valid lock date and a
            processing handoff on or after that date divided by all loans with a
            valid, nonfuture lock date. It measures recorded handoffs, not
            funding or eventual conversion. Median elapsed time includes only
            valid timestamp pairs. Date-only lock values are interpreted as
            midnight UTC.
          </p>
          <p>
            <b>Stage aging:</b> time since the latest valid transition into the
            worksheet’s current stage. Missing events display as not recorded.
            Draft time starts at the recorded draft event, with worksheet
            creation as fallback.
          </p>
          <p>
            <b>Attribution:</b> LO declarations and link presence are readiness
            signals. Completed workflow status is not a funding event. Local
            demo records can be edited or reset and do not constitute a
            production audit log.
          </p>
          {s.timing_issues > 0 && (
            <p>
              <b>Data quality:</b> {s.timing_issues} loans have invalid, future,
              or inconsistent lock timing. Their invalid timing pairs are
              excluded.
            </p>
          )}
        </div>
      </details>
    </>
  );
}
