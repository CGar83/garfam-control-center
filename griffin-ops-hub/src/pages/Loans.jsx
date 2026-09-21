import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FilePlus2,
  ArrowUpRight,
  Download,
  Folders,
} from "lucide-react";
import { useAuth, useAsync } from "../lib/auth.jsx";
import { StageBadge, Button, LoadState, fmtDate } from "../components/ui.jsx";
import { downloadCsv } from "../lib/reports.js";
import { STAGE_ORDER, STAGE_LABEL } from "../lib/stages.js";
export default function Loans() {
  const { db, profile } = useAuth(),
    [q, setQ] = useState(""),
    [stage, setStage] = useState("");
  const [b, reload, loading, error] = useAsync(async () => {
    const [loans, profiles] = await Promise.all([
      db.listLoans(),
      db.listProfiles(),
    ]);
    return {
      loans,
      names: Object.fromEntries(profiles.map((p) => [p.id, p.full_name])),
    };
  }, [db, profile?.id]);
  if (loading || error)
    return <LoadState loading={loading} error={error} onRetry={reload} />;
  const rows = b.loans.filter(
    (l) =>
      (!stage || l.current_stage === stage) &&
      `${l.loan_number} ${l.borrower_last} ${b.names[l.lo_id]}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">WORKSPACE / LOAN RECORDS</div>
          <h1>One loan. One record.</h1>
          <p className="lede">
            Worksheets, operations work, owners, and handoff history connected
            by loan number.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "griffin-loans.csv",
              rows.map((l) => ({
                loan: l.loan_number,
                borrower: l.borrower_last,
                product: l.product_type,
                stage: STAGE_LABEL[l.current_stage],
                lo: b.names[l.lo_id] || "Unassigned",
                lock_date: l.lock_date || "",
              })),
            )
          }
        >
          <Download />
          Export loans
        </Button>
      </div>
      <section className="queue-panel">
        <div className="queue-toolbar">
          <div className="input-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search loans"
              placeholder="Search loan number, borrower, or LO…"
            />
          </div>
          <select
            className="sort-select"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            aria-label="Filter loans by stage"
          >
            <option value="">All stages</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {!rows.length ? (
          <div className="workspace-empty">
            <Folders size={30} />
            <h2>
              {b.loans.length
                ? "No matching loans"
                : "Your loan records will live here"}
            </h2>
            <p>
              {b.loans.length
                ? "Try another search or stage."
                : "Start a loan-linked workflow to create the first record."}
            </p>
            {!b.loans.length && (
              <Button to="/workflows" variant="brand">
                <FilePlus2 />
                Browse workflows
              </Button>
            )}
          </div>
        ) : (
          <div className="tw">
            <table className="t queue-table">
              <thead>
                <tr>
                  <th>Loan / borrower</th>
                  <th>Product</th>
                  <th>Submission stage</th>
                  <th>Loan officer</th>
                  <th>Lock date</th>
                  <th>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.loan_number}>
                    <td>
                      <Link
                        className="loan-title"
                        to={`/loans/${encodeURIComponent(l.loan_number)}`}
                      >
                        {l.borrower_last || "Unnamed"}
                        <ArrowUpRight size={12} />
                      </Link>
                      <span className="loan-caption">#{l.loan_number}</span>
                    </td>
                    <td>{l.product_type || "—"}</td>
                    <td>
                      <StageBadge stage={l.current_stage} />
                    </td>
                    <td>
                      {b.names[l.lo_id]?.replace("Demo ", "") || "Unassigned"}
                    </td>
                    <td className="mono">{l.lock_date || "Not recorded"}</td>
                    <td className="muted">{fmtDate(l.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>{rows.length} loan records</span>
          <span>Access follows your assigned role</span>
        </div>
      </section>
    </>
  );
}
