import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FileCheck2, Layers3 } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import {
  PageHeader,
  Surface,
  Label,
  Input,
  Button,
  Callout,
  Badge,
} from "../components/ui.jsx";
import { FT } from "../data/investors.js";

const READY = ["DSCR"];

export default function NewWorksheet() {
  const { db } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [ln, setLn] = useState(params.get("loan") || "");
  const [cln, setCln] = useState("");
  const [ft, setFt] = useState("DSCR");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inFlight = useRef(false);

  const create = async (event) => {
    event?.preventDefault();
    if (inFlight.current) return;
    setErr("");
    if (!ln.trim())
      return setErr("Enter a loan number to start the worksheet.");
    if (!READY.includes(ft))
      return setErr("This product worksheet is not configured yet.");
    inFlight.current = true;
    setBusy(true);
    try {
      const existing = await db.listWorksheets({ loanNumber: ln.trim() });
      const open = existing.find(
        (w) => w.form_type === ft && w.stage !== "COMPLETE",
      );
      if (open) {
        nav(`/worksheets/${open.id}`);
        return;
      }
      const ws = await db.createWorksheet({
        loanNumber: ln.trim(),
        formType: ft,
        borrowerLast: cln.trim(),
      });
      nav(`/worksheets/${ws.id}`);
    } catch (failure) {
      setErr(
        failure.message ||
          "The worksheet could not be created. Your entries are still here. Try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Submission workspace"
        title="Start with one loan."
        lede="Create a shared worksheet for the handoff from loan officer to MLP to Processing. Each field, verification, and handoff stays with the loan."
      />
      <div className="new-worksheet-layout">
        <Surface
          title="Create a worksheet"
          kicker="An existing open worksheet for this loan and product opens automatically."
          className="enter-up d2"
        >
          <form onSubmit={create}>
            <fieldset disabled={busy} className="worksheet-fieldset">
              <div className="g2">
                <div>
                  <Label htmlFor="new-loan-number" required>
                    Loan number
                  </Label>
                  <Input
                    id="new-loan-number"
                    value={ln}
                    onChange={setLn}
                    autoFocus
                    autoComplete="off"
                    placeholder="LendingPad loan number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-borrower">
                    Client last name{" "}
                    <span className="faint">(optional for draft)</span>
                  </Label>
                  <Input
                    id="new-borrower"
                    value={cln}
                    onChange={setCln}
                    autoComplete="off"
                    placeholder="Enter last name"
                  />
                </div>
                <div className="span2">
                  <Label required>Product type</Label>
                  <div
                    className="product-options"
                    role="radiogroup"
                    aria-label="Product type"
                  >
                    {Object.entries(FT).map(([key, product]) => {
                      const ready = READY.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={ft === key}
                          disabled={!ready || busy}
                          className={
                            "product-option" + (ft === key ? " selected" : "")
                          }
                          onClick={() => setFt(key)}
                        >
                          <Layers3 size={18} />
                          <span>
                            <b>{product.l}</b>
                            <small>{product.d}</small>
                          </span>
                          <Badge variant={ready ? "ok" : "muted"}>
                            {ready ? "Available" : "Coming later"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {err && (
                  <div className="span2">
                    <Callout type="restriction" title="Worksheet not created">
                      {err}
                    </Callout>
                  </div>
                )}
                <div className="span2 actions row">
                  <Button type="submit" variant="brand" disabled={busy}>
                    {busy ? "Opening worksheet…" : "Create worksheet"}
                    <ArrowRight size={16} />
                  </Button>
                  <Button variant="ghost" to="/">
                    Cancel
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </Surface>
        <aside className="stack">
          <Surface title="One record. Clear ownership.">
            <div className="new-worksheet-step">
              <span>01</span>
              <div>
                <b>Capture the file</b>
                <p>
                  Required fields follow the selected product and the answers
                  entered.
                </p>
              </div>
            </div>
            <div className="new-worksheet-step">
              <span>02</span>
              <div>
                <b>Review the handoff</b>
                <p>
                  MLP verification records who reviewed each field and when.
                </p>
              </div>
            </div>
            <div className="new-worksheet-step">
              <span>03</span>
              <div>
                <b>Keep the evidence</b>
                <p>
                  Changes and stage transitions appear in the loan activity
                  history.
                </p>
              </div>
            </div>
          </Surface>
          <Callout
            type="info"
            title={
              <>
                <FileCheck2 size={16} /> Workflow reference
              </>
            }
          >
            DSCR is the configured worksheet. Imported investor references are
            not verified as current. A human underwriter must review applicable
            requirements.
          </Callout>
        </aside>
      </div>
    </>
  );
}
