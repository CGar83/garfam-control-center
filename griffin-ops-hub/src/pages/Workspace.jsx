import { Database, Link2, FileCheck2, Check, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { Surface, Badge } from "../components/ui.jsx";
const integrations = [
  {
    name: "Cadre processing",
    purpose:
      "Processing execution and reports; Hub coordinates evidence and handoffs",
    status: "Not connected",
    Icon: Link2,
  },
  {
    name: "HubSpot",
    purpose: "Contact and deal association with approved status summaries",
    status: "Not connected",
    Icon: Link2,
  },
  {
    name: "LendingPad / LOS Connector",
    purpose: "Funded-loan linkage and verified LIA attribution",
    status: "Not connected",
    Icon: Link2,
  },
  {
    name: "Guideline source review",
    purpose: "Investor limits, class alignment, and effective dates",
    status: "Review required",
    Icon: FileCheck2,
  },
  {
    name: "Google Workspace sign-in",
    purpose: "Named identities and assigned access",
    status: "Configuration required",
    Icon: Fingerprint,
  },
];
export default function Workspace() {
  const { db } = useAuth();
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">WORKSPACE / READINESS</div>
          <h1>Know what is connected.</h1>
          <p className="lede">
            An honest view of data, controls, and release dependencies.
          </p>
        </div>
        <Badge variant={db.mode === "local" ? "warn" : "ok"}>
          {db.mode === "local" ? "Local demo" : "Supabase configured"}
        </Badge>
      </div>
      <nav className="desk-chips" aria-label="Admin">
        <Link className="desk-chip on" to="/workspace">
          Workspace
        </Link>
        <Link className="desk-chip" to="/integrations">
          Connections
        </Link>
        <Link className="desk-chip" to="/activity">
          Activity
        </Link>
        <Link className="desk-chip" to="/admin/users">
          Users
        </Link>
      </nav>
      <div className="connection-summary">
        <div className="connection-mark">
          <Database size={30} />
        </div>
        <div>
          <h2>
            {db.mode === "local"
              ? "Your demo, isolated in this browser."
              : "A connected workspace."}
          </h2>
          <p>
            {db.mode === "local"
              ? "Explore workflows with fictional data. Records persist on this device until you reset the demo."
              : "This build points to Supabase. Connection configuration alone does not verify production readiness."}
          </p>
        </div>
        <span className="connection-tag">
          {db.mode === "local" ? "NO REMOTE WRITES" : "BACKEND CONFIGURED"}
        </span>
      </div>
      <div className="readiness-grid">
        <Surface
          title="Connections"
          kicker="Status is based on this build’s configuration."
        >
          <div className="connection-row">
            <Database size={20} />
            <div>
              <strong>Worksheet and work-item storage</strong>
              <p>
                {db.mode === "local"
                  ? "Browser local storage"
                  : "Supabase Auth and Postgres"}
              </p>
            </div>
            <Badge variant={db.mode === "local" ? "muted" : "ok"}>
              {db.mode === "local" ? "Local only" : "Configured"}
            </Badge>
          </div>
          {integrations.map(({ name, purpose, status, Icon }) => (
            <div className="connection-row" key={name}>
              <Icon size={20} />
              <div>
                <strong>{name}</strong>
                <p>{purpose}</p>
              </div>
              <Badge variant="warn">
                {name === "Google Workspace sign-in" && db.mode !== "local"
                  ? "Verify configuration"
                  : status}
              </Badge>
            </div>
          ))}
        </Surface>
        <Surface
          title="Outcome measurement"
          kicker="Loan-linked work is one part of the attribution audit trail."
        >
          <div className="outcome-target">
            <span>LO productivity</span>
            <strong>5×</strong>
            <small>Strategic goal · no measured baseline connected</small>
          </div>
          <div className="outcome-target">
            <span>Application to funding</span>
            <strong>
              77.7%<small> faster</small>
            </strong>
            <small>Strategic goal · no funding events connected</small>
          </div>
          <p className="attribution-footnote">
            Workflow completion is not loan funding. The LIA usage field is a
            self-report, not verified attribution or proof of time saved.
          </p>
        </Surface>
      </div>
      <div className="readiness-grid">
        <Surface
          title="Release review"
          kicker="Complete these with the responsible human owners before live borrower use."
        >
          <ol className="release-list">
            <li>
              <span>01</span>
              <div>
                <strong>Validate worksheet and investor references</strong>
                <p>
                  Operations and Capital Markets confirm fields, program
                  classes, source documents, and effective dates.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Verify identity and row-level access</strong>
                <p>
                  Engineering validates the migrations, SSO, role assignments,
                  negative access tests, and account deactivation.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Connect the attribution audit layer</strong>
                <p>
                  The LOS Connector owner establishes loan identifiers, LIA
                  touchpoints, and funded-loan joins.
                </p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Run a controlled pilot</strong>
                <p>
                  Chris and Operations establish baseline handling time, monitor
                  returns, and verify backups and recovery.
                </p>
              </div>
            </li>
          </ol>
        </Surface>
        <Surface title="Module availability">
          <div className="module-row">
            <Check size={18} />
            <div>
              <strong>DSCR submission worksheets</strong>
              <p>Named handoffs, field verification, and audit history</p>
            </div>
            <Badge variant="ok">Built</Badge>
          </div>
          {[
            "CD preparation and closing coordination",
            "LO preparation and submission handoff dossiers",
            "Condition and exception evidence follow-up",
            "Cadre handoff coordination",
          ].map((n) => (
            <div className="module-row" key={n}>
              <Check size={18} />
              <div>
                <strong>{n}</strong>
                <p>
                  Native coordination workflow; source-policy review required
                </p>
              </div>
              <Badge variant="ok">Built</Badge>
            </div>
          ))}
          <p className="attribution-footnote">
            Cadre processing, disclosure issuance, and live vendor APIs are
            external to these workflows. TRID dates, credit eligibility, and
            investor decisions are not determined by this workspace.
          </p>
        </Surface>
      </div>
    </>
  );
}
