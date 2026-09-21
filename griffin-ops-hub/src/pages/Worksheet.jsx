import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useParams } from "react-router-dom";
import { useAuth, useAsync } from "../lib/auth.jsx";
import FormRenderer from "../components/FormRenderer.jsx";
import {
  Surface,
  StageBadge,
  Dialog,
  TextArea,
  Button,
  Callout,
  PageHeader,
  Badge,
  fmtDate,
} from "../components/ui.jsx";
import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Download,
  Printer,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  completeness,
  verification,
  visibleSections,
  expandField,
  isFilled,
} from "../lib/schema.js";
import {
  availableTransitions,
  STAGE_LABEL,
  STAGE_OWNER_ROLE,
  STAGE_ORDER,
  isOverrideRole,
} from "../lib/stages.js";
import { downloadWorksheetPdf } from "../lib/exportPdf.js";

export default function Worksheet() {
  const { id } = useParams();
  const { profile, db } = useAuth();
  const [bundle, reload, loading, error] = useAsync(async () => {
    const ws = await db.getWorksheet(id);
    if (!ws)
      throw new Error(
        "This worksheet could not be found or is not available to your account.",
      );
    const [schema, inv, profiles, activity, loan] = await Promise.all([
      ws.schema_snapshot ||
        db.getSchema(ws.form_type, ws.schema_version, ws.base_schema_version),
      db.getInvestorData(),
      db.listProfiles(),
      db.getActivity(id),
      db.findLoan(ws.loan_number),
    ]);
    if (!schema)
      throw new Error(
        `Worksheet schema ${ws.form_type} v${ws.schema_version} is unavailable. Contact your administrator to restore this version.`,
      );
    return { ws, schema, inv, profiles, activity, loan };
  }, [db, id, profile?.id]);

  if (loading || (!error && bundle?.ws.id !== id))
    return (
      <div className="worksheet-loading" role="status">
        <span className="loading-orbit" />
        Loading the worksheet and its history…
      </div>
    );
  if (error)
    return (
      <Callout type="restriction" title="Cannot open worksheet">
        {error.message}
        <div className="actions row">
          <Button variant="outline" onClick={reload}>
            Try again
          </Button>
          <Button variant="ghost" to="/">
            Back to workspace
          </Button>
        </div>
      </Callout>
    );
  return (
    <WorksheetView
      key={`${bundle.ws.id}:${bundle.ws.stage}:${bundle.ws.updated_at}:${profile.id}`}
      bundle={bundle}
      reload={reload}
    />
  );
}

