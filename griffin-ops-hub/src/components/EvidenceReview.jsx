import {
  ArrowUpRight,
  FileSearch,
  GitCompareArrows,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui.jsx";
import { evidenceSummary, isCoordinationWork } from "../lib/coordination.js";

function Citation({ title, value }) {
  return (
    <div className="evidence-citation">
      <div>
        <strong>{title}</strong>
        <Badge variant={value.reference_complete ? "muted" : "warn"}>
          {value.reference_complete
            ? "Reference complete"
            : "Reference incomplete"}
        </Badge>
      </div>
      <dl>
        {[
          ["Document", value.document],
          ["Location", value.locator],
          ["Revision", value.revision],
        ].map(([label, text]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{text || "Not recorded"}</dd>
          </div>
        ))}
      </dl>
      <blockquote>
        {value.excerpt || "No supporting excerpt recorded."}
      </blockquote>
      <small>
        Completeness describes the recorded reference. Its accuracy has not been
        verified by a connector.
      </small>
    </div>
  );
}

export default function EvidenceReview({ item, dirty = false }) {
  if (!isCoordinationWork(item)) return null;
  const summary = evidenceSummary(item);
  const cadre = item.template_id === "CADRE_HANDOFF";
  return (
    <section
      className="ops-panel evidence-review"
      aria-label={
        cadre ? "Cadre coordination boundary" : "Evidence review summary"
      }
    >
      <div className="ops-panel-heading">
        <div>
          <span className="eyebrow">
            {cadre ? "CADRE HANDOFF" : "EVIDENCE & PROVENANCE"}
          </span>
          <h2>
            {cadre
              ? "Prepare the handoff. Keep the ownership clear."
              : "A finding needs its source."}
          </h2>
          <p>
            {dirty
              ? "Unsaved view. Export uses the saved revision."
              : "Recorded observations from this saved work item."}
          </p>
        </div>
        {cadre ? <ArrowUpRight size={22} /> : <FileSearch size={22} />}
      </div>
      {cadre ? (
        <div className="evidence-review-body">
          <div className="evidence-summary-line">
            <span>
              Handoff: <b>{item.data?.handoff_status || "Unknown"}</b>
            </span>
            <span>
              Report: <b>{item.data?.report_status || "Unknown"}</b>
            </span>
            <span>
              Observed: <b>{item.data?.observed_on || "Not recorded"}</b>
            </span>
          </div>
          <div className="evidence-boundary">
            <ShieldCheck size={18} />
            <p>
              Cadre owns processing and report generation. This Hub record
              coordinates the packet, open questions, and receipt evidence.
              Completing it does not confirm processing completion or condition
              clearance.
            </p>
          </div>
          <p className="hint">
            Report and receipt states are entered by a person. No live Cadre
            connection verifies them.
          </p>
        </div>
      ) : (
        <div className="evidence-review-body">
          {summary.legacy ? (
            <div className="evidence-boundary">
              <ShieldCheck size={18} />
              <p>
                This record keeps its original template. New evidence fields are
                not inferred or inserted into historical work. Start a
                current-version follow-up when a structured evidence record is
                needed.
              </p>
            </div>
          ) : (
            <>
              <div className="evidence-summary-line">
                <Badge
                  variant={
                    summary.state === "Conflicting" ||
                    summary.state === "Missing"
                      ? "warn"
                      : "muted"
                  }
                >
                  {summary.state}
                </Badge>
                <span>
                  Applicability: <b>{summary.applicability}</b>
                </span>
                <span>
                  Binding: <b>{item.data?.source_binding || "Unknown"}</b>
                </span>
              </div>
              <Citation title="Primary source" value={summary.citation} />
              {(summary.state === "Conflicting" ||
                summary.comparison.document) && (
                <>
                  <div className="evidence-comparison-label">
                    <GitCompareArrows size={16} /> Compared against
                  </div>
                  <Citation
                    title="Comparison source"
                    value={summary.comparison}
                  />
                </>
              )}
              {summary.notices.length > 0 && (
                <ul className="evidence-notices">
                  {summary.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              )}
              <p className="hint">
                Human review is required. This record never clears a condition
                in LendingPad or applies an investor rule.
              </p>
            </>
          )}
        </div>
      )}
      <div className="ops-panel-footer">
        <span>One finding · a named owner · a traceable response</span>
        <Link to="/evidence">
          Evidence desk <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
}
