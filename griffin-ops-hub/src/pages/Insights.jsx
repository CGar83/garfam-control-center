import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import OperationsInsights from "./OperationsInsights.jsx";
import Reports from "./Reports.jsx";

export default function Insights() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const canSubmissions = ["MLP", "PROCESSOR", "MANAGER", "ADMIN"].includes(
    profile?.role,
  );
  const view =
    params.get("view") === "submissions" && canSubmissions
      ? "submissions"
      : "operations";
  const setView = (next) => {
    const copy = new URLSearchParams(params);
    if (next === "operations") copy.delete("view");
    else copy.set("view", next);
    setParams(copy, { replace: true });
  };
  return (
    <>
      <div className="report-tabs ia-tabs" role="tablist" aria-label="Insights">
        <button
          type="button"
          role="tab"
          aria-selected={view === "operations"}
          className={view === "operations" ? "active" : ""}
          onClick={() => setView("operations")}
        >
          Work metrics
        </button>
        {canSubmissions && (
          <button
            type="button"
            role="tab"
            aria-selected={view === "submissions"}
            className={view === "submissions" ? "active" : ""}
            onClick={() => setView("submissions")}
          >
            Submission metrics
          </button>
        )}
      </div>
      {view === "submissions" ? <Reports /> : <OperationsInsights />}
    </>
  );
}
