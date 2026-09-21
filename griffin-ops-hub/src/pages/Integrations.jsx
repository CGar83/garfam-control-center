import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Download,
  Link2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  CONNECTORS,
  FIELD_AUTHORITY,
  EVENT_EXAMPLE,
} from "../data/integrationContracts.js";
import { Badge, Button, PageHeader } from "../components/ui.jsx";

export default function Integrations() {
  const [selected, setSelected] = useState("lendingpad");
  const connector = CONNECTORS.find((c) => c.id === selected);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              notice:
                "Internal draft contract. Not a vendor API schema or a live connection.",
              connectors: CONNECTORS,
              field_authority: FIELD_AUTHORITY,
              sample_event: EVENT_EXAMPLE,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "griffin-integration-contract-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="System connections"
        title="One loan. Clear authority."
        lede="Connect the right context to the right team. The Hub coordinates the work; each source system keeps ownership of its records."
      >
        <Button variant="outline" onClick={download}>
          <Download size={16} />
          Download mapping draft
        </Button>
      </PageHeader>
      <div className="ops-integration-banner">
        <LockKeyhole size={22} />
        <div>
          <strong>No live systems connected</strong>
          <p>
            These are integration contracts and release requirements.
            Credentials are never collected in this browser, and no external
            loan or CRM action is being sent.
          </p>
        </div>
        <Badge variant="warn">Implementation pending</Badge>
      </div>
      <div className="ops-connector-grid">
        {CONNECTORS.map((c) => (
          <button
            key={c.id}
            className={`ops-connector-tile ${selected === c.id ? "selected" : ""}`}
            onClick={() => setSelected(c.id)}
            aria-pressed={selected === c.id}
          >
            <div>
              <span className={`ops-system-logo ${c.color}`}>{c.initials}</span>
              <Badge>{c.status}</Badge>
            </div>
            <h2>{c.name}</h2>
            <p>{c.kind}</p>
            <span>
              Review contract <ChevronRight size={16} />
            </span>
          </button>
        ))}
      </div>
      <section className="ops-panel ops-contract">
        <div className="ops-panel-heading">
          <div>
            <span className="eyebrow">Connection contract · draft</span>
            <h2>{connector.name}</h2>
            <p>{connector.description}</p>
          </div>
          <Link2 size={24} />
        </div>
        <div className="ops-contract-columns">
          <div>
            <h3>Read from source</h3>
            {connector.read.map((t) => (
              <p key={t}>
                <ArrowRight size={15} />
                {t}
              </p>
            ))}
            <h3>Proposed outbound scope</h3>
            {connector.write.map((t) => (
              <p key={t}>
                <ArrowRight size={15} />
                {t}
              </p>
            ))}
          </div>
          <div>
            <h3>Before this connection goes live</h3>
            {connector.gates.map((t, i) => (
              <div className="ops-contract-gate" key={t}>
                <span>{i + 1}</span>
                <p>{t}</p>
                <Badge>Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ops-panel ops-authority">
        <div className="ops-panel-heading">
          <div>
            <span className="eyebrow">Source of truth</span>
            <h2>Prevent competing records.</h2>
          </div>
          <ShieldCheck size={23} />
        </div>
        <div
          className="ops-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="System authority comparison"
        >
          <table className="ops-table">
            <thead>
              <tr>
                <th>Data domain</th>
                <th>Authority</th>
                <th>Hub responsibility</th>
                <th>Outbound boundary</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_AUTHORITY.map((r) => (
                <tr key={r.domain}>
                  <td>
                    <strong>{r.domain}</strong>
                  </td>
                  <td>{r.owner}</td>
                  <td>{r.hub}</td>
                  <td>{r.outbound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ops-panel ops-contract">
        <div className="ops-panel-heading">
          <div>
            <span className="eyebrow">Engineering handoff</span>
            <h2>Every event needs a trace.</h2>
            <p>
              Illustrative internal envelope. Actual vendor payloads require
              approved mappings.
            </p>
          </div>
          <Code2 size={24} />
        </div>
        <div className="ops-contract-columns">
          <pre className="ops-code">
            {JSON.stringify(EVENT_EXAMPLE, null, 2)}
          </pre>
          <div className="ops-event-rules">
            {[
              "Authenticate before accepting events",
              "Bind source loan ID to an authorized Hub record",
              "Deduplicate on source, environment, and event ID",
              "Reject incompatible or unrecognized payloads",
              "Reconcile out-of-order events without overwriting source truth",
              "Retain failures for named-owner review; never mark a failed sync complete",
            ].map((t) => (
              <p key={t}>
                <Check size={16} />
                {t}
              </p>
            ))}
            <p className="ops-muted">
              Server contract validation lives in the source package. No vendor
              endpoint, secret store, transport, or live event processor is
              configured.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
