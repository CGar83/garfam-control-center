import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  FilePlus2,
  Filter,
  LayoutGrid,
  List,
  Search,
  CircleDashed,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import { isOverrideRole, STAGE_LABEL, STAGE_ORDER } from "../lib/stages.js";
import { downloadCsv } from "../lib/reports.js";
import { completeness } from "../lib/schema.js";
import { loadWorkspace, isMyWork, attentionFor } from "../lib/workspace.js";
import {
  Button,
  StageBadge,
  Badge,
  fmtHours,
  LoadState,
  Dialog,
} from "../components/ui.jsx";

const EMPTY_ROWS = [];
const ageLabel = (row) =>
  row.hours == null ? "Not recorded" : fmtHours(row.hours);
const compareAge = (a, b, direction) => {
  if (a.hours == null || b.hours == null)
    return a.hours == null && b.hours == null ? 0 : a.hours == null ? 1 : -1;
  return direction === "newest" ? a.hours - b.hours : b.hours - a.hours;
};
const columns = [
  ["LO input", ["DRAFT", "RETURNED_TO_LO"]],
  ["MLP review", ["LO_SUBMITTED", "MLP_REVIEW", "RETURNED_TO_MLP"]],
  ["Ready for handoff", ["MLP_VERIFIED", "SUBMITTED_TO_PROCESSING"]],
  ["Processing", ["PROCESSING_ACCEPTED"]],
  ["Complete", ["COMPLETE"]],
];
export default function Queue() {
  const { db, profile } = useAuth();
  const [bundle, reload, loading, error] = useAsync(
    () => loadWorkspace(db),
    [db, profile?.id],
  );
  const [tab, setTab] = useState("active"),
    [query, setQuery] = useState(""),
    [stage, setStage] = useState(""),
    [view, setView] = useState("list"),
    [sort, setSort] = useState("oldest"),
    [selected, setSelected] = useState(null),
    [sampleBusy, setSampleBusy] = useState(false),
    [sampleError, setSampleError] = useState("");
  const rows = bundle?.rows || EMPTY_ROWS;
  const active = rows.filter((r) => r.stage !== "COMPLETE"),
    mine = rows.filter((r) => isMyWork(r, profile)),
    returned = active.filter((r) => r.stage.startsWith("RETURNED")),
    aging = active.filter((r) => r.hours >= 48);
  const visible = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (tab === "all" ||
              (tab === "active" && r.stage !== "COMPLETE") ||
              (tab === "mine" && isMyWork(r, profile)) ||
              (tab === "returned" && r.stage.startsWith("RETURNED")) ||
              (tab === "complete" && r.stage === "COMPLETE")) &&
            (!stage ||
              (stage.startsWith("group:")
                ? columns[Number(stage.slice(6))][1].includes(r.stage)
                : r.stage === stage)) &&
            `${r.loan_number} ${r.data?.cln} ${r.owner} ${r.investor?.name}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "borrower"
            ? (a.data?.cln || "").localeCompare(b.data?.cln || "")
            : compareAge(a, b, sort),
        ),
    [rows, profile, tab, stage, query, sort],
  );
  const createAllowed = ["LO", "LOA", "MANAGER", "ADMIN"].includes(
    profile.role,
  );
  const summaryTitle =
    {
      LO: "Files needing your input",
      LOA: "Files needing LO input",
      MLP: "Verification queue",
      PROCESSOR: "Submission handoff queue",
      MANAGER: "Operations overview",
      ADMIN: "Operations overview",
    }[profile.role] || "Operations overview";
  const loadSamples = async () => {
    setSampleBusy(true);
    setSampleError("");
    try {
      await db.loadDemoPortfolio();
      reload();
    } catch (e) {
      setSampleError(e.message);
    } finally {
      setSampleBusy(false);
    }
  };
  const exportRows = () => {
    downloadCsv(
      "griffin-queue.csv",
      visible.map((r) => ({
        loan_number: r.loan_number,
        borrower: r.data?.cln,
        stage: STAGE_LABEL[r.stage],
        owner: r.owner,
        stage_entered_at: r.stageAt || "",
        hours_in_stage: r.hours == null ? "" : Number(r.hours.toFixed(1)),
        lia_reported: r.data?.liaUsed || "Not recorded",
      })),
    );
  };
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  const chosen = rows.find((r) => r.id === selected);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">WORKSPACE / SUBMISSION OPERATIONS</div>
          <h1>{summaryTitle}</h1>
          <p className="lede">
            Submission preparation and human-recorded handoffs. Processing
            execution belongs in Cadre.
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="outline"
            onClick={exportRows}
            disabled={!visible.length}
          >
            <Download />
            Export
          </Button>
          {createAllowed && (
            <Button variant="brand" to="/new">
              <FilePlus2 />
              New worksheet
            </Button>
          )}
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          label="Active worksheets"
          value={active.length}
          sub={`${rows.filter((r) => r.stage === "COMPLETE").length} completed in this workspace`}
          Icon={LayoutGrid}
          onClick={() => setTab("active")}
        />
        <Metric
          label="Assigned to you"
          value={mine.length}
          sub={
            isOverrideRole(profile.role)
              ? "All open files within your access"
              : "Your next actions across the pipeline"
          }
          Icon={CircleDashed}
          onClick={() => setTab("mine")}
        />
        <Metric
          label="Returned for correction"
          value={returned.length}
          sub="Resolve the note, then resubmit"
          Icon={RotateCcw}
          kind="warn"
          onClick={() => setTab("returned")}
        />
        <Metric
          label="Waiting over 48 hours"
          value={aging.length}
          sub="Review threshold · not a policy SLA"
          Icon={Clock3}
          kind={aging.length ? "warn" : ""}
          onClick={() => {
            setTab("active");
            setSort("oldest");
          }}
        />
      </div>
      <section className="flow-overview" aria-label="Worksheet flow">
        <div className="flow-label">
          <span className="eyebrow">THE HANDOFF</span>
          <strong>Every file has a next step.</strong>
        </div>
        <div className="flow-stages">
          {columns.map(([label, stages], i) => (
            <button
              key={label}
              onClick={() => {
                setTab(i === 4 ? "complete" : "active");
                setStage(`group:${i}`);
                setQuery("");
              }}
              aria-label={`View ${label} worksheets`}
            >
              <span className="step-num">0{i + 1}</span>
              <span>
                {label}
                <b>{rows.filter((r) => stages.includes(r.stage)).length}</b>
              </span>
              {i < 4 && <ArrowRight size={14} />}
            </button>
          ))}
        </div>
      </section>
      <div className="queue-layout">
        <section className="queue-panel">
          <div
            className="queue-tabs"
            role="group"
            aria-label="Worksheet queue filters"
          >
            {[
              ["active", "All active", active.length],
              ["mine", "My queue", mine.length],
              ["returned", "Returned", returned.length],
              ["complete", "Completed", rows.length - active.length],
            ].map(([id, label, count]) => (
              <button
                type="button"
                aria-pressed={tab === id}
                className={tab === id ? "active" : ""}
                key={id}
                onClick={() => {
                  setTab(id);
                  setStage("");
                }}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
            <div className="view-toggle">
              <button
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={17} />
              </button>
              <button
                aria-label="Board view"
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                <LayoutGrid size={17} />
              </button>
            </div>
          </div>
          <div className="queue-toolbar">
            <div className="input-search">
              <Search size={16} />
              <input
                aria-label="Search worksheets"
                placeholder="Search loan, borrower, or owner…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="select-wrap">
              <Filter size={14} />
              <select
                aria-label="Filter by stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">All stages</option>
                {columns.map(([label], i) => (
                  <option key={label} value={`group:${i}`}>
                    {label} group
                  </option>
                ))}
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="sort-select"
              aria-label="Sort worksheets"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
              <option value="borrower">Borrower A–Z</option>
            </select>
          </div>
          {!rows.length ? (
            <div className="workspace-empty">
              <div className="empty-symbol">
                <FilePlus2 size={30} />
              </div>
              <h2>Your first handoff starts here.</h2>
              <p>
                Create a DSCR worksheet, or explore a fictional portfolio across
                every stage.
              </p>
              <div className="heading-actions">
                {createAllowed && (
                  <Button to="/new" variant="brand">
                    Create worksheet
                    <ArrowRight />
                  </Button>
                )}
                {db.mode === "local" && (
                  <Button
                    variant="outline"
                    onClick={loadSamples}
                    disabled={sampleBusy}
                  >
                    {sampleBusy ? "Loading…" : "Load sample portfolio"}
                  </Button>
                )}
              </div>
              {sampleError && <p role="alert">{sampleError}</p>}
              <small>
                Sample data stays in this browser. Do not enter real borrower
                information in demo mode.
              </small>
            </div>
          ) : !visible.length ? (
            <div className="workspace-empty">
              <Search size={28} />
              <h2>No matching worksheets</h2>
              <p>Try another queue, stage, or search term.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setTab("active");
                  setStage("");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : view === "list" ? (
            <div className="tw">
              <table className="t queue-table">
                <thead>
                  <tr>
                    <th>Loan / borrower</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    <th>Completion</th>
                    <th className="num">
                      In stage <ArrowDown size={12} />
                    </th>
                    <th aria-label="Open worksheet" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const c = completeness(
                      r.schema_snapshot || bundle.schema,
                      {
                        data: r.data,
                        investor: r.investor,
                        product: r.form_type,
                        PR: bundle.investors.PR,
                      },
                      "LO",
                    );
                    const pct = c.required
                      ? Math.round((c.filled / c.required) * 100)
                      : 0;
                    return (
                      <tr key={r.id}>
                        <td>
                          <button
                            className="loan-title"
                            onClick={() => setSelected(r.id)}
                          >
                            {r.data?.cln || r.loan.borrower_last || "Unnamed"}
                            <ArrowUpRight size={12} />
                          </button>
                          <span className="loan-caption">
                            #{r.loan_number}
                            <span>DSCR</span>
                          </span>
                        </td>
                        <td>
                          <StageBadge stage={r.stage} />
                          {r.stage.startsWith("RETURNED") && (
                            <div className="table-note">
                              Correction requested
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="owner-cell">
                            <span className="avatar tiny">
                              {r.owner
                                .split(" ")
                                .filter((x) => x !== "Demo")
                                .map((x) => x[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div>
                              {r.owner.replace("Demo ", "")}
                              <small>{r.ownerRole || "Finished"}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="completion-cell">
                            <div className="track">
                              <div
                                className="bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span>{pct}%</span>
                          </div>
                        </td>
                        <td
                          className={
                            "num stage-age " +
                            (r.hours >= 48 && r.stage !== "COMPLETE"
                              ? "aged"
                              : "")
                          }
                        >
                          {r.stage === "COMPLETE" ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <>
                              <Clock3 size={13} />
                              {ageLabel(r)}
                            </>
                          )}
                        </td>
                        <td>
                          <Link
                            className="row-open"
                            to={`/worksheets/${r.id}`}
                            aria-label={`Open ${r.data?.cln || r.loan_number} worksheet`}
                          >
                            <ArrowRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="kanban">
              {columns.map(([label, stages]) => (
                <div className="kanban-column" key={label}>
                  <h3>
                    {label}
                    <span>
                      {visible.filter((r) => stages.includes(r.stage)).length}
                    </span>
                  </h3>
                  {visible
                    .filter((r) => stages.includes(r.stage))
                    .map((r) => (
                      <Link
                        className="kanban-card"
                        key={r.id}
                        to={`/worksheets/${r.id}`}
                      >
                        <span className="loan-caption">#{r.loan_number}</span>
                        <strong>{r.data?.cln || "Unnamed"}</strong>
                        <StageBadge stage={r.stage} />
                        <div>
                          <span>{r.owner.replace("Demo ", "")}</span>
                          <span>{ageLabel(r)}</span>
                        </div>
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          )}
          <div className="table-footer">
            <span>
              {visible.length} of {rows.length} worksheets
            </span>
            <span>
              {active.some((r) => r.hours == null)
                ? `${active.filter((r) => r.hours == null).length} open worksheets have no recorded stage entry`
                : "Stage time comes from handoff events"}
            </span>
          </div>
        </section>
        <aside className="attention-panel">
          <div className="section-heading">
            <h2>Attention needed</h2>
            <span className="count-dot">
              {
                active.filter(
                  (r) => r.stage.startsWith("RETURNED") || r.hours >= 48,
                ).length
              }
            </span>
          </div>
          <p className="panel-caption">The next places to remove friction.</p>
          {active
            .filter((r) => r.stage.startsWith("RETURNED") || r.hours >= 48)
            .sort((a, b) => compareAge(a, b, "oldest"))
            .slice(0, 3)
            .map((r) => (
              <Link
                to={`/worksheets/${r.id}`}
                className="attention-card"
                key={r.id}
              >
                <Badge variant="warn">{attentionFor(r).label}</Badge>
                <strong>
                  {r.data?.cln} <span>#{r.loan_number}</span>
                </strong>
                <p>
                  {r.latestNote ||
                    "Review the file and confirm its next owner."}
                </p>
                <div>
                  {r.hours == null
                    ? "Stage entry not recorded"
                    : `${ageLabel(r)} in stage`}
                  <ArrowUpRight size={15} />
                </div>
              </Link>
            ))}
          {!active.some(
            (r) => r.stage.startsWith("RETURNED") || r.hours >= 48,
          ) && (
            <div className="attention-empty">
              <CheckCircle2 size={26} />
              <strong>No exceptions in this view</strong>
              <p>Returned and aging files will appear here.</p>
            </div>
          )}
          <div className="attribution-card">
            <div className="eyebrow">LIA ATTRIBUTION</div>
            <h3>
              Connect the work
              <br />
              to the outcome.
            </h3>
            <p>
              Worksheet usage is self-reported. Funded-loan evidence requires
              the LOS Connector.
            </p>
            <Link to="/workspace">
              View connection status
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
      {chosen && (
        <Dialog
          title={`${chosen.data?.cln || "Loan"} · #${chosen.loan_number}`}
          onClose={() => setSelected(null)}
        >
          <StageBadge stage={chosen.stage} />
          <dl className="detail-grid">
            <div>
              <dt>Current owner</dt>
              <dd>{chosen.owner}</dd>
            </div>
            <div>
              <dt>Time in stage</dt>
              <dd>{ageLabel(chosen)}</dd>
            </div>
            <div>
              <dt>Guided Loan Pricing used</dt>
              <dd>{chosen.data?.liaUsed || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Funded-loan linkage</dt>
              <dd>Not connected</dd>
            </div>
          </dl>
          <p className="detail-note">
            {chosen.latestNote || "No handoff note recorded."}
          </p>
          <div className="heading-actions">
            <Button variant="brand" to={`/worksheets/${chosen.id}`}>
              Open worksheet
              <ArrowRight />
            </Button>
            <Button variant="outline" to={`/loans/${chosen.loan_number}`}>
              Loan record
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function Metric({ label, value, sub, Icon, kind = "", onClick }) {
  return (
    <button className={"metric-card " + kind} onClick={onClick}>
      <div className="metric-label">
        {label}
        <Icon size={17} />
      </div>
      <strong>{value.toString().padStart(2, "0")}</strong>
      <div className="metric-sub">{sub}</div>
    </button>
  );
}
