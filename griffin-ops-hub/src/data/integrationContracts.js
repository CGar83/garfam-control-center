export const FIELD_AUTHORITY = [
  {
    domain: "Loan identity & loan facts",
    owner: "LendingPad",
    hub: "Referenced, with source ID and observed timestamp",
    outbound: "No overwrite from a worksheet",
  },
  {
    domain: "Disclosures, credit decisions & funding",
    owner: "LendingPad / designated authoritative provider",
    hub: "Preparation tasks and recorded evidence only",
    outbound: "Restricted to explicitly approved vendor operations",
  },
  {
    domain: "Contacts, deal associations & communication preferences",
    owner: "HubSpot",
    hub: "Minimal operational context, joined by stable IDs",
    outbound: "Approved task summaries and associations only",
  },
  {
    domain: "Processing analysis & file-health reports",
    owner: "Cadre processing · planned build owner",
    hub: "Prepare handoffs and coordinate human review of source findings",
    outbound: "No processing commands or source report changes configured",
  },
  {
    domain: "Work ownership, checklists & exceptions",
    owner: "Operations Hub",
    hub: "Authoritative work item revision and audit history",
    outbound: "Idempotent status summaries after connector review",
  },
  {
    domain: "LIA touches linked to funded loans",
    owner: "LOS Connector audit layer",
    hub: "Reconciled source events and coverage denominators",
    outbound: "Analytics only after identity and event validation",
  },
];

export const CONNECTORS = [
  {
    id: "lendingpad",
    name: "LendingPad",
    initials: "LP",
    kind: "Loan system of record",
    color: "blue",
    status: "Not connected",
    description:
      "Bring in loan identity, assigned team, and source milestones. Keep authoritative loan actions in the approved LOS workflow.",
    read: [
      "Stable loan ID and loan number",
      "Assigned users and permitted loan facts",
      "Application, stage, and funding source events",
    ],
    write: [
      "Work-summary or evidence references, only if the approved API supports them",
    ],
    gates: [
      "Obtain current vendor API documentation and sandbox access",
      "Confirm licensed capabilities, permitted data, and actual endpoints",
      "Approve field authority, scopes, and loan-to-Hub access mapping",
      "Verify webhook authentication or approved polling strategy",
      "Test reconciliation, duplicate events, replay, and disconnect behavior",
    ],
  },
  {
    id: "cadre",
    name: "Cadre processing",
    initials: "CA",
    kind: "Processing build · delivery state unverified",
    color: "blue",
    status: "Not connected",
    description:
      "The workspace owner identifies Cadre as the processing build owner. Current implementation and delivery are unverified. The Hub prepares handoffs and tracks evidence follow-up; this card is a proposed boundary, not a live interface.",
    read: [
      "Proposed report, run, and finding references with source-observed status",
      "Proposed document locations, evidence states, and rubric provenance",
      "Proposed revision and failure details; unsupported or stale results stay visible",
    ],
    write: [
      "Proposed minimal handoff context and human review receipts, only after an agreed contract",
      "No automatic condition clearance, borrower message, ordering, or LOS action",
    ],
    gates: [
      "Obtain Cadre's current implementation evidence and accepted delivery scope",
      "Agree the actual payload, authentication, endpoints, loan binding, and permissions",
      "Separate missing, held, conflicting, and human-review evidence; unknown is not false",
      "Verify document location, source version, human disposition, and replay behavior",
      "Keep unsigned overrides and imported investor rules inactive; test deidentified cases",
      "Distinguish a Cadre report reference from verified LIA and funded-loan attribution",
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    initials: "HS",
    kind: "Relationship & communication context",
    color: "orange",
    status: "Not connected",
    description:
      "Join contacts and deals to the correct loan. Give relationship teams a concise operational status without copying an entire loan file into CRM.",
    read: [
      "Approved contact and deal IDs",
      "Contact/deal associations",
      "Authorized operational context and preferences",
    ],
    write: [
      "Approved task, note, or status summary against a verified association",
    ],
    gates: [
      "Choose the app and authentication model for the approved account",
      "Approve minimal CRM scopes and property allowlist",
      "Verify the signature method for the selected webhook product",
      "Test association collisions and stale-property conflicts",
      "Prove retry, deduplication, consent, and deletion handling",
    ],
  },
  {
    id: "lia",
    name: "LIA attribution",
    initials: "LIA",
    kind: "Outcome evidence",
    color: "red",
    status: "Not connected",
    description:
      "Join LIA sessions and touchpoints to application and funding events through the LOS Connector. Report unknown coverage rather than inferred success.",
    read: [
      "Stable LIA session and touchpoint IDs",
      "Source event IDs, actors, and timestamps",
      "Verified loan join and application/funding events",
    ],
    write: ["Reconciled audit events for measurement"],
    gates: [
      "Agree the canonical loan key across the participating systems",
      "Define touchpoint event schema and replay rules",
      "Reconcile a known source sample against funded-loan records",
      "Define baseline, cohort, attribution coverage, and exclusions",
      "Verify self-reported handling time remains distinct from measured savings",
    ],
  },
];

export const EVENT_EXAMPLE = {
  contract_version: 1,
  environment: "sandbox",
  source_system: "lendingpad",
  source_event_id: "example-event-0001",
  event_type: "loan.milestone_observed",
  source_loan_id: "example-source-loan-id",
  hub_loan_number: "EXAMPLE-1042806",
  occurred_at: "2026-09-19T16:00:00.000Z",
  observed_at: "2026-09-19T16:01:00.000Z",
  correlation_id: "example-correlation-id",
  payload: { milestone: "vendor_value_requires_mapping" },
};
