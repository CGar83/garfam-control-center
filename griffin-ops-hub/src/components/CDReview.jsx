import { useState } from "react";
import { Copy, FileText } from "lucide-react";
import { Button } from "./ui.jsx";
import {
  templateById,
  WORK_STATUS_LABEL,
  workReviewItems,
} from "../lib/operations.js";

// The recipient-specific subsets come from Operations A. Recipient addresses
// and simulated submission claims are intentionally not carried into drafts.
const ROUTES = [
  {
    id: "closing",
    name: "Closing team",
    purpose: "CD request review",
    fields: [
      "loanNumber",
      "borrowerName",
      "coBorrowerName",
      "requestedBy",
      "closingDate",
      "disbursementDate",
      "firstPayment",
    ],
  },
  {
    id: "lock",
    name: "Lock Desk",
    purpose: "Pricing and lock review",
    fields: [
      "loanNumber",
      "lienPosition",
      "borrowerName",
      "requestedBy",
      "amountMatch",
      "rateMatch",
      "appraisedValue",
      "closingDate",
    ],
  },
];

export function buildCDDraft(item, target, { dirty = false } = {}) {
  const route = ROUTES.find((candidate) => candidate.id === target);
  if (!route) throw new Error("Unknown CD draft recipient group.");
  const template = item.template_snapshot || templateById(item.template_id);
  const fields = new Map(
    (template?.sections || [])
      .flatMap((section) => section.fields)
      .map((field) => [field.key, field]),
  );
  const data = item.data || {};
  const revision = item.updated_at || item.revision || "Not recorded";
  const value = (key) => {
    const raw = data[key];
    if (raw == null || String(raw).trim() === "") return "Not recorded";
    return fields.get(key)?.optionLabels?.[raw] || String(raw);
  };
  const flags = workReviewItems(item);
  const mismatch =
    data.loanNumber &&
    item.loan_number &&
    String(data.loanNumber).trim() !== String(item.loan_number).trim();
  return [
    `${dirty ? "UNSAVED " : ""}NOTIFICATION DRAFT - ${route.name}`,
    ...(item.synthetic || item.sample
      ? [
          "FICTIONAL DEMONSTRATION: No actual human review or loan outcome. Seeded entries are examples only.",
        ]
      : []),
    "Recipient: Not configured. Workspace owner must confirm the recipient list.",
    "Delivery: Not sent. Copying this draft does not send a message.",
    `Subject: CD request review - ${item.loan_number || "loan not recorded"}`,
    "",
    `Purpose: ${route.purpose}. Human review is required before delivery.`,
    "This draft does not confirm disclosure preparation, issuance, borrower receipt, or approval.",
    "",
    `Work record: ${item.id || "Not saved"}`,
    `Linked loan number: ${item.loan_number || "Not recorded"}`,
    `Work status: ${WORK_STATUS_LABEL[item.status] || item.status || "Not recorded"}`,
    `Template: ${template?.title || "CD Request"} v${item.template_version ?? template?.version ?? "unknown"}`,
    dirty
      ? `Revision: Unsaved edits based on saved revision ${revision}. Save and review before delivery.`
      : `Saved revision: ${revision}`,
    ...(mismatch
      ? [
          "REVIEW: The entered loan number differs from the linked loan number. Resolve before delivery.",
        ]
      : []),
    "",
    ...route.fields.map(
      (key) => `${fields.get(key)?.label || key}: ${value(key)}`,
    ),
    "",
    "Items for human review:",
    ...(flags.length
      ? flags.map((flag) => `- ${flag.label}`)
      : [
          "No source review prompts are currently triggered. This is not a clearance or compliance determination.",
        ]),
    "",
    `Additional context: ${value("other")}`,
    "",
    "Dates and answers above are entered values. No regulatory timing or loan eligibility calculation has been performed.",
  ].join("\n");
}

export default function CDReview({ item, dirty = false }) {
  const [feedback, setFeedback] = useState(null);
  if (item?.template_id !== "CD_REQUEST") return null;
  const copy = async (route, draft) => {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(draft);
      setFeedback({
        message: `${route.name} draft copied. No message was sent.`,
        error: false,
      });
    } catch {
      setFeedback({
        message:
          "Clipboard is unavailable. Select and copy the visible draft text below.",
        error: true,
      });
    }
  };
  return (
    <section className="ops-panel" aria-labelledby="cd-drafts-title">
      <div className="ops-panel-heading">
        <div>
          <h2 id="cd-drafts-title">
            <FileText size={18} aria-hidden="true" /> Notification drafts
          </h2>
          <p>
            Recipients are not configured. The workspace owner governs recipient
            lists and delivery.
          </p>
        </div>
        <span className={`tag ${dirty ? "warning" : ""}`}>
          {dirty ? "Includes unsaved edits" : "Saved record"}
        </span>
      </div>
      <div className="ops-field-panel">
        <p>
          Review these drafts before sharing through your approved channel.
          Copying records no delivery event. A CD request does not confirm that
          a disclosure was prepared, issued, or received.
        </p>
        {(item.synthetic || item.sample) && (
          <p role="note">
            <strong>Fictional demonstration.</strong> No actual human review or
            loan outcome. Copied drafts retain this label.
          </p>
        )}
        {dirty && (
          <p role="note">
            <strong>Unsaved draft.</strong> Save the work item and review the
            saved revision before delivery.
          </p>
        )}
        {feedback && (
          <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>
        )}
        {ROUTES.map((route) => {
          const draft = buildCDDraft(item, route.id, { dirty });
          return (
            <details key={route.id} className="template-section" open>
              <summary>
                {route.name} · {route.purpose}
              </summary>
              <label className="lbl" htmlFor={`cd-draft-${route.id}`}>
                {route.name} draft text
              </label>
              <textarea
                id={`cd-draft-${route.id}`}
                className="ta ops-draft-text"
                value={draft}
                readOnly
                rows={14}
                spellCheck={false}
              />
              <Button onClick={() => copy(route, draft)}>
                <Copy size={14} /> Copy {route.name} draft
              </Button>
            </details>
          );
        })}
      </div>
    </section>
  );
}
