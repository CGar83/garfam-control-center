import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Hand,
  Download,
  FileCheck2,
  History,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import {
  templateById,
  visibleFields,
  workProgress,
  workReviewItems,
  WORK_STATUS_LABEL,
} from "../lib/operations.js";
import {
  canEditWork,
  allowedWorkStatuses,
  departmentRole,
} from "../lib/operationsPolicy.js";
import { downloadWorkItemPdf } from "../lib/exportPdf.js";
import { Button, Dialog, Label, LoadState } from "../components/ui.jsx";
import { WorkBadge } from "./Operations.jsx";
import CDReview from "../components/CDReview.jsx";
import EvidenceReview from "../components/EvidenceReview.jsx";
import { findFormFields, sectionReadiness } from "../lib/formNavigation.js";
import processorReferences from "../data/processorReferences.json";
import {
  isCoordinationWork,
  downloadCoordinationPacket,
} from "../lib/coordination.js";
import { nextTemplateId, uiShort, uiTitle } from "../lib/catalog.js";
import { journeyStartLink } from "../lib/journey.js";
import { blockedReason, canClaim } from "../lib/workView.js";

const clone = (v) => structuredClone(v);
const metadata = (item) => ({
  title: item.title,
  ownerId: item.owner_id || "",
  dueDate: item.due_date || "",
  priority: item.priority || "NORMAL",
});
const textDate = (value) => (value ? new Date(value).toLocaleString() : "");
const valueText = (v) =>
  v === true
    ? "Checked"
    : v === false
      ? "Not checked"
      : v == null || v === ""
        ? "Empty"
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);

function Field({ field, value, onChange, disabled, highlight }) {
  const id = `op-field-${field.key}`;
  const span = field.span ?? (field.type === "textarea" ? 2 : 1);
  if (field.type === "checkbox")
    return (
      <div
        className={`ops-checkbox-field${highlight ? " ops-field-attention" : ""}`}
      >
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            aria-invalid={highlight || undefined}
          />
          <span>
            {field.label}
            {field.required && <b className="req"> *</b>}
            {field.hint && <small>{field.hint}</small>}
          </span>
        </label>
      </div>
    );
  const props = {
    id,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    disabled:
      disabled ||
      field.readOnly ||
      ["loanNumber", "ln", "id_1"].includes(field.key),
    "aria-required": field.required || undefined,
    "aria-invalid": highlight || undefined,
    "aria-describedby": field.hint ? `${id}-hint` : undefined,
  };
  return (
    <div
      className={`${span > 1 ? "span2 " : ""}${span > 2 ? "ops-field-full " : ""}ops-field${highlight ? " ops-field-attention" : ""}`}
    >
      <Label htmlFor={id} required={field.required}>
        {field.label}
      </Label>
      {field.type === "select" ? (
        <select {...props} className="sel">
          <option value="">Select…</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {field.optionLabels?.[o] || o}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          {...props}
          className="ta"
          rows={3}
          maxLength={field.maxLength ?? 4000}
        />
      ) : (
        <input
          {...props}
          className="inp"
          type={
            ["number", "date", "email", "url"].includes(field.type)
              ? field.type
              : "text"
          }
          step={
            field.type === "number"
              ? field.precision == null
                ? "any"
                : 10 ** -field.precision
              : undefined
          }
          min={
            field.type === "number"
              ? (field.min ?? field.exclusiveMin)
              : field.type === "date" && field.minYear
                ? `${field.minYear}-01-01`
                : undefined
          }
          max={
            field.type === "number"
              ? field.max
              : field.type === "date" && field.maxYear
                ? `${field.maxYear}-12-31`
                : undefined
          }
          maxLength={field.maxLength ?? 4000}
        />
      )}
      {field.hint && (
        <p id={`${id}-hint`} className="hint">
          {field.hint}
        </p>
      )}
      {highlight && (
        <small className="ops-field-message">
          Required entry needs attention.
        </small>
      )}
    </div>
  );
}

