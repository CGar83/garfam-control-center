import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleAlert,
  FileSearch,
  FolderInput,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAsync, useAuth } from "../lib/auth.jsx";
import {
  coordinationCounts,
  evidenceSummary,
  isCoordinationWork,
} from "../lib/coordination.js";
import references from "../data/evidenceReference.json";
import { Badge, Button, LoadState, PageHeader } from "../components/ui.jsx";
import { WorkBadge } from "./Operations.jsx";

const EMPTY = [];
const closed = (item) => ["COMPLETE", "CANCELLED"].includes(item.status);
export default function EvidenceDesk() {
  const { db, profile } = useAuth();
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [items, profiles] = await Promise.all([
      db.listWorkItems(),
      db.listProfiles(),
    ]);
    return { items: items.filter(isCoordinationWork), profiles };
  }, [db, profile?.id]);
  const [tab, setTab] = useState("work"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [includeClosed, setIncludeClosed] = useState(false);
  const items = bundle?.items || EMPTY;
  const counts = useMemo(() => coordinationCounts(items), [items]);
  const names = Object.fromEntries(
    (bundle?.profiles || EMPTY).map((person) => [
      person.id,
      person.full_name.replace(/^Demo /, ""),
    ]),
  );
  const visible = useMemo(
    () =>
      items
        .filter((item) => {
          const state = evidenceSummary(item).state,
            cadre = item.template_id === "CADRE_HANDOFF";
          return (
            (includeClosed || !closed(item)) &&
            (filter === "all" ||
              (filter === "unresolved" &&
                !cadre &&
                ["Unknown", "Missing", "Received, not reviewed"].includes(
                  state,
                )) ||
              (filter === "conflict" && state === "Conflicting") ||
              (filter === "cadre" &&
                (cadre || item.data?.disposition === "Escalated to Cadre"))) &&
            [
              item.loan_number,
              item.title,
              item.data?.condition_text,
              item.data?.issue_summary,
              item.data?.requested_resolution,
              item.data?.reason_code,
              item.data?.next_action,
              item.data?.cadre_case_reference,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase())
          );
        })
        .sort((a, b) =>
          String(b.updated_at).localeCompare(String(a.updated_at)),
        ),
    [items, includeClosed, filter, query],
  );
  const docs = references.conditions.filter((record) =>
    [record.id, record.label, record.category, record.description]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selectFilter = (value) => {
    setTab("work");
    setFilter(value);
    setQuery("");
    setIncludeClosed(false);
  };
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="Evidence & handoffs"
        title="Resolve the question. Preserve the evidence."
        lede="One place for missing information, conflicting sources, and Cadre handoffs. The responsible team owns the next action."
      >
        <Button
          variant="outline"
          to="/operations?create=1&template=CADRE_HANDOFF"
        >
          <FolderInput size={16} />
          Cadre handoff
        </Button>
        <Button
          variant="brand"
          to="/operations?create=1&template=CONDITION_FOLLOWUP"
        >
          <FileSearch size={16} />
          Record follow-up
        </Button>
      </PageHeader>
      <div className="ops-stat-grid">
        {[
          [
            "Active coordination",
            counts.active,
            "Loan-linked work in your access scope",
            "all",
            FileSearch,
          ],
          [
            "Needs evidence review",
            counts.unresolved,
            "Missing, unknown, or not reviewed",
            "unresolved",
            CircleAlert,
          ],
          [
            "Conflicting sources",
            counts.conflicting,
            "Keep both citations for a human review",
            "conflict",
            ShieldCheck,
          ],
          [
            "Cadre coordination",
            counts.cadre,
            "Recorded work, not a live Cadre queue",
            "cadre",
            FolderInput,
          ],
        ].map(([label, value, detail, scope, Icon]) => (
          <button
            className="ops-stat"
            type="button"
            key={scope}
            onClick={() => selectFilter(scope)}
          >
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="evidence-authority">
        <ShieldCheck size={19} />
        <p>
          <strong>
            Cadre runs processing. The Hub coordinates the work around it.
          </strong>
          <span>
            Missing is not failed. Unknown is not “no.” A reference or a
            completed Hub task does not clear a loan condition.
          </span>
        </p>
        <Link to="/integrations">
          System ownership <ArrowUpRight size={14} />
        </Link>
      </div>
      <section className="ops-panel evidence-desk-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>
              {tab === "work"
                ? "Follow-up register"
                : "Document reference library"}
            </h2>
            <p>
              {tab === "work"
                ? "Source, owner, and next action stay with the work record."
                : "28 document-type labels from the supplied rubric. Select applicability against current approved policy, separately for each loan."}
            </p>
          </div>
          <BookOpen size={22} />
        </div>
        <div className="ops-tabs" role="group" aria-label="Evidence desk view">
          <button
            className={tab === "work" ? "selected" : ""}
            aria-pressed={tab === "work"}
            onClick={() => {
              setTab("work");
              setQuery("");
            }}
          >
            Work records <span>{counts.total}</span>
          </button>
          <button
            className={tab === "references" ? "selected" : ""}
            aria-pressed={tab === "references"}
            onClick={() => {
              setTab("references");
              setQuery("");
            }}
          >
            Document references <span>{references.conditions.length}</span>
          </button>
        </div>
        <div className="ops-filters">
          <div className="ops-search">
            <Search size={16} />
            <input
              aria-label={
                tab === "work"
                  ? "Search evidence work"
                  : "Search document references"
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === "work"
                  ? "Search loan, question, or next action"
                  : "Search document type, group, or reference ID"
              }
            />
          </div>
          {tab === "work" && (
            <>
              <select
                aria-label="Filter evidence work"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All coordination</option>
                <option value="unresolved">Needs evidence review</option>
                <option value="conflict">Conflicting sources</option>
                <option value="cadre">Cadre coordination</option>
              </select>
              <label className="evidence-closed-toggle">
                <input
                  type="checkbox"
                  checked={includeClosed}
                  onChange={(event) => setIncludeClosed(event.target.checked)}
                />
                Include closed
              </label>
            </>
          )}
        </div>
        {tab === "work" ? (
          visible.length ? (
            <div
              className="ops-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Evidence follow-up records"
            >
              <table className="ops-table evidence-table">
                <thead>
                  <tr>
                    <th>Question / loan</th>
                    <th>Recorded evidence</th>
                    <th>Owner / next action</th>
                    <th>Work state</th>
                    <th>
                      <span className="sr-only">Open work</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => {
                    const summary = evidenceSummary(item),
                      cadre = item.template_id === "CADRE_HANDOFF";
                    return (
                      <tr key={item.id}>
                        <td>
                          <Link
                            className="ops-work-title"
                            to={`/work/${item.id}`}
                          >
                            {item.title}
                          </Link>
                          <span className="ops-row-meta">
                            #{item.loan_number} ·{" "}
                            {cadre
                              ? "Cadre handoff"
                              : item.data?.reason_code || "Reason not recorded"}
                          </span>
                          <small>
                            {item.data?.condition_phase || "Phase not recorded"}
                          </small>
                        </td>
                        <td>
                          <Badge
                            variant={
                              summary.state === "Conflicting" ||
                              summary.state === "Missing"
                                ? "warn"
                                : "muted"
                            }
                          >
                            {cadre
                              ? item.data?.report_status ||
                                "Unknown report status"
                              : summary.state}
                          </Badge>
                          {cadre && (
                            <small>
                              Handoff: {item.data?.handoff_status || "Unknown"}
                            </small>
                          )}
                          <small>
                            {cadre
                              ? "Manually recorded · not live"
                              : summary.legacy
                                ? "Original template retained"
                                : summary.citation.reference_complete
                                  ? "Source reference recorded"
                                  : "Source reference incomplete"}
                          </small>
                        </td>
                        <td>
                          <b>
                            {names[item.owner_id] || "Unassigned"} ·{" "}
                            {item.department}
                          </b>
                          <span className="evidence-next-action">
                            {item.data?.next_action ||
                              item.data?.requested_evidence ||
                              "Next action not recorded"}
                          </span>
                        </td>
                        <td>
                          <WorkBadge status={item.status} />
                        </td>
                        <td>
                          <Link
                            className="ops-open"
                            to={`/work/${item.id}`}
                            aria-label={`Open ${item.title} for loan ${item.loan_number}`}
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ops-empty">
              <FileSearch size={32} />
              <h3>
                {items.length
                  ? "No records match this view."
                  : "Give the open question an owner."}
              </h3>
              <p>
                {items.length
                  ? "Adjust your search or include closed records."
                  : "Record one finding or handoff per work item. Preserve the source and route it to the responsible team."}
              </p>
              <Button
                variant="outline"
                to="/operations?create=1&template=CONDITION_FOLLOWUP"
              >
                Create a follow-up <ArrowRight size={14} />
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="evidence-reference-note">
              <Badge variant="warn">Unverified reference</Badge>
              <p>
                These are document names, not active rules. No product
                requirements, trigger expressions, gate overrides, or real-loan
                examples were imported into this library.
              </p>
            </div>
            <div className="evidence-reference-grid">
              {docs.map((record) => (
                <article key={record.id}>
                  <span className="evidence-reference-id">{record.id}</span>
                  <div>
                    <h3>{record.label}</h3>
                    <p>{record.category}</p>
                    {record.description && <small>{record.description}</small>}
                  </div>
                </article>
              ))}
            </div>
            {!docs.length && (
              <div className="ops-empty">
                <h3>No document names match.</h3>
                <p>Try a broader term such as title, income, or insurance.</p>
              </div>
            )}
            <div className="ops-panel-footer">
              <span>
                Source: {references.source.title} · source labels retained
              </span>
              <span>Applicability requires human review</span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
