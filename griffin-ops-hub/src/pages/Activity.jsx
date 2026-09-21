import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity as ActivityIcon, Download, Search } from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import { STAGE_LABEL } from "../lib/stages.js";
import { loadWorkspace } from "../lib/workspace.js";
import { downloadCsv } from "../lib/reports.js";
import { Button, LoadState, fmtDate } from "../components/ui.jsx";
export default function Activity() {
  const { db, profile } = useAuth(),
    [b, reload, loading, error] = useAsync(async () => {
      const [workspace, items] = await Promise.all([
        loadWorkspace(db),
        db.listWorkItems(),
      ]);
      const activities = await Promise.all(
        items.map((i) => db.getWorkActivity(i.id)),
      );
      return {
        ...workspace,
        workEvents: items.flatMap((item, index) =>
          activities[index].events.map((e) => ({
            ...e,
            kind: "operations",
            title: `${e.action.replaceAll("_", " ").toLowerCase()} · ${item.title}`,
            loan: item.loan_number,
            borrower: item.borrower_last || "Client not recorded",
            actor: workspace.names[e.actor_id] || e.actor_role,
            workItem: item.id,
          })),
        ),
      };
    }, [db, profile?.id]),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all");
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  const worksheetEvents = b.rows
    .flatMap((w) =>
      [
        ...w.activity.transitions.map((t) => ({
          ...t,
          kind: "handoff",
          title: STAGE_LABEL[t.to_stage] || t.to_stage,
        })),
        ...w.activity.events.map((e) => ({
          ...e,
          kind: "field",
          title: `${e.action.toLowerCase()} · ${e.field_key}`,
        })),
      ].map((e) => ({
        ...e,
        loan: w.loan_number,
        borrower: w.data?.cln || "Unnamed",
        actor: b.names[e.actor_id] || e.actor_role,
        worksheet: w.id,
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const events = [...worksheetEvents, ...b.workEvents].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
  const visible = events.filter(
    (e) =>
      (filter === "all" || e.kind === filter) &&
      `${e.loan} ${e.borrower} ${e.actor} ${e.title}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">WORKSPACE / AUDIT TRAIL</div>
          <h1>Every handoff has a history.</h1>
          <p className="lede">
            Recorded actions, named owners, and the context behind each change.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!visible.length}
          onClick={() =>
            downloadCsv(
              "griffin-activity.csv",
              visible.map((e) => ({
                at: e.at,
                loan: e.loan,
                actor: e.actor,
                action: e.title,
                note: e.note || "",
              })),
            )
          }
        >
          <Download />
          Export activity
        </Button>
      </div>
      <section className="queue-panel">
        <div className="queue-toolbar">
          <div className="input-search">
            <Search size={16} />
            <input
              aria-label="Search activity"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search loan, person, or event…"
            />
          </div>
          <select
            aria-label="Filter activity"
            className="sort-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All events</option>
            <option value="handoff">Stage handoffs</option>
            <option value="field">Field changes</option>
            <option value="operations">Operations work</option>
          </select>
          <span className="small muted">{visible.length} events</span>
        </div>
        {!visible.length ? (
          <div className="workspace-empty">
            <ActivityIcon />
            <h2>No activity to show</h2>
            <p>Worksheet and operations changes will appear here.</p>
          </div>
        ) : (
          <div className="workspace-audit">
            {visible.slice(0, 150).map((e) => (
              <div className="workspace-audit-row" key={e.id}>
                <span className={"event-dot " + e.kind} />
                <div>
                  <strong>{e.title}</strong>
                  <p>
                    {e.actor} ·{" "}
                    <Link to={`/loans/${e.loan}`}>
                      {e.borrower} / #{e.loan}
                    </Link>
                  </p>
                  {e.note && <blockquote>{e.note}</blockquote>}
                </div>
                <time dateTime={e.at}>{fmtDate(e.at)}</time>
                <Link
                  className="audit-open"
                  to={
                    e.workItem
                      ? `/work/${e.workItem}`
                      : `/worksheets/${e.worksheet}`
                  }
                >
                  View work
                </Link>
              </div>
            ))}
          </div>
        )}
        <div className="table-footer">
          <span>
            Showing {Math.min(150, visible.length)} of {visible.length} events
          </span>
          <span>Export includes all filtered events</span>
        </div>
      </section>
    </>
  );
}
