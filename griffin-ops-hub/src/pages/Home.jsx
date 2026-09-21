import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  Hand,
  History,
  ShieldCheck,
  Timer,
  Workflow,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import { Button, LoadState, PageHeader } from "../components/ui.jsx";
import {
  ROLE_QUESTION,
  ROLE_STARTERS,
  ROLE_DESK,
  departmentLabel,
  phaseTitle,
  templatePhase,
  uiShort,
  whenToUse,
} from "../lib/catalog.js";
import {
  bucketWork,
  canClaim,
  deskSummary,
  laneWork,
  localDate,
  relativeAge,
} from "../lib/workView.js";
import { workProgress } from "../lib/operations.js";
import { listRecent } from "../lib/recent.js";
import { WorkBadge, NewWorkDialog } from "./Operations.jsx";

const EMPTY = [];
const MANAGER_ROLES = ["MANAGER", "ADMIN"];

function Tile({ label, value, detail, Icon, to, tone }) {
  return (
    <Link to={to} className={`ops-stat ${tone || ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{detail}</small>
    </Link>
  );
}

export default function Home() {
  const { db, profile } = useAuth();
  const [creating, setCreating] = useState(false);
  const [starter, setStarter] = useState("");
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState("");
  const [claiming, setClaiming] = useState("");
  const [claimError, setClaimError] = useState("");
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [items, loans, profiles] = await Promise.all([
      db.listWorkItems(),
      db.listLoans(),
      db.listProfiles(),
    ]);
    return { items, loans, profiles };
  }, [db, profile?.id]);

  const items = bundle?.items || EMPTY;
  const loans = bundle?.loans || EMPTY;
  const profiles = bundle?.profiles || EMPTY;
  const today = localDate();
  const buckets = useMemo(
    () => bucketWork(items, profile, today),
    [items, profile, today],
  );
  const manager = MANAGER_ROLES.includes(profile.role);
  // Managers read the whole desk board; everyone else reads their own list.
  const personal = manager ? buckets.desk : buckets.mine;
  const lanes = useMemo(() => laneWork(personal, today), [personal, today]);
  const desks = useMemo(() => deskSummary(items, today), [items, today]);
  const recents = useMemo(
    () => listRecent(profile.id).filter((entry) => entry.kind === "loan"),
    [profile.id],
  );
  const starters = ROLE_STARTERS[profile.role] || ROLE_STARTERS.MLP;
  const desk = ROLE_DESK[profile.role] ?? "";
  const deskQuery = desk ? `desk=${desk}` : "";
  const names = Object.fromEntries(
    profiles.map((p) => [p.id, p.full_name.replace("Demo ", "")]),
  );
  const borrowers = Object.fromEntries([
    ...items.map((i) => [i.loan_number, i.borrower_last]),
    ...loans.map((l) => [l.loan_number, l.borrower_last]),
  ]);

  const loadSamples = async () => {
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

  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;

  const tiles = [
    {
      label: manager ? "Open across desks" : "Assigned to me",
      value: manager ? buckets.open.length : buckets.mine.length,
      Icon: ClipboardList,
      detail: manager ? "Every open work item you can see" : "Open work with your name on it",
      to: manager ? "/operations" : "/operations?desk=mine",
    },
    {
      label: "Due today",
      value: buckets.dueToday.length,
      Icon: CalendarCheck2,
      detail: "Internal targets set for today",
      to: "/operations?scope=today",
      tone: "brand",
    },
    {
      label: "Past target",
      value: buckets.overdue.length,
      Icon: Timer,
      detail: "Internal dates the team set",
      to: "/operations?scope=overdue",
      tone: "red",
    },
    {
      label: "Blocked",
      value: buckets.blocked.length,
      Icon: CircleAlert,
      detail: "Needs a named missing artifact",
      to: "/operations?scope=blocked",
      tone: "amber",
    },
    {
      label: "Ready for review",
      value: buckets.review.length,
      Icon: ShieldCheck,
      detail: manager ? "Waiting on a desk to complete" : "Waiting on your desk to complete",
      to: `/operations?scope=review${deskQuery ? `&${deskQuery}` : ""}`,
      tone: "green",
    },
    {
      label: "Unclaimed in your desk",
      value: buckets.unclaimed.length,
      Icon: Hand,
      detail: "Queued work nobody owns yet",
      to: `/operations?scope=unclaimed${deskQuery ? `&${deskQuery}` : ""}`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Home · ${new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`}
        title={ROLE_QUESTION[profile.role] || "What needs you today?"}
        lede="Open the loan. See the phase. Do the next form. Leave evidence. Name the next owner."
      >
        <Button variant="outline" to="/journey">
          <Workflow size={16} /> Flow
        </Button>
        <Button variant="brand" onClick={() => setCreating(true)}>
          <FilePlus2 size={16} /> Start work
        </Button>
      </PageHeader>
      <div className="ops-stat-grid home-tiles">
        {tiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </div>
      <div className="home-layout">
        <section className="home-now" aria-label="Your work today">
          <div className="ops-panel-heading">
            <div>
              <span className="eyebrow">TODAY</span>
              <h2>{manager ? "The desk board" : "Your files, in order"}</h2>
              <p>
                Past target first, then blocked, then due today. Internal
                targets, not LendingPad milestones.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              to={manager ? "/operations" : "/operations?desk=mine"}
            >
              Open the queue <ArrowRight size={14} />
            </Button>
          </div>
          {!items.length && db.mode === "local" ? (
            <div className="ops-empty">
              <ClipboardList size={34} />
              <h3>This workspace is empty.</h3>
              <p>Load the fictional sample portfolio to walk the loan spine.</p>
              <Button variant="brand" onClick={loadSamples} disabled={sampleBusy}>
                {sampleBusy ? "Loading…" : "Load sample operations"}
              </Button>
              {sampleError && <p role="alert">{sampleError}</p>}
            </div>
          ) : !lanes.length ? (
            <div className="ops-empty">
              <h3>
                {manager
                  ? "No open work on any desk."
                  : "Nothing is assigned to you."}
              </h3>
              <p>
                {buckets.unclaimed.length
                  ? `${buckets.unclaimed.length} unclaimed item${buckets.unclaimed.length === 1 ? "" : "s"} sit in your desk queue below.`
                  : "Start work on a loan, or open the team queue."}
              </p>
              <div className="heading-actions">
                <Button variant="brand" onClick={() => setCreating(true)}>
                  Start work
                </Button>
                <Button variant="outline" to="/operations">
                  Open the queue
                </Button>
              </div>
            </div>
          ) : (
            lanes.map((lane) => (
              <div key={lane.id} className={`home-lane ${lane.tone}`}>
                <h3>
                  <span />
                  {lane.label}
                  <b>{lane.items.length}</b>
                </h3>
                <ul className="home-now-list">
                  {lane.items.slice(0, lane.id === "upcoming" ? 6 : 12).map((item) => {
                    const progress = workProgress(item);
                    return (
                      <li key={item.id}>
                        <Link to={`/work/${item.id}`}>
                          <span>
                            <b>{uiShort(item.template_id, item.title)}</b>
                            <small>
                              #{item.loan_number}
                              {borrowers[item.loan_number]
                                ? ` · ${borrowers[item.loan_number]}`
                                : ""}
                              {" · "}
                              {phaseTitle(templatePhase(item.template_id), true)}
                              {manager
                                ? ` · ${names[item.owner_id] || `${departmentLabel(item.department)} queue`}`
                                : ""}
                            </small>
                          </span>
                          <span className="home-now-meta">
                            <span
                              className="ops-progress mini"
                              title={`${progress.done}/${progress.total} requirements`}
                            >
                              <span style={{ width: `${progress.percent || 0}%` }} />
                            </span>
                            <WorkBadge status={item.status} />
                            <small>{item.due_date || "No target"}</small>
                            <ArrowRight size={16} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {lane.items.length > (lane.id === "upcoming" ? 6 : 12) && (
                  <Link
                    className="home-lane-more"
                    to={`/operations?scope=${lane.id === "upcoming" ? "active" : lane.id === "today" ? "today" : lane.id}${manager ? "" : "&desk=mine"}`}
                  >
                    See all {lane.items.length} <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))
          )}
        </section>
        <aside className="home-side">
          {!manager && (
            <section className="ops-panel ops-side-panel" aria-label="Unclaimed desk work">
              <span className="eyebrow">YOUR DESK QUEUE</span>
              <h2>Unclaimed work.</h2>
              {!buckets.unclaimed.length ? (
                <p className="ops-muted">
                  Nothing is waiting unowned in {departmentLabel(profile.role === "LOA" ? "LO" : profile.role)}.
                </p>
              ) : (
                <ul className="home-claim-list">
                  {buckets.unclaimed.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link to={`/work/${item.id}`}>
                        <b>{uiShort(item.template_id, item.title)}</b>
                        <small>
                          #{item.loan_number}
                          {borrowers[item.loan_number]
                            ? ` · ${borrowers[item.loan_number]}`
                            : ""}
                          {item.due_date ? ` · target ${item.due_date}` : ""}
                        </small>
                      </Link>
                      {canClaim(item, profile) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={claiming === item.id}
                          onClick={() => claim(item)}
                        >
                          {claiming === item.id ? "Claiming…" : "Claim"}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {claimError && (
                <p role="alert" className="error">
                  {claimError}
                </p>
              )}
              {buckets.unclaimed.length > 5 && (
                <Button
                  variant="outline"
                  full
                  to={`/operations?scope=unclaimed${deskQuery ? `&${deskQuery}` : ""}`}
                >
                  All {buckets.unclaimed.length} unclaimed <ArrowRight size={14} />
                </Button>
              )}
            </section>
          )}
          {manager && (
            <section className="ops-panel ops-side-panel" aria-label="Desk pulse">
              <span className="eyebrow">DESK PULSE</span>
              <h2>Where the queue is stuck.</h2>
              <table className="desk-pulse">
                <thead>
                  <tr>
                    <th>Desk</th>
                    <th>Open</th>
                    <th>Blocked</th>
                    <th>Late</th>
                    <th>Unowned</th>
                  </tr>
                </thead>
                <tbody>
                  {desks.map((row) => (
                    <tr key={row.department}>
                      <td>
                        <Link to={`/operations?desk=${row.desk}`}>{row.label}</Link>
                      </td>
                      <td>{row.open}</td>
                      <td className={row.blocked ? "amber" : ""}>{row.blocked}</td>
                      <td className={row.overdue ? "red" : ""}>{row.overdue}</td>
                      <td>{row.unclaimed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button variant="outline" full to="/insights">
                Insights <ArrowRight size={14} />
              </Button>
            </section>
          )}
          <section className="ops-panel ops-side-panel" aria-label="Recent loans">
            <span className="eyebrow">RECENT LOANS</span>
            <h2>Pick up where you left off.</h2>
            {!recents.length ? (
              <p className="ops-muted">
                Loans you open appear here on this device.
              </p>
            ) : (
              <ul className="home-recent-list">
                {recents.slice(0, 6).map((entry) => (
                  <li key={entry.to}>
                    <Link to={entry.to}>
                      <History size={14} />
                      <span>
                        <b>{entry.label}</b>
                        <small>{entry.fig}</small>
                      </span>
                      <small>{relativeAge(entry.at)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" full to="/loans">
              All loans <ArrowRight size={14} />
            </Button>
          </section>
        </aside>
      </div>
      <section className="mlp-start-panel home-starters" aria-label="Start the right form">
        <div>
          <span className="eyebrow">START HERE</span>
          <h2>The next form for your desk.</h2>
          <p>Chooser labels only. Source fields inside each form are unchanged.</p>
        </div>
        <div className="mlp-workflow-grid">
          {starters.map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => {
                setStarter(id);
                setCreating(true);
              }}
            >
              <span>
                {uiShort(id)}
                <ArrowRight size={15} />
              </span>
              <small>{whenToUse({ id })}</small>
            </button>
          ))}
          <Link to="/workflows">
            <span>
              Browse the library
              <ArrowRight size={15} />
            </span>
            <small>Grouped by loan phase</small>
          </Link>
        </div>
      </section>
      {creating && (
        <NewWorkDialog
          onClose={() => {
            setCreating(false);
            setStarter("");
            reload();
          }}
          initialTemplate={starter}
          profiles={profiles}
          loans={loans}
          openWork={items}
        />
      )}
    </>
  );
}