function WorkEditor({ initial, profiles, loan }) {
  const { db, profile } = useAuth();
  const [item, setItem] = useState(initial),
    [data, setData] = useState(() => clone(initial.data || {})),
    [checks, setChecks] = useState(() => clone(initial.checks || {})),
    [meta, setMeta] = useState(() => metadata(initial));
  const [tab, setTab] = useState("work"),
    [section, setSection] = useState(
      initial.template_snapshot?.sections?.[0]?.id || "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [action, setAction] = useState(null),
    [note, setNote] = useState(""),
    [timeOpen, setTimeOpen] = useState(false),
    [minutes, setMinutes] = useState(""),
    [timeNote, setTimeNote] = useState("");
  const flight = useRef(false);
  const [fieldQuery, setFieldQuery] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [focusKey, setFocusKey] = useState(null);
  const saveShortcut = useRef(null);
  const template = item.template_snapshot || templateById(item.template_id);
  const dataChanged = JSON.stringify(data) !== JSON.stringify(item.data || {});
  const attestationKeys = template.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.required && f.type === "checkbox")
    .map((f) => f.key);
  const detailsChanged = template.sections
    .flatMap((s) => s.fields)
    .filter((f) => !attestationKeys.includes(f.key))
    .some((f) => data[f.key] !== item.data?.[f.key]);
  const reconfirmAfterSave =
    (dataChanged &&
      Object.values(item.checks || {}).some((value) => value === true)) ||
    (detailsChanged &&
      attestationKeys.some((key) => item.data?.[key] === true));
  const dirty =
    dataChanged ||
    JSON.stringify(checks) !== JSON.stringify(item.checks || {}) ||
    JSON.stringify(meta) !== JSON.stringify(metadata(item));
  const editable = canEditWork(item, profile);
  const blocker = useBlocker(dirty || busy);
  const [audit, reloadAudit, auditLoading, auditError] = useAsync(
    () => db.getWorkActivity(item.id),
    [db, item.id],
  );
  const fields = visibleFields(template, data);
  const progress = workProgress({ ...item, data, checks });
  const reviewItems = workReviewItems({ ...item, data, checks });
  const names = Object.fromEntries(
    profiles.map((p) => [p.id, p.full_name.replace("Demo ", "")]),
  );
  const statuses = allowedWorkStatuses(item, profile);
  const activeSection =
    template.sections.find((s) => s.id === section) || template.sections[0];
  const readiness = sectionReadiness(template, data);
  const fieldMatches = findFormFields(template, data, fieldQuery);
  const missingKeys = new Set(
    progress.missing.filter((f) => f.kind === "field").map((f) => f.key),
  );
  const jumpToField = (field) => {
    if (!field?.sectionId) return;
    setSection(field.sectionId);
    setTab("work");
    setFieldQuery("");
    setFocusKey(field.key);
  };
  useEffect(() => {
    if (!focusKey || tab !== "work") return;
    const input = document.getElementById(`op-field-${focusKey}`);
    if (input) {
      input.focus();
      input.scrollIntoView?.({ block: "center", behavior: "smooth" });
      setFocusKey(null);
    }
  }, [focusKey, tab, section]);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveShortcut.current?.();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const identity = (e) => {
      if (
        busy ||
        !window.confirm("Discard unsaved changes before switching identity?")
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("griffin:before-identity-change", identity);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("griffin:before-identity-change", identity);
    };
  }, [dirty, busy]);
  const accept = (saved) => {
    setItem(saved);
    setData(clone(saved.data || {}));
    setChecks(clone(saved.checks || {}));
    setMeta(metadata(saved));
  };
  const save = async () => {
    if (!dirty) return item;
    const saved = await db.saveWorkItem(item.id, {
      data,
      checks,
      ...meta,
      ownerId: meta.ownerId || null,
      dueDate: meta.dueDate || null,
      expectedUpdatedAt: item.updated_at,
    });
    accept(saved);
    return saved;
  };
  const run = async (fn) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      await reloadAudit();
    } catch (e) {
      setError(
        e.message ||
          "The action could not be completed. Your entries are still here.",
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const saveClick = () =>
    run(async () => {
      await save();
      setSuccess("Saved to this work item.");
    });
  useEffect(() => {
    saveShortcut.current = () => {
      if (editable && dirty && !busy && !action && !timeOpen) saveClick();
    };
  });
  const transition = () =>
    run(async () => {
      const saved = await save();
      const updated = await db.transitionWorkItem(item.id, action, note, {
        expectedUpdatedAt: saved.updated_at,
      });
      accept(updated);
      setAction(null);
      setNote("");
      setSuccess(`Work moved to ${WORK_STATUS_LABEL[updated.status]}.`);
    });
  const exportPdf = () =>
    run(async () => {
      const saved = await save();
      await downloadWorkItemPdf(saved, profiles);
      setSuccess("Operational PDF exported from the saved revision.");
    });
  const exportPacket = () =>
    run(async () => {
      const saved = await save();
      downloadCoordinationPacket(saved);
      setSuccess(
        "Saved coordination packet exported. Nothing was sent to Cadre.",
      );
    });
  const logTime = () =>
    run(async () => {
      const saved = await save();
      await db.logWorkTime(item.id, {
        minutes: Number(minutes),
        note: timeNote,
        expectedUpdatedAt: saved.updated_at,
      });
      const latest = await db.getWorkItem(item.id);
      accept(latest);
      setTimeOpen(false);
      setMinutes("");
      setTimeNote("");
      setSuccess("Handling time recorded as a self-reported entry.");
    });
  const events = Array.isArray(audit) ? audit : audit?.events || [];
  const blockNote = item.status === "BLOCKED" ? blockedReason(events) : "";
  const claim = () =>
    run(async () => {
      const saved = await db.saveWorkItem(item.id, {
        ownerId: profile.id,
        expectedUpdatedAt: item.updated_at,
      });
      accept(saved);
      setSuccess("You now own this work item.");
    });
  const timeEntries = audit?.timeEntries || [];
  const minutesTotal = timeEntries.reduce(
    (sum, e) => sum + Number(e.minutes || 0),
    0,
  );
  const sectionFields = (s) =>
    fields.filter((f) => s.fields.some((original) => original.key === f.key));
  const updateField = (key, value) => {
    if (data[key] === value) return;
    const updated = { ...data, [key]: value };
    if (!attestationKeys.includes(key))
      for (const attestation of attestationKeys)
        if (updated[attestation] === true) updated[attestation] = false;
    setData(updated);
    setChecks((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([check, checked]) => [
          check,
          checked === true ? false : checked,
        ]),
      ),
    );
  };
  return (
    <>
      <Link
        to={`/loans/${encodeURIComponent(item.loan_number)}`}
        className="record-back"
      >
        <ArrowLeft size={14} />
        Loan {item.loan_number}
      </Link>
      <header className="ops-item-header">
        <div>
          <div className="eyebrow">
            {uiShort(template)} · #{item.loan_number}
          </div>
          <h1>{uiTitle(template, item.title)}</h1>
          <p>
            <span>
              {loan ? (
                <Link to={`/loans/${encodeURIComponent(item.loan_number)}`}>
                  {loan.borrower_last || item.borrower_last || "Loan record"} ·{" "}
                  {item.loan_number}
                </Link>
              ) : (
                `${item.borrower_last || "Loan context"} · ${item.loan_number}`
              )}
            </span>
            <span> / </span>
            {item.department.replace("_", " ")}
            <span> / </span>Template v
            {item.template_version || template.version}
          </p>
        </div>
        <div className="heading-actions">
          <WorkBadge status={item.status} />
          {isCoordinationWork(item) && (
            <Button variant="outline" disabled={busy} onClick={exportPacket}>
              <Download size={15} />
              Handoff packet
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={exportPdf}>
            <Download size={15} />
            PDF copy
          </Button>
          {editable && (
            <Button
              variant="brand"
              disabled={busy || !dirty}
              onClick={saveClick}
            >
              <Save size={15} />
              {busy ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </header>
      <div className="ops-save-status" role="status">
        <span className={dirty ? "unsaved" : ""}>
          {dirty ? "Unsaved changes" : `Saved ${textDate(item.updated_at)}`}
        </span>
        <span>
          {success || "Work status does not change the loan’s LOS status."}
        </span>
      </div>
      {item.status === "BLOCKED" && (
        <div className="blocked-reason" role="status">
          <CircleAlert size={18} />
          <div>
            <span className="eyebrow">BLOCKED · NAMED REASON</span>
            <strong>{blockNote || "No block reason was recorded."}</strong>
            <p>
              Unblock by recording the missing artifact, then move the work back
              to Queued or In progress.
            </p>
          </div>
        </div>
      )}
      {canClaim(item, profile) && (
        <div className="claim-banner" role="status">
          <Hand size={18} />
          <div>
            <strong>Nobody owns this work yet.</strong>
            <p>It sits in the {item.department.replace("_", " ").toLowerCase()} queue.</p>
          </div>
          <Button variant="brand" size="sm" disabled={busy} onClick={claim}>
            Claim it
          </Button>
        </div>
      )}
      {item.status === "COMPLETE" && nextTemplateId(template.id) && (
        <div className="next-handoff" role="status">
          <div>
            <span className="eyebrow">NEXT ON THIS LOAN</span>
            <strong>{uiTitle(nextTemplateId(template.id))}</strong>
            <p>
              Completing this work does not move the loan. Start the next Hub
              form while the context is still in front of you.
            </p>
          </div>
          <Button
            variant="brand"
            to={journeyStartLink(nextTemplateId(template.id), item.loan_number)}
          >
            Start next form <ArrowRight size={14} />
          </Button>
        </div>
      )}
      {item.department === "MLP" && (
        <div className="mlp-work-context">
          <span>Borrower coordination · human-recorded work</span>
          <Link
            to={`/journey?loan=${encodeURIComponent(item.loan_number)}&phase=${item.template_id === "MLP_SIGNING_COORDINATION" ? "closing" : "preparation"}`}
          >
            View loan-flow responsibilities <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      {reconfirmAfterSave && (
        <p className="ops-inline-warning" role="status">
          Changed data requires a fresh review. Save these changes before
          recording previously saved checks again.
        </p>
      )}
      {error && (
        <div className="ops-error" role="alert">
          <strong>Action not completed</strong>
          <p>{error}</p>
        </div>
      )}
      <div
        className="ops-tabs ops-item-tabs"
        role="group"
        aria-label="Work item view"
      >
        {[
          ["work", "Workspace", FileCheck2],
          ["review", "Review & evidence", ShieldCheck],
          ["history", "Activity & time", History],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={tab === id ? "selected" : ""}
          >
            <Icon size={15} />
            {label}
            {id === "review" && (
              <span>
                {progress.done}/{progress.total}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="ops-editor-layout">
        <aside className="ops-editor-rail">
          <div className="ops-panel ops-item-summary">
            <span className="eyebrow">Work readiness</span>
            <strong className="ops-readiness">
              {progress.percent || 0}
              <span>%</span>
            </strong>
            <div className="ops-progress">
              <span style={{ width: `${progress.percent || 0}%` }} />
            </div>
            <p>
              {progress.done} of {progress.total} required items recorded
            </p>
            <small>
              Completeness only. This is not a credit or compliance decision.
            </small>
          </div>
          <nav className="ops-sections" aria-label="Work sections">
            {template.sections.map((s, index) => (
              <button
                key={s.id}
                onClick={() => {
                  setSection(s.id);
                  setTab("work");
                }}
                className={
                  tab === "work" && activeSection?.id === s.id ? "selected" : ""
                }
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{s.title}</b>
                <small title="Required entries recorded">
                  {readiness[index].total
                    ? `${readiness[index].done}/${readiness[index].total}`
                    : "Optional"}
                </small>
              </button>
            ))}
          </nav>
          <div className="ops-boundary">
            <ShieldCheck size={18} />
            <p>{template.boundary}</p>
          </div>
          {processorReferences.some((reference) =>
            reference.relatedTemplateIds.includes(template.id),
          ) && (
            <div className="ops-linked-references">
              <span className="eyebrow">Source references</span>
              {processorReferences
                .filter((reference) =>
                  reference.relatedTemplateIds.includes(template.id),
                )
                .map((reference) => (
                  <Link
                    key={reference.id}
                    to={`/references?id=${encodeURIComponent(reference.id)}`}
                  >
                    {reference.title}
                    <ArrowUpRight size={13} />
                  </Link>
                ))}
              <p>
                Original training excerpts. Current applicability requires owner
                review.
              </p>
            </div>
          )}
        </aside>
        <div className="ops-editor-main">
          {tab === "work" && template.id === "PROCESSING_SUBMISSION" && (
            <div className="product-switcher" role="group" aria-label="Product type">
              <span className="eyebrow">
                Product whose source fields should appear
              </span>
              <div className="product-switcher-row">
                {(
                  template.sections
                    .flatMap((s) => s.fields)
                    .find((f) => f.key === "productType")?.options || []
                ).map((option) => {
                  const labels =
                    template.sections
                      .flatMap((s) => s.fields)
                      .find((f) => f.key === "productType")?.optionLabels || {};
                  return (
                    <button
                      key={option}
                      type="button"
                      className={data.productType === option ? "on" : ""}
                      disabled={!editable || busy}
                      onClick={() =>
                        setData((prev) => ({ ...prev, productType: option }))
                      }
                    >
                      {labels[option] || option}
                    </button>
                  );
                })}
              </div>
              <p className="small muted">
                This does not determine investor eligibility. Source fields stay
                in original order.
              </p>
            </div>
          )}
          {tab === "work" && (
            <div className="ops-form-tools">
              <div className="ops-field-finder">
                <Search size={16} />
                <input
                  aria-label="Find a field"
                  placeholder="Find a field in this form…"
                  value={fieldQuery}
                  onChange={(event) => setFieldQuery(event.target.value)}
                />
                {fieldQuery && (
                  <button
                    aria-label="Clear field search"
                    onClick={() => setFieldQuery("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                className={showMissing ? "active" : ""}
                aria-pressed={showMissing}
                onClick={() => setShowMissing(!showMissing)}
              >
                <FileCheck2 size={15} /> Highlight required
              </button>
              {fieldQuery.trim() && (
                <div
                  className="ops-field-results"
                  aria-label="Field search results"
                >
                  <small>
                    {fieldMatches.length} matching fields · original form order
                  </small>
                  {fieldMatches.slice(0, 30).map((field) => (
                    <button key={field.key} onClick={() => jumpToField(field)}>
                      <span>
                        <b>{field.label}</b>
                        <small>{field.section}</small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                  {fieldMatches.length === 0 && (
                    <p>No matching fields. Try a label or section name.</p>
                  )}
                  {fieldMatches.length > 30 && (
                    <p>Showing the first 30 matches. Refine your search.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {tab === "work" && (
            <section className="ops-panel ops-field-panel">
              <div className="ops-panel-heading">
                <div>
                  <span className="eyebrow">
                    {template.shortTitle || "Loan operations"}
                  </span>
                  <h2>{activeSection?.title}</h2>
                  <p>
                    {sectionFields(activeSection).length} applicable fields ·
                    required items marked *
                  </p>
                </div>
                <span className="ops-section-number">
                  {String(
                    template.sections.indexOf(activeSection) + 1,
                  ).padStart(2, "0")}
                </span>
              </div>
              {activeSection.description && (
                <div className="ops-source-instructions">
                  <span className="eyebrow">
                    {activeSection.origin === "hub"
                      ? "Hub coordination guidance"
                      : "Source form instructions"}
                  </span>
                  <p>{activeSection.description}</p>
                </div>
              )}
              <fieldset
                disabled={!editable || busy}
                className="worksheet-fieldset"
              >
                <div
                  className={`g2 ops-fields${activeSection.columns ? ` ops-columns-${activeSection.columns}` : ""}`}
                >
                  {sectionFields(activeSection).map((field) => (
                    <Field
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      highlight={showMissing && missingKeys.has(field.key)}
                      disabled={
                        !editable ||
                        busy ||
                        (detailsChanged &&
                          attestationKeys.includes(field.key) &&
                          item.data?.[field.key] === true)
                      }
                      onChange={(v) => updateField(field.key, v)}
                    />
                  ))}
                </div>
              </fieldset>
              <div className="ops-panel-footer">
                <span>
                  {!editable
                    ? "Read-only at your current role and status."
                    : "Your entries are retained until you save or discard."}
                </span>
                {template.sections.indexOf(activeSection) > 0 && (
                  <button
                    className="btn outline sm"
                    onClick={() =>
                      setSection(
                        template.sections[
                          template.sections.indexOf(activeSection) - 1
                        ].id,
                      )
                    }
                  >
                    <ArrowLeft size={14} /> Previous section
                  </button>
                )}
                {template.sections.indexOf(activeSection) <
                template.sections.length - 1 ? (
                  <button
                    className="btn outline sm"
                    onClick={() =>
                      setSection(
                        template.sections[
                          template.sections.indexOf(activeSection) + 1
                        ].id,
                      )
                    }
                  >
                    Next section <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="btn outline sm"
                    onClick={() => setTab("review")}
                  >
                    Review work <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </section>
          )}
          {tab === "work" && template.sourceFooter && (
            <details className="ops-source-footer">
              <summary>Original source disclaimer & footer</summary>
              <p>{template.sourceFooter}</p>
            </details>
          )}
          {tab === "review" && (
            <>
              <section className="ops-panel ops-field-panel">
                <div className="ops-panel-heading">
                  <div>
                    <span className="eyebrow">Human review</span>
                    <h2>Evidence before handoff.</h2>
                    <p>Record the checks your team has actually performed.</p>
                  </div>
                  <CheckCheck size={24} />
                </div>
                <div className="ops-evidence-list">
                  {(template.checklist || []).map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={checks[c.id] === true}
                        disabled={
                          !editable ||
                          busy ||
                          (dataChanged && item.checks?.[c.id] === true)
                        }
                        onChange={(e) =>
                          setChecks((prev) => ({
                            ...prev,
                            [c.id]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>
                          {c.label}
                          {c.required && <b className="req"> *</b>}
                        </strong>
                        <small>
                          {checks[c.id]
                            ? "Recorded in current work revision"
                            : "Not recorded"}
                        </small>
                      </span>
                      {checks[c.id] && <Check size={17} />}
                    </label>
                  ))}
                </div>
                {!template.checklist?.length && (
                  <p className="ops-muted">
                    This template uses the attestations within its form
                    sections.
                  </p>
                )}
              </section>
              <CDReview item={{ ...item, data, checks }} dirty={dirty} />
              <EvidenceReview item={{ ...item, data, checks }} dirty={dirty} />
              {reviewItems.length > 0 && (
                <section className="ops-panel ops-field-panel">
                  <div className="ops-panel-heading">
                    <div>
                      <h2>Human review prompts</h2>
                      <p>
                        Imported reference prompts. These do not prevent a
                        handoff or determine eligibility.
                      </p>
                    </div>
                  </div>
                  <div className="ops-missing-list">
                    {reviewItems.map((review) => (
                      <button
                        key={review.key}
                        onClick={() => {
                          jumpToField(review);
                        }}
                      >
                        <CircleMark />
                        <span>
                          <strong>{review.label}</strong>
                          {review.detail && <small>{review.detail}</small>}
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section className="ops-panel ops-field-panel">
                <div className="ops-panel-heading">
                  <div>
                    <h2>Remaining requirements</h2>
                    <p>{progress.total - progress.done} items need attention</p>
                  </div>
                </div>
                <div className="ops-missing-list">
                  {(progress.missing || []).map((f, index) => (
                    <button
                      key={`${f.kind || "field"}-${f.id || f.key || index}`}
                      onClick={() => {
                        const s = template.sections.find((s) =>
                          s.fields.some((x) => x.key === f.key),
                        );
                        if (s) {
                          setShowMissing(true);
                          jumpToField({ ...f, sectionId: s.id });
                        }
                      }}
                    >
                      <CircleMark />
                      <span>{f.label || String(f)}</span>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                  {progress.done === progress.total && (
                    <p className="ops-ready">
                      <CheckCheck size={18} />
                      All required fields and checks are recorded. A human still
                      owns the handoff.
                    </p>
                  )}
                </div>
              </section>
              <section className="ops-panel ops-field-panel">
                <div className="ops-panel-heading">
                  <h2>Entered values</h2>
                </div>
                {template.sections.map((s) => (
                  <details className="ops-value-group" key={s.id}>
                    <summary>
                      {s.title}
                      <span>{sectionFields(s).length} fields</span>
                    </summary>
                    {s.description && (
                      <p className="ops-review-description">{s.description}</p>
                    )}
                    <dl>
                      {sectionFields(s).map((f) => (
                        <div key={f.key}>
                          <dt>{f.label}</dt>
                          <dd>
                            {f.optionLabels?.[data[f.key]] ||
                              valueText(data[f.key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))}
              </section>
            </>
          )}
          {tab === "history" && (
            <>
              <section className="ops-panel ops-field-panel">
                <div className="ops-panel-heading">
                  <div>
                    <span className="eyebrow">Handling time</span>
                    <h2>{minutesTotal} minutes recorded</h2>
                    <p>
                      Self-reported active work. Not elapsed cycle time or a
                      measured savings claim.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={busy || !editable}
                    onClick={() => setTimeOpen(true)}
                  >
                    <Clock3 size={15} />
                    Log time
                  </Button>
                </div>
                {timeEntries.length ? (
                  <div className="ops-time-list">
                    {timeEntries.map((e) => (
                      <div key={e.id}>
                        <strong>{e.minutes} min</strong>
                        <span>{e.note}</span>
                        <small>
                          {names[e.actor_id] || e.actor_id} · {textDate(e.at)}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ops-muted">
                    No handling time has been recorded for this work.
                  </p>
                )}
              </section>
              <section className="ops-panel ops-field-panel">
                <div className="ops-panel-heading">
                  <h2>Work history</h2>
                  <History size={20} />
                </div>
                <LoadState
                  loading={auditLoading}
                  error={auditError}
                  onRetry={reloadAudit}
                />
                {!auditLoading && !auditError && (
                  <div className="ops-audit">
                    {events.map((e) => (
                      <article key={e.id}>
                        <span className="ops-audit-dot" />
                        <div>
                          <strong>
                            {(e.action || "Updated").replaceAll("_", " ")}
                          </strong>
                          <small>
                            {names[e.actor_id] ||
                              e.actor_role ||
                              "Recorded actor"}{" "}
                            · {textDate(e.at)}
                          </small>
                          {e.from_status && (
                            <p>
                              {WORK_STATUS_LABEL[e.from_status]} →{" "}
                              {WORK_STATUS_LABEL[e.to_status]}
                            </p>
                          )}
                          {e.note && <p>{e.note}</p>}
                          {e.changes && (
                            <details>
                              <summary>Recorded changes</summary>
                              <pre>{JSON.stringify(e.changes, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
        <aside className="ops-item-controls">
          <section className="ops-panel ops-control-panel">
            <div className="ops-panel-heading">
              <h2>Accountability</h2>
            </div>
            <fieldset
              className="worksheet-fieldset"
              disabled={!editable || busy}
            >
              <div className="ops-control-fields">
                <div>
                  <Label htmlFor="item-title">Work title</Label>
                  <input
                    id="item-title"
                    className="inp"
                    value={meta.title}
                    maxLength={160}
                    onChange={(e) =>
                      setMeta((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="item-owner">Owner</Label>
                  <select
                    id="item-owner"
                    className="sel"
                    value={meta.ownerId}
                    onChange={(e) =>
                      setMeta((p) => ({ ...p, ownerId: e.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {profiles
                      .filter(
                        (p) =>
                          p.active !== false &&
                          !!p.branch &&
                          p.branch === item.branch &&
                          departmentRole(item.department, p.role),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name.replace("Demo ", "")}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="item-due">Internal target</Label>
                  <input
                    id="item-due"
                    className="inp"
                    type="date"
                    value={meta.dueDate}
                    onChange={(e) =>
                      setMeta((p) => ({ ...p, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="item-priority">Priority</Label>
                  <select
                    id="item-priority"
                    className="sel"
                    value={meta.priority}
                    onChange={(e) =>
                      setMeta((p) => ({ ...p, priority: e.target.value }))
                    }
                  >
                    {["NORMAL", "HIGH", "URGENT"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
            <div className="ops-control-actions">
              <span className="eyebrow">Next action</span>
              {statuses.map((status) => (
                <Button
                  key={status}
                  full
                  variant={status === "COMPLETE" ? "brand" : "outline"}
                  disabled={busy}
                  onClick={() => {
                    setAction(status);
                    setNote("");
                  }}
                >
                  {status === "COMPLETE"
                    ? "Complete this work"
                    : `Move to ${WORK_STATUS_LABEL[status]}`}
                  <ArrowRight size={14} />
                </Button>
              ))}
              {!statuses.length && (
                <p className="ops-muted">
                  No status changes are available to your role.
                </p>
              )}
            </div>
          </section>
          <section className="ops-record-link">
            <small>SHARED LOAN RECORD</small>
            <h3>#{item.loan_number}</h3>
            <p>
              {loan?.borrower_last ||
                item.borrower_last ||
                "Client not recorded"}
            </p>
            <>
              {loan ? (
                <>
                  <Link to={`/loans/${encodeURIComponent(item.loan_number)}`}>
                    All work on this loan <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/operations?create=1&loan=${encodeURIComponent(item.loan_number)}`}
                  >
                    Start another workflow <ArrowRight size={14} />
                  </Link>
                </>
              ) : (
                <p>
                  Your access covers this work item. Full loan-record access
                  requires a separate assignment.
                </p>
              )}
            </>
          </section>
        </aside>
      </div>
      {editable && dirty && (
        <div className="ops-draft-dock" aria-label="Unsaved form actions">
          <div>
            <span className="ops-draft-dot" />
            <span>
              <strong>Changes ready to save</strong>
              <small>Save this revision before handing off. Ctrl / ⌘ S</small>
            </span>
          </div>
          <Button variant="brand" disabled={busy} onClick={saveClick}>
            <Save size={15} /> Save draft
          </Button>
        </div>
      )}
      {action && (
        <Dialog
          title={`Move to ${WORK_STATUS_LABEL[action]}`}
          onClose={() => !busy && setAction(null)}
        >
          <p>
            This records a Hub handoff. It does not send an external message or
            change LendingPad.
          </p>
          {["REVIEW", "COMPLETE"].includes(action) &&
            progress.done < progress.total && (
              <p className="ops-inline-warning">
                {progress.total - progress.done} required items remain. Complete
                them before this handoff.
              </p>
            )}
          <Label htmlFor="transition-note">
            Handoff note{" "}
            {["BLOCKED", "CANCELLED"].includes(action) ||
            ["COMPLETE", "CANCELLED"].includes(item.status)
              ? "(required)"
              : "(optional)"}
          </Label>
          <textarea
            id="transition-note"
            className="ta"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={busy}
          />
          <div className="ops-dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Keep current status
            </Button>
            <Button
              variant="brand"
              disabled={
                busy ||
                (["REVIEW", "COMPLETE"].includes(action) &&
                  progress.done < progress.total)
              }
              onClick={transition}
            >
              {busy ? "Recording…" : "Record handoff"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {timeOpen && (
        <Dialog
          title="Record handling time"
          onClose={() => !busy && setTimeOpen(false)}
        >
          <p>
            Record actual minutes spent on this task. Avoid estimates of time
            saved.
          </p>
          <Label htmlFor="time-minutes" required>
            Minutes worked
          </Label>
          <input
            id="time-minutes"
            className="inp"
            type="number"
            min="0.1"
            max="1440"
            step="any"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={busy}
          />
          <Label htmlFor="time-note" required>
            Work performed
          </Label>
          <textarea
            id="time-note"
            className="ta"
            value={timeNote}
            onChange={(e) => setTimeNote(e.target.value)}
            disabled={busy}
            maxLength={1000}
          />
          <div className="ops-dialog-actions">
            <Button
              variant="brand"
              disabled={busy || !minutes || !timeNote.trim()}
              onClick={logTime}
            >
              Record time
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
      {blocker.state === "blocked" && (
        <Dialog
          title="Keep your unsaved work?"
          onClose={() => !busy && blocker.reset()}
        >
          <p>
            Save your changes before leaving, or discard this unsaved revision.
          </p>
          <div className="ops-dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => blocker.reset()}
            >
              Stay here
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => blocker.proceed()}
            >
              Discard and leave
            </Button>
            <Button
              variant="brand"
              disabled={busy || !editable}
              onClick={() =>
                run(async () => {
                  await save();
                  blocker.proceed();
                })
              }
            >
              {busy ? "Saving…" : "Save and leave"}
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
function CircleMark() {
  return <span className="ops-circle-mark" aria-hidden="true" />;
}

export default function WorkItem() {
  const { id } = useParams(),
    { db, profile } = useAuth();
  const [bundle, reload, loading, error] = useAsync(async () => {
    const [item, profiles] = await Promise.all([
      db.getWorkItem(id),
      db.listProfiles(),
    ]);
    if (!item) throw new Error("Work item not found or access denied.");
    if (
      !(item.template_snapshot || templateById(item.template_id))?.sections
        ?.length
    )
      throw new Error(
        "The pinned workflow template is unavailable. Contact your administrator.",
      );
    const loan = await db.findLoan(item.loan_number);
    return { item, profiles, loan };
  }, [db, id, profile?.id]);
  if (loading || error || !bundle)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  return (
    <WorkEditor
      key={`${id}-${profile.id}`}
      initial={bundle.item}
      profiles={bundle.profiles}
      loan={bundle.loan}
    />
  );
}
