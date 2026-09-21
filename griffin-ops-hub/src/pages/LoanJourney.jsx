import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  FileText,
  GitBranch,
  Search,
  Users,
} from "lucide-react";
import { useAsync, useAuth } from "../lib/auth.jsx";
import journey from "../data/loanJourney.json";
import {
  filterJourneySteps,
  journeyLoans,
  journeyStartLink,
  relatedJourneyWork,
} from "../lib/journey.js";
import { Badge, Button, LoadState, PageHeader } from "../components/ui.jsx";
import { WorkBadge } from "./Operations.jsx";
import { suggestedPhase } from "../lib/workView.js";
import { isOpen } from "../lib/workView.js";

const EMPTY = [];
export default function LoanJourney() {
  const { db, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [view, setView] = useState("flow");
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [loans, items] = await Promise.all([
      db.listLoans(),
      db.listWorkItems(),
    ]);
    return { loans, items };
  }, [db, profile?.id]);
  const loans = useMemo(
    () => journeyLoans(bundle?.loans || EMPTY, bundle?.items || EMPTY),
    [bundle],
  );
  const requestedLoan = params.get("loan") || "";
  const loanNumber = loans.some((loan) => loan.loan_number === requestedLoan)
    ? requestedLoan
    : "";
  const related = bundle?.items || EMPTY;
  const loanItems = loanNumber
    ? related.filter((item) => item.loan_number === loanNumber)
    : EMPTY;
  // With a loan selected and no explicit phase, open on the phase with open work.
  const defaultPhaseId = loanNumber ? suggestedPhase(loanItems) : journey.phases[0].id;
  const phase =
    journey.phases.find((entry) => entry.id === params.get("phase")) ||
    journey.phases.find((entry) => entry.id === defaultPhaseId) ||
    journey.phases[0];
  const openByPhase = Object.fromEntries(
    journey.phases.map((entry) => [
      entry.id,
      loanItems.filter(
        (item) =>
          isOpen(item) &&
          entry.steps.some((step) => step.templateId === item.template_id),
      ).length,
    ]),
  );
  const sourceById = Object.fromEntries(
    journey.sources.map((source) => [source.id, source]),
  );
  const roles = [
    ...new Set(
      journey.phases.flatMap((entry) => entry.steps.map((step) => step.owner)),
    ),
  ].sort();
  const visible = filterJourneySteps(phase.steps, role, query);
  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const sourceRefs = (refs) =>
    (refs || []).map((ref) => (
      <span key={`${ref.id}-${ref.locator}`}>
        {sourceById[ref.id]?.label || ref.id} · {ref.locator}
      </span>
    ));
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="Loan flow · source playbook"
        title="Know the next handoff."
        lede="From application to funding follow-up. Steps with a form open Hub work. Steps without one stay in LendingPad."
      >
        {loanNumber ? (
          <Button
            variant="outline"
            to={`/loans/${encodeURIComponent(loanNumber)}`}
          >
            <Users size={16} /> Loan record
          </Button>
        ) : (
          <Button variant="outline" to="/workflows">
            <BookOpen size={16} /> Library
          </Button>
        )}
        <Button
          variant="brand"
          to={loanNumber ? `/operations?loan=${encodeURIComponent(loanNumber)}` : "/operations"}
        >
          <ClipboardList size={16} /> Work
        </Button>
      </PageHeader>
      <section className="journey-context" aria-label="Playbook context">
        <div>
          <GitBranch size={22} />
          <p>
            <strong>A workflow map, with work you can act on.</strong>
            <span>
              Phase selection is a reference view. It does not set a loan’s
              status or confirm a milestone.
            </span>
          </p>
        </div>
        <label htmlFor="journey-loan">
          Related loan work
          <select
            id="journey-loan"
            value={loanNumber}
            onChange={(event) => updateParam("loan", event.target.value)}
          >
            <option value="">Browse the playbook</option>
            {loans.map((loan) => (
              <option key={loan.loan_number} value={loan.loan_number}>
                #{loan.loan_number}
                {loan.borrower_last ? ` · ${loan.borrower_last}` : ""}
              </option>
            ))}
          </select>
        </label>
      </section>
      {requestedLoan && !loanNumber && (
        <p className="hint" role="status">
          This loan is not available in your current access scope. Showing the
          reference playbook only.
        </p>
      )}
      <div
        className="ops-tabs journey-view-tabs"
        role="group"
        aria-label="Loan flow view"
      >
        <button
          aria-pressed={view === "flow"}
          className={view === "flow" ? "selected" : ""}
          onClick={() => setView("flow")}
        >
          Workflow map
        </button>
        <button
          aria-pressed={view === "sources"}
          className={view === "sources" ? "selected" : ""}
          onClick={() => setView("sources")}
        >
          Sources & operating cadence
        </button>
      </div>
      {view === "flow" ? (
        <div className="journey-layout">
          <nav className="journey-phases" aria-label="Reference loan phases">
            <span className="eyebrow">REFERENCE PHASES</span>
            {journey.phases.map((entry, index) => (
              <button
                key={entry.id}
                className={entry.id === phase.id ? "selected" : ""}
                aria-pressed={entry.id === phase.id}
                onClick={() => {
                  updateParam("phase", entry.id);
                  setQuery("");
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{entry.title}</b>
                  <small>
                    {entry.steps.length} steps
                    {loanNumber && openByPhase[entry.id]
                      ? ` · ${openByPhase[entry.id]} open here`
                      : ""}
                  </small>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
            <p>
              Cadre owns processing execution. LendingPad records authoritative
              loan milestones. The Hub coordinates people, evidence, and
              follow-up.
            </p>
          </nav>
          <section
            className="journey-phase-content"
            aria-labelledby="journey-phase-title"
          >
            <div className="journey-phase-heading">
              <div>
                <span className="eyebrow">THE NEXT HANDOFF</span>
                <h2 id="journey-phase-title">{phase.title}</h2>
                <p>{phase.summary}</p>
              </div>
              <BookOpen size={24} />
            </div>
            {phase.externalStatusLabels?.length > 0 && (
              <p className="journey-status-reference">
                Source milestone labels:{" "}
                {phase.externalStatusLabels.join(" · ")}{" "}
                <span>External observations only</span>
              </p>
            )}
            <div className="ops-filters journey-filters">
              <div className="ops-search">
                <Search size={16} />
                <input
                  aria-label="Search phase steps"
                  placeholder="Search action, evidence, or handoff"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="Filter step owner"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="all">All role owners</option>
                {roles.map((owner) => (
                  <option key={owner}>{owner}</option>
                ))}
              </select>
            </div>
            <div className="journey-step-list">
              {!visible.length && (
                <div className="ops-empty">
                  <Search size={28} />
                  <h3>No steps match this view.</h3>
                  <p>Choose another role or clear your search.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRole("all");
                      setQuery("");
                    }}
                  >
                    Show all phase steps
                  </Button>
                </div>
              )}
              {visible.map((step) => {
                const records = relatedJourneyWork(step, related, loanNumber);
                return (
                  <article key={step.id} className="journey-step">
                    <div className="journey-step-top">
                      <Badge variant="muted">{step.owner}</Badge>
                      <span>{step.system}</span>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.action}</p>
                    <dl className="journey-step-details">
                      <div>
                        <dt>Starts with</dt>
                        <dd>{step.prerequisite}</dd>
                      </div>
                      <div>
                        <dt>Keep the evidence</dt>
                        <dd>{step.evidence}</dd>
                      </div>
                      <div>
                        <dt>Next owner</dt>
                        <dd>{step.nextOwner}</dd>
                      </div>
                    </dl>
                    {step.boundary && (
                      <p className="journey-step-boundary">{step.boundary}</p>
                    )}
                    {records.length > 0 && (
                      <div className="journey-related">
                        <b>Related workflow records · {records.length}</b>
                        <p>
                          These records share a workflow type. They do not prove
                          this step or an external milestone is complete.
                        </p>
                        {records.slice(0, 3).map((item) => (
                          <Link key={item.id} to={`/work/${item.id}`}>
                            <span>{item.title}</span>
                            <WorkBadge status={item.status} />
                            <ArrowUpRight size={14} />
                          </Link>
                        ))}
                        {records.length > 3 && (
                          <Link
                            to={`/operations?loan=${encodeURIComponent(loanNumber)}`}
                          >
                            See all work for this loan <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                    )}
                    <div className="journey-step-footer">
                      <details>
                        <summary>Source references</summary>
                        <div>{sourceRefs(step.sources)}</div>
                      </details>
                      {step.templateId ? (
                        <Button
                          variant={records.length ? "outline" : "brand"}
                          size="sm"
                          to={journeyStartLink(step.templateId, loanNumber)}
                        >
                          {records.length
                            ? `Start another (${records.length} on this loan)`
                            : "Start this work"}
                          <ArrowRight size={14} />
                        </Button>
                      ) : (
                        <span className="journey-external">
                          Observed in LendingPad / outside Hub. No Hub form.
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="journey-source-layout">
          <section className="ops-panel journey-source-panel">
            <div className="ops-panel-heading">
              <div>
                <span className="eyebrow">HUMAN COMMUNICATION</span>
                <h2>Keep the borrower informed.</h2>
                <p>
                  Training cadence is a planning reference. Set the actual owner
                  and target date on each work item.
                </p>
              </div>
              <Users size={22} />
            </div>
            <div className="journey-source-body">
              {journey.cadences.map((cadence) => (
                <article key={cadence.id}>
                  <h3>{cadence.title}</h3>
                  <p>{cadence.description}</p>
                  <div className="journey-source-refs">
                    {sourceRefs([cadence.source])}
                  </div>
                  <Badge variant="muted">
                    Human-scheduled · no automatic timer
                  </Badge>
                </article>
              ))}
            </div>
          </section>
          <section className="ops-panel journey-source-panel">
            <div className="ops-panel-heading">
              <div>
                <span className="eyebrow">SOURCE REVIEW</span>
                <h2>Make unresolved ownership visible.</h2>
                <p>
                  These source differences need an accountable owner before they
                  become automated policy.
                </p>
              </div>
              <GitBranch size={22} />
            </div>
            <div className="journey-source-body">
              {journey.reviewPoints.map((point) => (
                <article key={point.id}>
                  <h3>{point.title}</h3>
                  <p>{point.detail}</p>
                  <div className="journey-source-refs">
                    {sourceRefs(point.sources)}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="ops-panel journey-source-panel journey-source-register">
            <div className="ops-panel-heading">
              <div>
                <span className="eyebrow">TRACEABLE INPUTS</span>
                <h2>Reference register</h2>
                <p>
                  Source descriptions and fingerprints only. Training
                  screenshots, borrower examples, and embedded credentials are
                  excluded.
                </p>
              </div>
              <FileText size={22} />
            </div>
            <div className="journey-source-body">
              {journey.sources.map((source) => (
                <article key={source.id}>
                  <h3>{source.label}</h3>
                  <p>{source.fileName}</p>
                  <small>
                    Supplied training reference · current policy not verified
                  </small>
                  <details>
                    <summary>Source fingerprint</summary>
                    <code>{source.sha256}</code>
                  </details>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
