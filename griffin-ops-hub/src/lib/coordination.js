export const COORDINATION_TEMPLATES = Object.freeze([
  "CONDITION_FOLLOWUP",
  "EXCEPTION_REVIEW",
  "CADRE_HANDOFF",
]);
const STATES = new Set([
  "Unknown",
  "Missing",
  "Received, not reviewed",
  "Conflicting",
  "Reviewed",
]);
const text = (value) => (typeof value === "string" ? value.trim() : "");
export const isCoordinationWork = (item) =>
  COORDINATION_TEMPLATES.includes(item?.template_id);

export function sourceCitation(data = {}, prefix = "source") {
  const citation = Object.fromEntries(
    ["document", "locator", "excerpt", "revision"].map((key) => [
      key,
      text(data[`${prefix}_${key}`]) || null,
    ]),
  );
  return {
    ...citation,
    reference_complete: Object.values(citation).every(Boolean),
    verified_by_connector: false,
  };
}

// These summarize human-entered observations. They never derive investor rules,
// clear conditions, verify citations, or turn absent information into false.
export function evidenceSummary(item = {}) {
  const data = item.data || {};
  const state = STATES.has(data.evidence_state)
    ? data.evidence_state
    : "Unknown";
  const applicability = ["Applies", "Does not apply"].includes(
    data.applicability,
  )
    ? data.applicability
    : "Unknown";
  const citation = sourceCitation(data),
    comparison = sourceCitation(data, "comparison");
  const notices = [];
  if (state === "Missing")
    notices.push(
      "Missing evidence is an open follow-up, not a failed loan decision.",
    );
  if (state === "Unknown" || state === "Received, not reviewed")
    notices.push("Evidence has not been recorded as reviewed.");
  if (state === "Conflicting")
    notices.push(
      "Keep both sources visible. A named human must resolve the conflict.",
    );
  if (applicability === "Unknown")
    notices.push(
      "Applicability is unknown. No requirement has been ruled out.",
    );
  if (data.source_binding !== "Matched")
    notices.push(
      data.source_binding === "Mismatch"
        ? "The recorded source binding does not match. Resolve identity before relying on this evidence."
        : "Loan and property binding have not been confirmed.",
    );
  if (!citation.reference_complete)
    notices.push(
      "The primary source reference is incomplete. A document name alone is not a citation.",
    );
  if (state === "Conflicting" && !comparison.reference_complete)
    notices.push(
      "The comparison source needs its document, location, excerpt, and revision.",
    );
  if (["Ops opinion", "Observed example"].includes(data.requirement_kind))
    notices.push(
      "Operational opinion and observed examples do not establish an investor requirement.",
    );
  return {
    state,
    applicability,
    citation,
    comparison,
    notices,
    legacy:
      Number(item.template_version || item.template_snapshot?.version || 1) <
        2 && item.template_id !== "CADRE_HANDOFF",
  };
}

export function coordinationCounts(items = []) {
  const records = [
    ...new Map(
      items.filter(isCoordinationWork).map((item) => [item.id, item]),
    ).values(),
  ];
  const active = records.filter(
    (item) => !["COMPLETE", "CANCELLED"].includes(item.status),
  );
  const evidence = active.filter(
    (item) => item.template_id !== "CADRE_HANDOFF",
  );
  return {
    total: records.length,
    active: active.length,
    unresolved: evidence.filter((item) =>
      ["Unknown", "Missing", "Received, not reviewed"].includes(
        evidenceSummary(item).state,
      ),
    ).length,
    conflicting: evidence.filter(
      (item) => evidenceSummary(item).state === "Conflicting",
    ).length,
    cadre: active.filter(
      (item) =>
        item.template_id === "CADRE_HANDOFF" ||
        item.data?.disposition === "Escalated to Cadre",
    ).length,
  };
}

export function buildCoordinationPacket(item) {
  if (
    !isCoordinationWork(item) ||
    !item.id ||
    !item.updated_at ||
    !item.template_snapshot?.sections
  )
    throw new Error(
      "A saved coordination record and pinned template are required.",
    );
  const keys = item.template_snapshot.sections.flatMap((section) =>
    section.fields.map((field) => field.key),
  );
  const recordedValues = Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(item.data || {}, key))
      .map((key) => [key, item.data[key]]),
  );
  return {
    schema: "griffin.hub.coordination.v1",
    purpose:
      "Human review and external handoff preparation. Not a Cadre API request or a loan decision.",
    packet_id: `${item.id}:${item.updated_at}`,
    synthetic: item.synthetic === true,
    sample_notice:
      item.synthetic === true
        ? "FICTIONAL DEMONSTRATION. No actual human review, external receipt, or loan outcome."
        : null,
    loan_number: item.loan_number,
    source_loan_binding_verified_by_connector: false,
    work: {
      id: item.id,
      title: item.title,
      status: item.status,
      department: item.department,
      owner_id: item.owner_id || null,
      saved_revision: item.updated_at,
    },
    template: { id: item.template_id, version: item.template_version },
    provenance: {
      source: item.template_snapshot.source || null,
      source_status:
        item.template_snapshot.source_status || "UNVERIFIED_REFERENCE",
      boundary: item.template_snapshot.boundary || null,
      metadata: Object.fromEntries(
        [
          "field_count",
          "assessment_disposition",
          "reference_archive_sha256",
          "reference_sources",
        ]
          .filter((key) =>
            Object.hasOwn(item.template_snapshot.source_metadata || {}, key),
          )
          .map((key) => [
            key,
            structuredClone(item.template_snapshot.source_metadata[key]),
          ]),
      ),
    },
    recorded_values: structuredClone(recordedValues),
    acknowledgments: structuredClone(item.checks || {}),
    citation_metadata:
      item.template_id === "CADRE_HANDOFF"
        ? null
        : {
            primary: sourceCitation(item.data),
            comparison: sourceCitation(item.data, "comparison"),
          },
    delivery: {
      sent_by_hub: false,
      external_receipt_verified_by_connector: false,
    },
    attribution: {
      source: "manually recorded references",
      verified_lia_touchpoint: null,
      funded_loan_join: null,
      measured_time_saved: null,
    },
  };
}

export function downloadCoordinationPacket(item) {
  const packet = buildCoordinationPacket(item);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `griffin-coordination-${String(item.loan_number).replace(/[^a-zA-Z0-9-]/g, "_")}-${item.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