export function WorksheetView({ bundle, reload }) {
  const { profile, db } = useAuth();
  const { ws, schema, inv, profiles, activity, loan } = bundle;
  const role = profile.role;
  const [data, setData] = useState(ws.data || {});
  const [verified, setVerified] = useState(ws.verified || {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState(ws.updated_at);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [activeSection, setActiveSection] = useState(schema.sections[0]?.id);
  const pendingEvents = useRef([]);
  const timer = useRef(null);
  const dataRef = useRef(data);
  const verifiedRef = useRef(verified);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const savedRecord = useRef(ws);
  const savePromise = useRef(null);
  const busyRef = useRef(false);
  const verifyBusyRef = useRef(false);
  const mounted = useRef(true);
  const reviewStarted = useRef(false);
  const flushRef = useRef(null);
  const names = useMemo(
    () =>
      Object.fromEntries(
        profiles.map((person) => [person.id, person.full_name]),
      ),
    [profiles],
  );
  const loKeys = useMemo(
    () =>
      new Set(
        schema.sections
          .flatMap((section) => section.fields)
          .filter((field) => (field.owner || "LO") === "LO")
          .flatMap((field) => [
            ...expandField(field).map((leaf) => leaf.key),
            ...(field.type === "checkgroup"
              ? field.items.map((item) => item.key)
              : []),
          ]),
      ),
    [schema],
  );

  const investor = data.pr
    ? savedRecord.current.data?.pr === data.pr &&
      savedRecord.current.investor_snapshot
      ? savedRecord.current.investor_snapshot
      : inv.byId[data.pr]
    : null;
  const ctx = useMemo(
    () => ({ data, investor, product: ws.form_type, PR: inv.PR, names }),
    [data, investor, inv.PR, ws.form_type, names],
  );
  const loComp = useMemo(() => completeness(schema, ctx, "LO"), [schema, ctx]);
  const mlpComp = useMemo(
    () => completeness(schema, ctx, "MLP"),
    [schema, ctx],
  );
  const ver = useMemo(
    () => verification(schema, ctx, verified),
    [schema, ctx, verified],
  );
  const sections = useMemo(
    () =>
      visibleSections(schema, ctx).map((section) => {
        const required = section.fields
          .filter(
            (field) =>
              !["callout", "note", "scoreSummary"].includes(field.type),
          )
          .flatMap(expandField)
          .filter((field) => field.required);
        return {
          ...section,
          total: required.length,
          filled: required.filter((field) => isFilled(field, data)).length,
        };
      }),
    [schema, ctx, data],
  );
  const outstanding = role === "MLP" ? mlpComp.missing : loComp.missing;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  // Each save snapshots a revision. Edits made while it is in flight become the next
  // save, and failed writes retain their data and audit events for an explicit retry.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (savePromise.current) return savePromise.current;
    if (revision.current === savedRevision.current) return savedRecord.current;
    setSaving(true);
    setErr("");
    const task = Promise.resolve()
      .then(async () => {
        while (savedRevision.current < revision.current) {
          const targetRevision = revision.current;
          const snapshot = { ...dataRef.current };
          const events = pendingEvents.current
            .filter((event) => event.revision <= targetRevision)
            .map(({ revision: _revision, ...event }) => event);
          const saved = await db.saveWorksheet(ws.id, {
            data: snapshot,
            events,
            expectedUpdatedAt: savedRecord.current.updated_at,
          });
          if (!saved?.updated_at)
            throw new Error(
              "The save did not return a confirmed worksheet. Your changes are still pending.",
            );
          savedRecord.current = saved;
          savedRevision.current = targetRevision;
          pendingEvents.current = pendingEvents.current.filter(
            (event) => event.revision > targetRevision,
          );
          if (mounted.current) {
            setSavedAt(saved.updated_at);
            setDirty(revision.current !== savedRevision.current);
            if (revision.current === targetRevision) {
              verifiedRef.current = saved.verified || {};
              setVerified(verifiedRef.current);
            }
          }
        }
        return savedRecord.current;
      })
      .catch((failure) => {
        if (mounted.current) {
          setDirty(true);
          setErr(
            failure.message ||
              "Could not save. Your edits remain on this page. Retry before leaving.",
          );
        }
        throw failure;
      })
      .finally(() => {
        savePromise.current = null;
        if (mounted.current) setSaving(false);
      });
    savePromise.current = task;
    return task;
  }, [db, ws.id]);
  flushRef.current = flush;

  const onChange = (key, value) => {
    if (
      busyRef.current ||
      verifyBusyRef.current ||
      Object.is(dataRef.current[key], value)
    )
      return;
    const previous = dataRef.current[key];
    const wasFilled =
      previous !== undefined &&
      previous !== "" &&
      previous !== null &&
      previous !== false;
    revision.current++;
    pendingEvents.current.push({
      revision: revision.current,
      field_key: key,
      action: wasFilled ? "EDITED" : "COMPLETED",
      value_snapshot: { from: previous ?? null, to: value },
    });
    dataRef.current = { ...dataRef.current, [key]: value };
    setData(dataRef.current);
    // A changed LO field may affect dependent requirements, so every review mark
    // is invalidated together. The adapter applies the same rule atomically.
    if (loKeys.has(key)) {
      verifiedRef.current = {};
      setVerified({});
    }
    setDirty(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flushRef.current().catch(() => {});
    }, 900);
  };

  const onVerify = async (key, on) => {
    if (verifyBusyRef.current || busyRef.current) return;
    verifyBusyRef.current = true;
    setVerifyBusy(true);
    setErr("");
    let previous;
    try {
      await flush();
      previous = verifiedRef.current;
      const optimistic = { ...previous };
      if (on)
        optimistic[key] = { by: profile.id, at: new Date().toISOString() };
      else delete optimistic[key];
      verifiedRef.current = optimistic;
      setVerified(optimistic);
      const saved = await db.setVerified(ws.id, key, on, {
        expectedUpdatedAt: savedRecord.current.updated_at,
      });
      if (!saved?.updated_at)
        throw new Error(
          "Verification was not confirmed. Refresh the saved worksheet before retrying.",
        );
      savedRecord.current = saved;
      verifiedRef.current = saved.verified || {};
      if (mounted.current) {
        setVerified(verifiedRef.current);
        setSavedAt(saved.updated_at);
      }
    } catch (failure) {
      if (previous) {
        verifiedRef.current = previous;
        if (mounted.current) setVerified(previous);
      }
      if (mounted.current)
        setErr(failure.message || "Verification was not saved. Try again.");
    } finally {
      verifyBusyRef.current = false;
      if (mounted.current) setVerifyBusy(false);
    }
  };

  // Opening a submitted file starts the review clock once. Failures remain visible
  // and the manual Start review action provides a bounded retry.
  useEffect(() => {
    if (role !== "MLP" || ws.stage !== "LO_SUBMITTED" || reviewStarted.current)
      return;
    reviewStarted.current = true;
    busyRef.current = true;
    setBusy(true);
    db.transition(ws.id, "MLP_REVIEW", "Opened by MLP", {
      expectedUpdatedAt: savedRecord.current.updated_at,
    })
      .then((saved) => {
        if (!saved?.updated_at)
          throw new Error("The handoff was not confirmed");
        savedRecord.current = saved;
        if (mounted.current) void reload();
      })
      .catch((failure) => {
        if (mounted.current)
          setErr(
            `Review did not start: ${failure.message}. Use Start review to retry.`,
          );
      })
      .finally(() => {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      });
  }, [db, reload, role, ws.id, ws.stage]);

  const hasPendingWork = useCallback(
    () =>
      revision.current > savedRevision.current ||
      !!savePromise.current ||
      verifyBusyRef.current ||
      busyRef.current,
    [],
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasPendingWork() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    const preventLeave = (event) => {
      if (!hasPendingWork()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const preventIdentityChange = (event) => {
      if (!hasPendingWork()) return;
      event.preventDefault();
      setErr(
        "Save the pending worksheet changes before switching users or signing out.",
      );
    };
    window.addEventListener("beforeunload", preventLeave);
    window.addEventListener(
      "griffin:before-identity-change",
      preventIdentityChange,
    );
    return () => {
      window.removeEventListener("beforeunload", preventLeave);
      window.removeEventListener(
        "griffin:before-identity-change",
        preventIdentityChange,
      );
    };
  }, [hasPendingWork]);

  const transitions = availableTransitions(ws.stage, role).filter(
    (transition) => {
      if (
        transition.to === "MLP_VERIFIED" &&
        ver.done < ver.total &&
        !transition.override
      )
        return false;
      if (
        transition.to === "SUBMITTED_TO_PROCESSING" &&
        ws.stage === "MLP_VERIFIED" &&
        ver.done < ver.total &&
        !transition.override
      )
        return false;
      return true;
    },
  );
  const gate = (transition) => {
    if (isOverrideRole(role)) return null;
    if (transition.to === "LO_SUBMITTED" && loComp.missing.length)
      return `${loComp.missing.length} required LO field${loComp.missing.length === 1 ? "" : "s"} remaining`;
    if (transition.to === "SUBMITTED_TO_PROCESSING" && mlpComp.missing.length)
      return `${mlpComp.missing.length} required MLP field${mlpComp.missing.length === 1 ? "" : "s"} remaining`;
    return null;
  };
  const runTransition = async () => {
    if (!modal || busyRef.current || verifyBusyRef.current) return;
    if (modal.noteRequired && !note.trim()) {
      setErr("A note is required for this action.");
      return;
    }
    const blocked = gate(modal);
    if (blocked) {
      setErr(blocked);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setErr("");
    try {
      await flush();
      const saved = await db.transition(ws.id, modal.to, note.trim() || null, {
        expectedUpdatedAt: savedRecord.current.updated_at,
      });
      if (!saved?.updated_at)
        throw new Error(
          "The handoff was not confirmed. Refresh the saved worksheet before retrying.",
        );
      savedRecord.current = saved;
      setModal(null);
      setNote("");
      await reload();
    } catch (failure) {
      if (mounted.current)
        setErr(
          failure.message ||
            "The handoff was not saved. Your worksheet is still here.",
        );
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const saveAndLeave = async () => {
    if (busyRef.current || verifyBusyRef.current) return;
    try {
      await flush();
      blocker.proceed();
    } catch {
      /* Keep the blocked route and the unsaved values. */
    }
  };
  const jumpTo = (sectionId, fieldKey) => {
    setActiveSection(sectionId);
    const field = fieldKey
      ? document.getElementById(`field-${fieldKey}`)
      : null;
    const section = document.getElementById(`s-${sectionId}`);
    const target = field || section;
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    if (field) {
      const control = field.matches("input, select, textarea, button")
        ? field
        : field.querySelector("input, select, textarea, button");
      control?.focus({ preventScroll: true });
    }
  };
  const jumpToMissing = (item) => {
    setHighlightMissing(true);
    const section = sections.find(
      (candidate) => candidate.title === item.section,
    );
    if (section) jumpTo(section.id, item.key);
  };
  const pct = loComp.required
    ? Math.round((loComp.filled / loComp.required) * 100)
    : 100;
  const stagesLinear = STAGE_ORDER.filter(
    (stage) => !stage.startsWith("RETURNED"),
  );
  const isWorking = busy || verifyBusy;
  const exportPdf = async () => {
    if (exporting || busyRef.current || verifyBusyRef.current) return;
    setExporting(true);
    setErr("");
    try {
      const saved = await flush();
      const savedActivity = await db.getActivity(ws.id);
      await downloadWorksheetPdf(saved, schema, {
        mode: db.mode,
        profiles,
        names,
        loan,
        investor: saved.investor_snapshot || inv.byId[saved.data?.pr],
        activity: savedActivity,
      });
    } catch (failure) {
      if (mounted.current)
        setErr(failure.message || "The operational PDF could not be exported.");
    } finally {
      if (mounted.current) setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={`${schema.product_label || ws.form_type} · Submission worksheet`}
        title={
          <>
            {data.cln || loan?.borrower_last || "New borrower"}{" "}
            <span className="faint">/</span>{" "}
            <span className="mono">{ws.loan_number}</span>
          </>
        }
        lede={
          <>
            <StageBadge stage={ws.stage} />
            <span className="worksheet-assignment">
              LO <b>{names[loan?.lo_id] || "Unassigned"}</b> · MLP{" "}
              <b>{names[loan?.mlp_id] || "Unassigned"}</b> · Processing{" "}
              <b>{names[loan?.processor_id] || "Unassigned"}</b>
            </span>
          </>
        }
      >
        <Button
          variant="outline"
          to={`/loans/${encodeURIComponent(ws.loan_number)}`}
        >
          Loan record <ArrowUpRight size={15} />
        </Button>
        <Button
          variant="brand"
          disabled={!dirty || saving || isWorking}
          onClick={() => {
            void flush().catch(() => {});
          }}
        >
          <Save size={15} />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </PageHeader>
      <div className="worksheet-toolbar">
        <div
          className={"save-status" + (dirty ? " pending" : "")}
          role="status"
          aria-live="polite"
        >
          {saving ? (
            <Circle size={15} />
          ) : dirty ? (
            <Circle size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          <span>
            {saving
              ? "Saving changes…"
              : dirty
                ? "Unsaved changes"
                : `All changes saved · ${fmtDate(savedAt)}`}
          </span>
        </div>
        <span className="small muted">
          Schema v{ws.schema_version} ·{" "}
          {STAGE_OWNER_ROLE[ws.stage]
            ? `${STAGE_OWNER_ROLE[ws.stage]} owns this step`
            : "Workflow complete"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer size={15} />
          Print
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={exporting || isWorking}
          onClick={exportPdf}
        >
          <Download size={15} />
          {exporting ? "Exporting…" : "Download PDF"}
        </Button>
      </div>
      <div className="worksheet-reference">
        <ShieldCheck size={17} />
        <span>
          <b>Decision support for human review.</b> Imported investor references
          are not verified as current. Workflow readiness is not a credit
          decision.
        </span>
        <Badge variant="outline">Reference only</Badge>
      </div>
      {err && !modal && (
        <div className="worksheet-error">
          <Callout type="restriction" title="Action needs attention">
            {err}
            {dirty && (
              <div className="actions row">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving || isWorking}
                  onClick={() => {
                    void flush().catch(() => {});
                  }}
                >
                  Retry save
                </Button>
              </div>
            )}
          </Callout>
        </div>
      )}
      <div className="grid2 worksheet-layout">
        <div className="stack">
          {ws.stage === "RETURNED_TO_LO" &&
            lastNote(activity, "RETURNED_TO_LO") && (
              <Callout type="restriction" title="Returned by MLP">
                {lastNote(activity, "RETURNED_TO_LO")}
              </Callout>
            )}
          {ws.stage === "RETURNED_TO_MLP" &&
            lastNote(activity, "RETURNED_TO_MLP") && (
              <Callout type="restriction" title="Returned by Processing">
                {lastNote(activity, "RETURNED_TO_MLP")}
              </Callout>
            )}
          <div className="worksheet-completion-banner">
            <div>
              <b>
                {outstanding.length
                  ? `${outstanding.length} required ${role === "MLP" ? "MLP" : "LO"} fields to complete`
                  : "Required fields complete"}
              </b>
              <span className="small muted">
                {outstanding.length
                  ? "Move directly to the next missing detail."
                  : "Review the worksheet before the next handoff."}
              </span>
            </div>
            {outstanding[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => jumpToMissing(outstanding[0])}
              >
                Next required field <ArrowDown size={14} />
              </Button>
            )}
          </div>
          <FormRenderer
            schema={schema}
            ctx={ctx}
            role={role}
            stage={ws.stage}
            verified={verified}
            onChange={onChange}
            onVerify={onVerify}
            disabled={isWorking}
            verifyBusy={saving}
            highlightMissing={highlightMissing}
          />
        </div>
        <aside className="side stack worksheet-sidebar">
          <Surface title="Worksheet sections" className="worksheet-section-nav">
            <nav aria-label="Worksheet sections">
              {sections.map((section, index) => (
                <button
                  type="button"
                  key={section.id}
                  className={
                    "worksheet-section-link" +
                    (activeSection === section.id ? " active" : "")
                  }
                  onClick={() => jumpTo(section.id)}
                >
                  <span className="section-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                  <small>
                    {section.filled}/{section.total}
                  </small>
                  {section.filled === section.total && (
                    <CheckCircle2 size={13} />
                  )}
                </button>
              ))}
            </nav>
          </Surface>
          <Surface title="Handoff readiness">
            <div className="stagebar" aria-hidden="true">
              {stagesLinear.map((stage, index) => (
                <span
                  key={stage}
                  className={
                    stage === ws.stage
                      ? "now"
                      : index < stagesLinear.indexOf(ws.stage)
                        ? "on"
                        : ""
                  }
                  title={STAGE_LABEL[stage]}
                />
              ))}
            </div>
            <div className="worksheet-progress-item">
              <div className="row-meta">
                <span>LO required fields</span>
                <span className="fig">
                  {loComp.filled}/{loComp.required}
                </span>
              </div>
              <div
                className="track"
                role="progressbar"
                aria-label="LO required fields"
                aria-valuenow={loComp.filled}
                aria-valuemin={0}
                aria-valuemax={loComp.required || 1}
              >
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="worksheet-progress-item">
              <div className="row-meta">
                <span>MLP verification</span>
                <span className="fig">
                  {ver.done}/{ver.total}
                </span>
              </div>
              <div
                className="track"
                role="progressbar"
                aria-label="MLP verification"
                aria-valuenow={ver.done}
                aria-valuemin={0}
                aria-valuemax={ver.total || 1}
              >
                <div
                  className="bar-fill ok"
                  style={{
                    width: `${ver.total ? (ver.done / ver.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="worksheet-progress-item row-meta">
              <span>MLP required fields</span>
              <span className="fig">
                {mlpComp.filled}/{mlpComp.required}
              </span>
            </div>
            <div className="actions worksheet-transition-actions">
              {transitions.length === 0 && (
                <p className="small muted">
                  The next action belongs to another role.
                </p>
              )}
              {transitions.map((transition) => {
                const reason = gate(transition);
                const primary =
                  [
                    "LO_SUBMITTED",
                    "SUBMITTED_TO_PROCESSING",
                    "PROCESSING_ACCEPTED",
                    "MLP_VERIFIED",
                    "COMPLETE",
                  ].includes(transition.to) && !transition.override;
                return (
                  <div key={transition.to}>
                    <Button
                      variant={primary ? "brand" : "outline"}
                      full
                      disabled={!!reason || isWorking}
                      onClick={() => {
                        setNote("");
                        setErr("");
                        setModal(transition);
                      }}
                    >
                      {transition.label}
                    </Button>
                    {reason && (
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Surface>
          {outstanding.length > 0 && (
            <Surface
              title="Required next"
              kicker="Select a field to go directly to it."
            >
              <ul className="missing-fields">
                {outstanding.slice(0, 8).map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => jumpToMissing(item)}>
                      <Circle size={12} />
                      <span>
                        {item.label}
                        <small>{item.section}</small>
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  </li>
                ))}
                {outstanding.length > 8 && (
                  <li className="small muted">
                    +{outstanding.length - 8} more required fields
                  </li>
                )}
              </ul>
            </Surface>
          )}
          <Surface
            title="Activity"
            right={<Badge>{activity.transitions.length}</Badge>}
          >
            <ul className="timeline">
              {activity.transitions.slice(0, 6).map((transition) => (
                <li key={transition.id}>
                  <b>
                    {STAGE_LABEL[transition.to_stage] || transition.to_stage}
                  </b>
                  <span className="who">
                    {names[transition.actor_id] || transition.actor_role} ·{" "}
                    {fmtDate(transition.at)}
                  </span>
                  {transition.note && (
                    <div className="note-t">{transition.note}</div>
                  )}
                </li>
              ))}
            </ul>
            <div className="small faint" style={{ marginTop: 12 }}>
              {activity.events.length} saved field events at page load. Open the
              loan record for the full history.
            </div>
          </Surface>
        </aside>
      </div>
      {modal && (
        <Dialog
          title={modal.label}
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <p className="muted small">
            {STAGE_LABEL[ws.stage]} → {STAGE_LABEL[modal.to]}. Pending edits are
            saved before this timestamped handoff is recorded under your name.
          </p>
          {modal.to === "SUBMITTED_TO_PROCESSING" && ver.done < ver.total && (
            <Callout
              type="warning"
              title={`${ver.total - ver.done} fields not verified`}
            >
              This action records a workflow override. Document the reason for
              the human reviewer.
            </Callout>
          )}
          <LabelledNote
            note={note}
            setNote={setNote}
            required={modal.noteRequired}
            disabled={busy}
          />
          {err && (
            <div role="alert" className="form-error">
              {err}
            </div>
          )}
          <div className="actions row" style={{ marginTop: 18 }}>
            <Button
              variant="brand"
              disabled={busy || verifyBusy}
              onClick={runTransition}
            >
              {busy ? "Saving handoff…" : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Cancel
            </Button>
          </div>
        </Dialog>
      )}
      {blocker.state === "blocked" && (
        <Dialog title="Save before leaving" onClose={() => blocker.reset()}>
          <p className="muted">
            Your worksheet has pending work. Save the changes before opening
            another page.
          </p>
          {err && (
            <p role="alert" className="form-error">
              {err}
            </p>
          )}
          <div className="actions row">
            <Button
              variant="brand"
              disabled={isWorking || saving}
              onClick={saveAndLeave}
            >
              {saving ? "Saving…" : "Save and leave"}
            </Button>
            <Button variant="ghost" onClick={() => blocker.reset()}>
              Stay on worksheet
            </Button>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>
            Leaving without saving discards changes made since the last
            confirmed save.
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={isWorking || saving}
            onClick={() => {
              clearTimeout(timer.current);
              blocker.proceed();
            }}
          >
            Leave without saving
          </Button>
        </Dialog>
      )}
    </>
  );
}

function LabelledNote({ note, setNote, required, disabled }) {
  return (
    <div className="transition-note">
      <label className="lbl" htmlFor="transition-note">
        Handoff note{required ? " (required)" : " (optional)"}
      </label>
      <TextArea
        id="transition-note"
        value={note}
        onChange={setNote}
        disabled={disabled}
        placeholder={required ? "Note (required)" : "Note (optional)"}
      />
    </div>
  );
}

function lastNote(activity, stage) {
  return activity.transitions.find(
    (transition) => transition.to_stage === stage,
  )?.note;
}
