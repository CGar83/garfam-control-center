import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { Button, Badge, Dialog } from "../components/ui.jsx";
import templates from "../data/operationsTemplates.json";
import {
  PHASES,
  ROLE_STARTERS,
  departmentLabel,
  templatesByPhase,
  uiShort,
  uiTitle,
  whenToUse,
} from "../lib/catalog.js";
import OperatingReferences from "./OperatingReferences.jsx";

const sourceLabel = (source) =>
  (typeof source === "string"
    ? source
    : source?.label || source?.name || "Supplied operations reference"
  )
    .replace(/^Operations [ABC] · /, "")
    .replace(/ · imported source [a-f0-9]+$/, "");

export default function WorkflowLibrary() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "references" ? "references" : "workflows";
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [selected, setSelected] = useState(null);
  const departments = useMemo(
    () =>
      [...new Set(templates.map((template) => template.department))]
        .filter(Boolean)
        .sort(),
    [],
  );
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return templates.filter(
      (template) =>
        (department === "all" ||
          (template.allowedDepartments || [template.department]).includes(
            department,
          )) &&
        (!text ||
          [
            uiTitle(template),
            template.title,
            template.shortTitle,
            template.description,
            departmentLabel(template.department),
            sourceLabel(template.source),
            ...template.sections.flatMap((section) => [
              section.title,
              ...section.fields.map((field) => field.label),
            ]),
            ...template.checklist.map((item) => item.label),
          ]
            .join(" ")
            .toLowerCase()
            .includes(text)),
    );
  }, [query, department]);
  const grouped = templatesByPhase(visible);
  const recommended = (ROLE_STARTERS[profile?.role] || [])
    .map((id) => templates.find((template) => template.id === id))
    .filter(Boolean);
  const canCreateDscr = ["LO", "LOA", "MANAGER", "ADMIN"].includes(
    profile?.role,
  );
  const dscrMatches =
    department === "all" &&
    (!query.trim() ||
      "dscr submission worksheet loan officer mlp processing guided loan pricing".includes(
        query.trim().toLowerCase(),
      ));
  const setView = (next) => {
    const copy = new URLSearchParams(params);
    if (next === "workflows") copy.delete("view");
    else copy.set("view", next);
    setParams(copy, { replace: true });
  };

  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">LIBRARY</div>
          <h1>The right starting point.</h1>
          <p className="lede">
            Choose a form by loan phase. Source field order is unchanged. Cadre
            owns processing execution; the Hub records preparation and
            coordination.
          </p>
        </div>
        <div className="heading-actions">
          <Button variant="outline" to="/journey">
            <BookOpen size={16} /> Flow
          </Button>
          <Button variant="outline" to="/operations">
            <FolderOpen size={16} /> Work queue
          </Button>
        </div>
      </div>
      <div className="report-tabs ia-tabs" role="tablist" aria-label="Library">
        <button
          type="button"
          className={view === "workflows" ? "active" : ""}
          onClick={() => setView("workflows")}
        >
          Workflows
        </button>
        <button
          type="button"
          className={view === "references" ? "active" : ""}
          onClick={() => setView("references")}
        >
          References
        </button>
      </div>
      {view === "references" ? (
        <OperatingReferences />
      ) : (
        <>
          <div className="library-summary">
            <span>
              <b>{templates.length + 1}</b> native workflows
            </span>
            <span>
              <b>{PHASES.length}</b> loan phases
            </span>
            <span>
              <b>Versioned</b> source references
            </span>
          </div>
          {recommended.length > 0 && department === "all" && !query.trim() && (
            <section className="library-recommended" aria-label="Recommended for your desk">
              <span className="eyebrow">RECOMMENDED FOR YOUR DESK</span>
              <div className="library-recommended-row">
                {recommended.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    to={`/operations?template=${encodeURIComponent(template.id)}&create=1`}
                  >
                    {uiShort(template)} <ArrowRight size={13} />
                  </Button>
                ))}
              </div>
            </section>
          )}
          <section className="queue-panel">
            <div className="queue-toolbar">
              <div className="input-search">
                <Search size={16} />
                <input
                  aria-label="Search workflow library"
                  placeholder="Search workflows, fields, or checklist items…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear workflow search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                className="sort-select"
                aria-label="Filter workflows by department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((value) => (
                  <option key={value} value={value}>
                    {departmentLabel(value)}
                  </option>
                ))}
              </select>
              <span className="small muted">
                {visible.length + (dscrMatches ? 1 : 0)} workflows
              </span>
            </div>
            {dscrMatches && (
              <article className="workflow-template-card worksheet-template library-dscr">
                <div className="workflow-template-top">
                  <span className="workflow-template-icon">
                    <FileCheck2 size={22} />
                  </span>
                  <Badge variant="brand">DSCR worksheet</Badge>
                </div>
                <div className="eyebrow">APPLICATION · PRODUCT WORKFLOW</div>
                <h2>DSCR worksheet</h2>
                <p>
                  Loan officer inputs, MLP field verification, and named
                  processing handoffs on a shared loan record. Not a department.
                </p>
                <div className="workflow-template-actions">
                  <Button
                    variant="brand"
                    to={canCreateDscr ? "/new" : "/submissions"}
                  >
                    {canCreateDscr ? "Start worksheet" : "View submissions"}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </article>
            )}
            {grouped.map((phase) => (
              <section key={phase.id} className="library-phase">
                <header>
                  <span className="eyebrow">{phase.title}</span>
                  <h2>{phase.job}</h2>
                  <p>
                    In the Hub: these forms. Outside the Hub: {phase.outside}.
                  </p>
                </header>
                <div className="workflow-library-grid">
                  {phase.templates.map((template) => (
                    <article className="workflow-template-card" key={template.id}>
                      <div className="workflow-template-top">
                        <span className="workflow-template-icon">
                          <ClipboardCheck size={22} />
                        </span>
                        <Badge variant="muted">
                          v{template.version} · {departmentLabel(template.department)}
                        </Badge>
                      </div>
                      <h2>{uiTitle(template)}</h2>
                      <p>{whenToUse(template)}</p>
                      <p className="small muted">
                        Does not mean: {String(template.boundary || "").slice(0, 140)}
                      </p>
                      <div className="workflow-template-meta">
                        <span>
                          {template.sections.reduce(
                            (total, section) => total + section.fields.length,
                            0,
                          )}{" "}
                          fields
                        </span>
                        <span>{template.checklist.length} checklist items</span>
                      </div>
                      <div className="workflow-template-actions">
                        <Button
                          variant="brand"
                          to={`/operations?template=${encodeURIComponent(template.id)}&create=1`}
                        >
                          Start work
                          <ArrowRight size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setSelected(template)}
                        >
                          View template
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {!visible.length && !dscrMatches && (
              <div className="workspace-empty">
                <Search size={30} />
                <h2>No matching workflows</h2>
                <p>Try another department or search a field name.</p>
              </div>
            )}
          </section>
        </>
      )}
      {selected && (
        <Dialog
          title={uiTitle(selected)}
          onClose={() => setSelected(null)}
          className="workflow-template-dialog"
        >
          <p className="lede">{selected.description}</p>
          <p className="small muted">Source: {sourceLabel(selected.source)}</p>
          {selected.sections.map((section) => (
            <section key={section.id} className="template-section">
              <h3>{section.title}</h3>
              <ul>
                {section.fields.map((field) => (
                  <li key={field.key}>
                    <span>{field.label}</span>
                    {field.required && (
                      <span className="small muted">
                        Required{field.showWhen ? " when applicable" : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="template-boundary">{selected.boundary}</p>
          <div className="heading-actions">
            <Button
              variant="brand"
              to={`/operations?template=${encodeURIComponent(selected.id)}&create=1`}
            >
              Start this workflow
              <ArrowRight size={14} />
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
