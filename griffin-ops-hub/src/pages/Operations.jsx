import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  Download,
  FilePlus2,
  Folders,
  Hand,
  Layers3,
  List,
  Rows3,
  Search,
  Timer,
  Workflow,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import templates from "../data/operationsTemplates.json";
import { WORK_STATUS_LABEL, workProgress } from "../lib/operations.js";
import { departmentRole } from "../lib/operationsPolicy.js";
import {
  DESKS,
  DEPARTMENT_LABEL,
  ROLE_STARTERS,
  phaseTitle,
  templatePhase,
  templatesByPhase,
  uiShort,
  uiTitle,
  whenToUse,
} from "../lib/catalog.js";
import {
  canClaim,
  groupByLoan,
  isDueToday,
  isOpen,
  isOverdue,
  localDate,
  relativeAge,
  sortWork,
} from "../lib/workView.js";
import {
  Badge,
  Button,
  Dialog,
  Input,
  Label,
  LoadState,
  PageHeader,
} from "../components/ui.jsx";
import { downloadCsv } from "../lib/reports.js";

const EMPTY = [];
const DENSITY_KEY = "gfhub.work.density";
const SCOPES = [
  ["active", "Active"],
  ["mine", "Mine"],
  ["today", "Due today"],
  ["overdue", "Past target"],
  ["blocked", "Blocked"],
  ["review", "Ready for review"],
  ["unclaimed", "Unclaimed"],
  ["complete", "Complete"],
  ["all", "All"],
];
const SORTS = [
  ["priority", "Priority"],
  ["target", "Target date"],
  ["updated", "Last touched"],
  ["loan", "Loan number"],
];
const DESK_COPY = {
  closing: ["Closing desk", "Bring every closing into focus."],
  mlp: ["MLP desk", "Keep the borrower and the file moving."],
  processing: ["Processing desk", "Packets, Cadre receipts, and conditions."],
  lock: ["Lock desk", "Lock requests and CD readiness."],
  lo: ["Origination desk", "Packages and lock requests from the LO side."],
  mine: ["My work", "Work with your name on it."],
  "": ["Work", "Move the work. Keep the context."],
};
const readDensity = () => {
  try {
    return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
};

export function WorkBadge({ status }) {
  return (
    <Badge
      variant={
        status === "COMPLETE"
          ? "ok"
          : status === "BLOCKED"
            ? "warn"
            : status === "REVIEW"
              ? "brand"
              : "muted"
      }
    >
      {WORK_STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function NewWorkDialog({
  onClose,
  initialTemplate,
  initialLoan,
  profiles = EMPTY,
  loans = EMPTY,
  openWork = EMPTY,
}) {
  const { db, profile } = useAuth(),
    nav = useNavigate();
  const recommended = (ROLE_STARTERS[profile?.role] || []).filter((id) =>
    templates.some((t) => t.id === id),
  );
  const [type, setType] = useState(
    templates.some((t) => t.id === initialTemplate)
      ? initialTemplate
      : recommended[0] || templates[0]?.id || "CD_REQUEST",
  );
  const [loan, setLoan] = useState(initialLoan || ""),
    [borrower, setBorrower] = useState(""),
    [priority, setPriority] = useState("NORMAL"),
    [due, setDue] = useState(""),
    [owner, setOwner] = useState(""),
    [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false);
  const template = templates.find((t) => t.id === type);
  const departments = template?.allowedDepartments || [template?.department];
  const ownDepartment = profile?.role === "LOA" ? "LO" : profile?.role;
  const selectedDepartment = departments.includes(department)
    ? department
    : departments.includes(ownDepartment)
      ? ownDepartment
      : template?.department;
  const knownLoan = loans.find((l) => l.loan_number === loan.trim());
  const branch = knownLoan?.branch || profile?.branch;
  const owners = profiles.filter(
    (p) =>
      p.active !== false &&
      !!p.branch &&
      p.branch === branch &&
      departmentRole(selectedDepartment, p.role),
  );
  const alreadyOpen = openWork.filter(
    (item) => item.loan_number === loan.trim() && isOpen(item),
  );
  const duplicate = alreadyOpen.filter((item) => item.template_id === type);
  const create = async (e) => {
    e.preventDefault();
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const item = await db.createWorkItem({
        loanNumber: loan.trim(),
        borrowerLast: borrower.trim() || knownLoan?.borrower_last || "",
        templateId: type,
        department: selectedDepartment,
        priority,
        dueDate: due || null,
        ownerId: owner || null,
      });
      onClose();
      nav(`/work/${item.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const grouped = templatesByPhase(templates);
  return (
    <Dialog
      title="Start loan work"
      onClose={() => !busy && onClose()}
      className="ops-create-dialog"
    >
      <p className="lede">One loan record. A named team. A clear next action.</p>
      <form onSubmit={create}>
        <fieldset disabled={busy} className="worksheet-fieldset">
          <div className="g2">
            <div>
              <Label htmlFor="work-loan" required>
                Loan number
              </Label>
              <Input
                id="work-loan"
                autoFocus={!initialLoan}
                value={loan}
                onChange={(value) => {
                  setLoan(value);
                  setOwner("");
                }}
                required
                list="known-loans"
                placeholder="LendingPad loan number"
                maxLength={40}
                pattern="[A-Za-z0-9-]+"
              />
              <datalist id="known-loans">
                {loans.map((l) => (
                  <option key={l.loan_number} value={l.loan_number}>
                    {l.borrower_last}
                  </option>
                ))}
              </datalist>
              {knownLoan ? (
                <p className="hint">
                  {knownLoan.borrower_last || "Borrower not recorded"} ·{" "}
                  {knownLoan.product_type || "Product not set"} ·{" "}
                  <Link to={`/loans/${encodeURIComponent(knownLoan.loan_number)}`}>
                    open record
                  </Link>
                </p>
              ) : loan.trim() ? (
                <p className="hint">
                  New to the Hub. A loan record is created with this work.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="work-borrower">Client last name</Label>
              <Input
                id="work-borrower"
                value={borrower}
                onChange={setBorrower}
                placeholder={knownLoan?.borrower_last || "For a new loan record"}
                maxLength={120}
              />
            </div>
            <div className="span2">
              <Label htmlFor="work-template" required>
                Workflow
              </Label>
              <select
                id="work-template"
                className="sel"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setDepartment("");
                  setOwner("");
                }}
              >
                {recommended.length > 0 && (
                  <optgroup label="Recommended for your desk">
                    {recommended.map((id) => (
                      <option key={`rec-${id}`} value={id}>
                        {uiTitle(id)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {grouped.map((phase) => (
                  <optgroup key={phase.id} label={phase.title}>
                    {phase.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {uiTitle(t)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="hint">
                <b>Use when:</b> {whenToUse(template || {})}{" "}
                <b>Does not mean:</b> {template?.boundary?.slice(0, 140)}
              </p>
            </div>
            {alreadyOpen.length > 0 && (
              <div className="span2 ops-open-on-loan" role="status">
                <b>
                  {alreadyOpen.length} open item{alreadyOpen.length === 1 ? "" : "s"}{" "}
                  already on #{loan.trim()}
                  {duplicate.length ? ` · ${duplicate.length} of this type` : ""}
                </b>
                <ul>
                  {alreadyOpen.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <Link to={`/work/${item.id}`} onClick={onClose}>
                        {uiShort(item.template_id, item.title)}
                      </Link>
                      <WorkBadge status={item.status} />
                    </li>
                  ))}
                </ul>
                <small>
                  Open the existing item when the follow-up is already assigned.
                  Create another only for a distinct task.
                </small>
              </div>
            )}
            <div>
              <Label htmlFor="work-due">Target date</Label>
              <Input id="work-due" type="date" value={due} onChange={setDue} />
              <p className="hint">
                Internal target, not a calculated regulatory deadline.
              </p>
            </div>
            <div>
              <Label htmlFor="work-priority">Priority</Label>
              <select
                id="work-priority"
                className="sel"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {["NORMAL", "HIGH", "URGENT"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="span2">
              {departments.length > 1 && (
                <div className="evidence-department-field">
                  <Label htmlFor="work-department" required>
                    Responsible team
                  </Label>
                  <select
                    id="work-department"
                    className="sel"
                    value={selectedDepartment}
                    onChange={(event) => {
                      setDepartment(event.target.value);
                      setOwner("");
                    }}
                  >
                    {departments.map((value) => (
                      <option key={value} value={value}>
                        {DEPARTMENT_LABEL[value] || value}
                      </option>
                    ))}
                  </select>
                  <p className="hint">
                    Choose the team that owns this follow-up. The team is fixed
                    when the work is created.
                  </p>
                </div>
              )}
              <Label htmlFor="work-owner">Assigned owner</Label>
              <select
                id="work-owner"
                className="sel"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">
                  Unassigned ·{" "}
                  {DEPARTMENT_LABEL[selectedDepartment] || selectedDepartment} queue
                </option>
                {owners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name.replace("Demo ", "")} · {p.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ops-form-footer">
            <span>Drafts stay in the Hub until your team submits them.</span>
            <button className="btn brand" type="submit">
              {busy ? "Creating…" : "Create work item"}
              <ArrowRight size={16} />
            </button>
          </div>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

export default function Operations() {
  const { db, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const desk = params.get("desk") || "";
  const fixedDepartment =
    DESKS.find((entry) => entry.id === desk && entry.department)?.department || "";
  const selectedLoan = params.get("loan") || "";
  const scope = SCOPES.some(([id]) => id === params.get("scope"))
    ? params.get("scope")
    : desk === "mine"
      ? "mine"
      : "active";
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const sort = SORTS.some(([id]) => id === params.get("sort"))
    ? params.get("sort")
    : "priority";
  const view = ["board", "loans"].includes(params.get("view"))
    ? params.get("view")
    : "list";
  const department = params.get("department") || "";
  const [density, setDensity] = useState(readDensity);
  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // Density is a per-device convenience only.
    }
  }, [density]);
  const setParam = (key, value, replace = true) => {
    const next = new URLSearchParams(params);
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace });
  };
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [items, loans, profiles] = await Promise.all([
      db.listWorkItems(),
      db.listLoans(),
      db.listProfiles(),
    ]);
    return { items, loans, profiles };
  }, [db, profile?.id]);
  const [creating, setCreating] = useState(false),
    [sampleBusy, setSampleBusy] = useState(false),
    [sampleError, setSampleError] = useState(""),
    [claiming, setClaiming] = useState(""),
    [claimError, setClaimError] = useState("");
  const items = bundle?.items || EMPTY,
    loans = bundle?.loans || EMPTY,
    profiles = bundle?.profiles || EMPTY;
  const today = localDate();
  const all = useMemo(
    () =>
      items.filter(
        (item) =>
          (!fixedDepartment || item.department === fixedDepartment) &&
          (!selectedLoan || item.loan_number === selectedLoan),
      ),
    [fixedDepartment, selectedLoan, items],
  );
  const effectiveDepartment = fixedDepartment || department;
  const active = all.filter(isOpen),
    blocked = active.filter((i) => i.status === "BLOCKED"),
    overdue = active.filter((i) => isOverdue(i, today)),
    completed = all.filter((i) => i.status === "COMPLETE");
  const names = Object.fromEntries(
    profiles.map((p) => [p.id, p.full_name.replace("Demo ", "")]),
  );
  const borrowers = useMemo(
    () =>
      Object.fromEntries([
        ...items.map((i) => [i.loan_number, i.borrower_last]),
        ...loans.map((l) => [l.loan_number, l.borrower_last]),
      ]),
    [items, loans],
  );
  const visible = useMemo(() => {
    const text = q.trim().toLowerCase();
    const filtered = all.filter(
      (i) =>
        (scope === "all" ||
          (scope === "active" && isOpen(i)) ||
          (scope === "mine" && i.owner_id === profile.id && isOpen(i)) ||
          (scope === "complete" && i.status === "COMPLETE") ||
          (scope === "blocked" && i.status === "BLOCKED") ||
          (scope === "review" && i.status === "REVIEW") ||
          (scope === "today" && isDueToday(i, today)) ||
          (scope === "unclaimed" && isOpen(i) && !i.owner_id && i.status !== "DRAFT") ||
          (scope === "overdue" && isOverdue(i, today))) &&
        (!effectiveDepartment || i.department === effectiveDepartment) &&
        (!status || i.status === status) &&
        `${i.title} ${uiShort(i.template_id)} ${i.loan_number} ${borrowers[i.loan_number] || ""} ${names[i.owner_id] || ""}`
          .toLowerCase()
          .includes(text),
    );
    return sortWork(filtered, sort);
  }, [all, scope, profile.id, effectiveDepartment, status, borrowers, names, q, sort, today]);
  const loanGroups = useMemo(
    () => groupByLoan(visible, loans, today),
    [visible, loans, today],
  );
  const startSamples = async () => {
    setSampleBusy(true);
    setSampleError("");
    try {
      await db.loadDemoOperations();
      await reload();
    } catch (e) {
      setSampleError(e.message);
    } finally {
      setSampleBusy(false);
    }
  };
  const claim = async (item) => {
    setClaiming(item.id);
    setClaimError("");
    try {
      await db.saveWorkItem(item.id, {
        ownerId: profile.id,
        expectedUpdatedAt: item.updated_at,
      });
      await reload();
    } catch (e) {
      setClaimError(e.message);
    } finally {
      setClaiming("");
    }
  };
  const closeCreate = () => {
    setCreating(false);
    if (params.has("create") || params.has("template")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      next.delete("template");
      setParams(next, { replace: true });
    }
    reload();
  };
  const download = () =>
    downloadCsv(
      "griffin-operations.csv",
      visible.map((i) => ({
        loan_number: i.loan_number,
        client: borrowers[i.loan_number] || "",
        work: i.title,
        phase: phaseTitle(templatePhase(i.template_id)),
        department: DEPARTMENT_LABEL[i.department],
        owner: names[i.owner_id] || "Unassigned",
        status: WORK_STATUS_LABEL[i.status],
        priority: i.priority,
        target_date: i.due_date || "",
        updated_at: i.updated_at,
      })),
    );
  const sortHeader = (key, label) => (
    <button
      type="button"
      className={`ops-sort${sort === key ? " on" : ""}`}
      onClick={() => setParam("sort", key)}
      aria-sort={sort === key ? "ascending" : "none"}
    >
      {label}
      {sort === key ? <ArrowDown size={12} /> : <ArrowUp size={12} className="idle" />}
    </button>
  );
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  const [eyebrow, title] = DESK_COPY[desk] || DESK_COPY[""];
  const Row = ({ i }) => {
    const p = workProgress(i);
    return (
      <tr className={isOverdue(i, today) ? "late" : ""}>
        <td>
          <Link className="ops-work-title" to={`/work/${i.id}`}>
            {uiShort(i.template_id, i.title)}
          </Link>
          <span className="ops-row-meta">
            {view !== "loans" && (
              <>
                <Link to={`/loans/${encodeURIComponent(i.loan_number)}`} className="ops-loan-link">
                  #{i.loan_number}
                </Link>{" "}
                · {borrowers[i.loan_number] || "Client not recorded"} ·{" "}
              </>
            )}
            <span className="ops-phase-chip">
              {phaseTitle(templatePhase(i.template_id), true)}
            </span>
            {i.priority !== "NORMAL" && (
              <b className={`ops-priority ${i.priority.toLowerCase()}`}>
                {i.priority}
              </b>
            )}
          </span>
        </td>
        <td>
          <b>{DEPARTMENT_LABEL[i.department] || i.department}</b>
          <small>
            {names[i.owner_id] ||
              (canClaim(i, profile) ? (
                <button
                  type="button"
                  className="ops-claim"
                  disabled={claiming === i.id}
                  onClick={() => claim(i)}
                >
                  <Hand size={12} />
                  {claiming === i.id ? "Claiming…" : "Claim"}
                </button>
              ) : (
                "Unassigned"
              ))}
          </small>
        </td>
        <td>
          <WorkBadge status={i.status} />
        </td>
        <td className={isOverdue(i, today) ? "ops-late" : ""}>
          {i.due_date ? (
            <>
              <CalendarDays size={13} /> {i.due_date}
              {isDueToday(i, today) && <small className="ops-today">today</small>}
            </>
          ) : (
            "Not set"
          )}
        </td>
        <td>
          <div className="ops-progress">
            <span style={{ width: `${p.percent || 0}%` }} />
          </div>
          <small>
            {p.done}/{p.total} · touched {relativeAge(i.updated_at)}
            {relativeAge(i.updated_at) === "today" ? "" : " ago"}
          </small>
        </td>
        <td>
          <Link
            className="ops-open"
            to={`/work/${i.id}`}
            aria-label={`Open ${i.title} for loan ${i.loan_number}`}
          >
            <ArrowRight size={16} />
          </Link>
        </td>
      </tr>
    );
  };
  const head = (
    <thead>
      <tr>
        <th>{sortHeader("title", "Work / loan")}</th>
        <th>Team & owner</th>
        <th>{sortHeader("status", "Status")}</th>
        <th>{sortHeader("target", "Target")}</th>
        <th>{sortHeader("updated", "Readiness · touched")}</th>
        <th>
          <span className="sr-only">Open</span>
        </th>
      </tr>
    </thead>
  );
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        lede="Desks are filters of the same work object. Completing work does not change LendingPad."
      >
        <Button
          variant="outline"
          to={desk === "mlp" ? "/journey?phase=preparation" : "/journey"}
        >
          <Workflow size={16} /> Flow
        </Button>
        <Button variant="outline" to="/workflows">
          <Layers3 size={16} /> Library
        </Button>
        <Button variant="brand" onClick={() => setCreating(true)}>
          <FilePlus2 size={16} />
          Start work
        </Button>
      </PageHeader>
      {selectedLoan && (
        <div className="journey-loan-scope">
          <span>
            Work for loan{" "}
            <Link to={`/loans/${encodeURIComponent(selectedLoan)}`}>
              <b>#{selectedLoan}</b>
            </Link>
            {borrowers[selectedLoan] ? ` · ${borrowers[selectedLoan]}` : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setParam("loan", "")}>
            Show all accessible loans
          </Button>
        </div>
      )}
      <div className="desk-chips" role="tablist" aria-label="Desks">
        {DESKS.map((entry) => {
          const on = (entry.id === "" && !desk) || desk === entry.id;
          if (entry.id === "dscr") {
            return (
              <Link key={entry.id} to="/submissions" className="desk-chip">
                {entry.label}
              </Link>
            );
          }
          const count = entry.department
            ? items.filter((i) => i.department === entry.department && isOpen(i)).length
            : entry.id === "mine"
              ? items.filter((i) => i.owner_id === profile.id && isOpen(i)).length
              : null;
          return (
            <button
              key={entry.id || "all"}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "desk-chip on" : "desk-chip"}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (!entry.id) next.delete("desk");
                else next.set("desk", entry.id);
                next.delete("department");
                if (entry.id === "mine") next.set("scope", "mine");
                else if (scope === "mine") next.delete("scope");
                setParams(next, { replace: true });
              }}
            >
              {entry.label}
              {count ? <span className="desk-count">{count}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="ops-stat-grid">
        {[
          {
            label: "Open work",
            value: active.length,
            Icon: ClipboardList,
            detail: `Across ${new Set(active.map((i) => i.loan_number)).size} loan records`,
            scope: "active",
          },
          {
            label: "Needs a decision",
            value: blocked.length,
            Icon: CircleAlert,
            detail: "Blocked, with a recorded reason",
            scope: "blocked",
            tone: "amber",
          },
          {
            label: "Past target",
            value: overdue.length,
            Icon: Timer,
            detail: "Internal dates set by the team",
            tone: "red",
            scope: "overdue",
          },
          {
            label: "Completed work",
            value: completed.length,
            Icon: CheckCheck,
            detail: "Workflow completion, not funding",
            tone: "green",
            scope: "complete",
          },
        ].map((s) => (
          <button
            type="button"
            key={s.label}
            className={`ops-stat ${s.tone || ""}${scope === s.scope ? " on" : ""}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("scope", s.scope);
              next.delete("status");
              setParams(next, { replace: true });
            }}
            aria-pressed={scope === s.scope}
          >
            <div>
              <span>{s.label}</span>
              <s.Icon size={18} />
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <small>{s.detail}</small>
          </button>
        ))}
      </div>
      {desk === "mlp" && (
        <section className="mlp-start-panel" aria-label="MLP coordination workflows">
          <div>
            <span className="eyebrow">CLIENT COMMUNICATION & FOLLOW-UP</span>
            <h2>Start with the next action.</h2>
            <p>
              Record each contact or request separately. Use existing work when
              the follow-up is already assigned.
            </p>
          </div>
          <div className="mlp-workflow-grid">
            {[
              ["MLP_WELCOME", "Welcome & contact", "Introductions, contact preferences, needs list"],
              ["MLP_DOCUMENT_CHASE", "Document follow-up", "Borrower, title, insurance, and other sources"],
              ["MLP_APPRAISAL_COORDINATION", "Appraisal coordination", "Order owner, payment, scheduling, and receipt"],
              ["MLP_BORROWER_UPDATE", "Borrower update", "Milestones, Friday check-ins, and next steps"],
              ["MLP_SIGNING_COORDINATION", "Signing coordination", "Availability, final CD review, and follow-up"],
            ].map(([id, label, description]) => (
              <Link
                key={id}
                to={`/operations?desk=mlp&create=1&template=${id}${selectedLoan ? `&loan=${encodeURIComponent(selectedLoan)}` : ""}`}
              >
                <span>
                  {label}
                  <ArrowUpRight size={15} />
                </span>
                <small>{description}</small>
              </Link>
            ))}
          </div>
          <div className="mlp-cadence-note">
            <CalendarDays size={17} />
            <p>
              <b>Training cadence:</b> Friday updates even when there is no
              change; an email recap after a call or text. Schedule targets on
              the work item.
            </p>
            <Link to="/journey?phase=preparation">
              Review the handoffs <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}
      <div className="ops-work-layout">
        <section className={`ops-panel density-${density}`}>
          <div className="ops-panel-heading">
            <div>
              <h2>
                {desk === "mine"
                  ? "Assigned to me"
                  : fixedDepartment
                    ? `${DEPARTMENT_LABEL[fixedDepartment]} queue`
                    : "Team work queue"}
              </h2>
              <p>
                {visible.length} work item{visible.length === 1 ? "" : "s"} ·{" "}
                {view === "loans" ? `${loanGroups.length} loans · ` : ""}this
                view is in the address bar, share it as a link
              </p>
            </div>
            <div className="heading-actions">
              <Button variant="outline" size="sm" onClick={download}>
                <Download size={14} />
                Export
              </Button>
              <div className="ops-view-switch">
                <button
                  aria-label="List view"
                  title="List"
                  aria-pressed={view === "list"}
                  onClick={() => setParam("view", "")}
                >
                  <List size={16} />
                </button>
                <button
                  aria-label="Group by loan"
                  title="Group by loan"
                  aria-pressed={view === "loans"}
                  onClick={() => setParam("view", "loans")}
                >
                  <Folders size={16} />
                </button>
                <button
                  aria-label="Board view"
                  title="Board"
                  aria-pressed={view === "board"}
                  onClick={() => setParam("view", "board")}
                >
                  <Layers3 size={16} />
                </button>
                <button
                  aria-label="Toggle compact rows"
                  title={density === "compact" ? "Comfortable rows" : "Compact rows"}
                  aria-pressed={density === "compact"}
                  onClick={() =>
                    setDensity(density === "compact" ? "comfortable" : "compact")
                  }
                >
                  <Rows3 size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="ops-tabs" role="group" aria-label="Work scope">
            {SCOPES.map(([v, l]) => (
              <button
                key={v}
                className={scope === v ? "selected" : ""}
                onClick={() => setParam("scope", v === "active" ? "" : v)}
                aria-pressed={scope === v}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="ops-filters">
            <div className="ops-search">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => setParam("q", e.target.value)}
                aria-label="Search work items"
                placeholder="Search loan, client, owner, or task"
              />
            </div>
            {!fixedDepartment && (
              <select
                value={effectiveDepartment}
                onChange={(e) => setParam("department", e.target.value)}
                aria-label="Filter department"
              >
                <option value="">All teams</option>
                {Object.entries(DEPARTMENT_LABEL)
                  .filter(([v]) => v !== "LOA")
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            )}
            <select
              aria-label="Filter work status"
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(WORK_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort work"
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>
                  Sort: {l}
                </option>
              ))}
            </select>
          </div>
          {claimError && (
            <p role="alert" className="error">
              {claimError}
            </p>
          )}
          {!visible.length ? (
            <div className="ops-empty">
              <ClipboardList size={34} />
              <h3>
                {all.length
                  ? "No work matches these filters."
                  : "Give every task a place to live."}
              </h3>
              <p>
                {all.length
                  ? "Choose another scope, team, status, or search."
                  : "Start a loan-linked workflow or explore the fictional portfolio."}
              </p>
              <div className="heading-actions">
                {all.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = new URLSearchParams();
                      if (desk) next.set("desk", desk);
                      setParams(next, { replace: true });
                    }}
                  >
                    Clear filters
                  </Button>
                )}
                <Button variant="brand" onClick={() => setCreating(true)}>
                  Create work item
                </Button>
                {db.mode === "local" && !items.length && (
                  <Button variant="outline" onClick={startSamples} disabled={sampleBusy}>
                    {sampleBusy ? "Loading…" : "Load sample operations"}
                  </Button>
                )}
              </div>
              {sampleError && <p role="alert">{sampleError}</p>}
            </div>
          ) : view === "board" ? (
            <div className="ops-board">
              {Object.keys(WORK_STATUS_LABEL).map((s) => (
                <section key={s}>
                  <h3>
                    {WORK_STATUS_LABEL[s]}{" "}
                    <span>{visible.filter((i) => i.status === s).length}</span>
                  </h3>
                  {visible
                    .filter((i) => i.status === s)
                    .map((i) => (
                      <Link className="ops-board-card" key={i.id} to={`/work/${i.id}`}>
                        <small>
                          #{i.loan_number} · {borrowers[i.loan_number]}
                        </small>
                        <strong>{uiShort(i.template_id, i.title)}</strong>
                        <span>{names[i.owner_id] || "Unassigned"}</span>
                        <div>
                          <WorkBadge status={i.status} />
                          <small className={isOverdue(i, today) ? "ops-late" : ""}>
                            {i.due_date || "No target"}
                          </small>
                        </div>
                      </Link>
                    ))}
                </section>
              ))}
            </div>
          ) : view === "loans" ? (
            <div className="ops-loan-groups">
              {loanGroups.map((group) => (
                <section key={group.loan_number} className="ops-loan-group">
                  <header>
                    <Link to={`/loans/${encodeURIComponent(group.loan_number)}`}>
                      <Folders size={16} />
                      <b>{group.borrower_last || "Unnamed"}</b>
                      <span className="mono">#{group.loan_number}</span>
                      <ArrowUpRight size={14} />
                    </Link>
                    <span className="ops-loan-group-meta">
                      {group.open} open
                      {group.blocked ? <b className="amber"> · {group.blocked} blocked</b> : null}
                      {group.overdue ? <b className="red"> · {group.overdue} past target</b> : null}
                      {group.nextTarget ? ` · next target ${group.nextTarget}` : ""}
                    </span>
                  </header>
                  <div className="ops-table-wrap" tabIndex={0} role="region" aria-label={`Work on loan ${group.loan_number}`}>
                    <table className="ops-table">
                      {head}
                      <tbody>
                        {group.items.map((i) => (
                          <Row key={i.id} i={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="ops-table-wrap" tabIndex={0} role="region" aria-label="Loan work queue">
              <table className="ops-table">
                {head}
                <tbody>
                  {visible.map((i) => (
                    <Row key={i.id} i={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="ops-panel-footer">
            <span>Saved records · named owners · recorded handoffs</span>
            <Link to="/loans">
              Loan records <ArrowRight size={13} />
            </Link>
          </div>
        </section>
        <aside className="ops-side">
          <section className="ops-panel ops-side-panel">
            <span className="eyebrow">Attention required</span>
            <h2>Keep the next step clear.</h2>
            {[...blocked, ...overdue.filter((i) => i.status !== "BLOCKED")]
              .slice(0, 5)
              .map((i) => (
                <Link className="ops-attention" key={i.id} to={`/work/${i.id}`}>
                  <CircleAlert size={17} />
                  <div>
                    <strong>{uiShort(i.template_id, i.title)}</strong>
                    <span>
                      #{i.loan_number} · {borrowers[i.loan_number] || ""} ·{" "}
                      {i.status === "BLOCKED" ? "Blocked" : "Past target"}
                    </span>
                  </div>
                  <ArrowRight size={14} />
                </Link>
              ))}
            {!blocked.length && !overdue.length && (
              <p className="ops-muted">
                No blocked or past-target work in your current view.
              </p>
            )}
            <Button variant="outline" full to="/operations?scope=unclaimed">
              Unclaimed work <ArrowRight size={14} />
            </Button>
          </section>
          <section className="ops-connector-card">
            <span className="ops-connection-dot" />
            <small>SYSTEM CONNECTIONS</small>
            <h3>
              The Hub coordinates.
              <br />
              Your LOS records.
            </h3>
            <p>
              Cadre, LendingPad, and HubSpot are not connected. External actions
              require an implemented, verified connector.
            </p>
            <Link to="/integrations">
              Review connection plan <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
      {(creating || params.get("create") === "1") && (
        <NewWorkDialog
          initialTemplate={
            params.get("template") ||
            (desk === "closing" ? "CD_REQUEST" : desk === "mlp" ? "MLP_WELCOME" : undefined)
          }
          initialLoan={params.get("loan")}
          onClose={closeCreate}
          profiles={profiles}
          loans={loans}
          openWork={items}
        />
      )}
    </>
  );
}

