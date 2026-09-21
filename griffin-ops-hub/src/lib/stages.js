import { completeness, verification } from "./schema.js";

// Stage machine for worksheets. The Postgres function transition_worksheet() enforces the same table.
// Keep the two in sync: supabase/migrations/001_init.sql seeds allowed_transitions from this list.

export const ROLES = [
  "LO",
  "LOA",
  "MLP",
  "PROCESSOR",
  "LOCK_DESK",
  "CLOSING",
  "MANAGER",
  "ADMIN",
  "PENDING",
];

export const STAGES = {
  DRAFT: "DRAFT",
  LO_SUBMITTED: "LO_SUBMITTED",
  MLP_REVIEW: "MLP_REVIEW",
  RETURNED_TO_LO: "RETURNED_TO_LO",
  MLP_VERIFIED: "MLP_VERIFIED",
  SUBMITTED_TO_PROCESSING: "SUBMITTED_TO_PROCESSING",
  PROCESSING_ACCEPTED: "PROCESSING_ACCEPTED",
  RETURNED_TO_MLP: "RETURNED_TO_MLP",
  COMPLETE: "COMPLETE",
};

export const STAGE_LABEL = {
  DRAFT: "Draft (LO)",
  LO_SUBMITTED: "Submitted to MLP",
  MLP_REVIEW: "MLP Review",
  RETURNED_TO_LO: "Returned to LO",
  MLP_VERIFIED: "MLP Verified",
  SUBMITTED_TO_PROCESSING: "Submitted to Processing",
  PROCESSING_ACCEPTED: "Processing Accepted",
  RETURNED_TO_MLP: "Returned to MLP",
  COMPLETE: "Complete",
};

export const STAGE_ORDER = [
  "DRAFT",
  "LO_SUBMITTED",
  "MLP_REVIEW",
  "RETURNED_TO_LO",
  "MLP_VERIFIED",
  "SUBMITTED_TO_PROCESSING",
  "RETURNED_TO_MLP",
  "PROCESSING_ACCEPTED",
  "COMPLETE",
];

// Which role owns the pen at each stage.
export const STAGE_OWNER_ROLE = {
  DRAFT: "LO",
  RETURNED_TO_LO: "LO",
  LO_SUBMITTED: "MLP",
  MLP_REVIEW: "MLP",
  MLP_VERIFIED: "MLP",
  RETURNED_TO_MLP: "MLP",
  SUBMITTED_TO_PROCESSING: "PROCESSOR",
  PROCESSING_ACCEPTED: "PROCESSOR",
  COMPLETE: null,
};

// [from, to, roles, noteRequired, label]
export const TRANSITIONS = [
  ["DRAFT", "LO_SUBMITTED", ["LO", "LOA"], false, "Submit to MLP"],
  ["RETURNED_TO_LO", "LO_SUBMITTED", ["LO", "LOA"], false, "Resubmit to MLP"],
  ["LO_SUBMITTED", "MLP_REVIEW", ["MLP"], false, "Start review"],
  ["MLP_REVIEW", "RETURNED_TO_LO", ["MLP"], true, "Return to LO"],
  ["MLP_VERIFIED", "RETURNED_TO_LO", ["MLP"], true, "Return to LO"],
  ["MLP_REVIEW", "MLP_VERIFIED", ["MLP"], false, "Mark verified"],
  [
    "MLP_REVIEW",
    "SUBMITTED_TO_PROCESSING",
    ["MLP"],
    true,
    "Submit with override",
  ],
  [
    "MLP_VERIFIED",
    "SUBMITTED_TO_PROCESSING",
    ["MLP"],
    false,
    "Submit to Processing",
  ],
  [
    "RETURNED_TO_MLP",
    "SUBMITTED_TO_PROCESSING",
    ["MLP"],
    false,
    "Resubmit to Processing",
  ],
  ["RETURNED_TO_MLP", "RETURNED_TO_LO", ["MLP"], true, "Return to LO"],
  [
    "SUBMITTED_TO_PROCESSING",
    "PROCESSING_ACCEPTED",
    ["PROCESSOR"],
    false,
    "Accept file",
  ],
  [
    "SUBMITTED_TO_PROCESSING",
    "RETURNED_TO_MLP",
    ["PROCESSOR"],
    true,
    "Return to MLP",
  ],
  ["PROCESSING_ACCEPTED", "COMPLETE", ["PROCESSOR"], false, "Mark complete"],
  [
    "PROCESSING_ACCEPTED",
    "RETURNED_TO_MLP",
    ["PROCESSOR"],
    true,
    "Return to MLP",
  ],
];

export const OVERRIDE_ROLES = ["MANAGER", "ADMIN"];

export function isOverrideRole(role) {
  return OVERRIDE_ROLES.includes(role);
}

// Returns the list of transitions a role may take from a stage. Managers and admins get every stage with a note.
export function availableTransitions(fromStage, role) {
  if (isOverrideRole(role)) {
    return STAGE_ORDER.filter((s) => s !== fromStage).map((to) => ({
      to,
      noteRequired: true,
      label: `Override to ${STAGE_LABEL[to]}`,
      override: true,
    }));
  }
  return TRANSITIONS.filter(
    ([from, , roles]) => from === fromStage && roles.includes(role),
  ).map(([, to, , noteRequired, label]) => ({
    to,
    noteRequired,
    label,
    override: false,
  }));
}

export function canTransition(fromStage, toStage, role) {
  return availableTransitions(fromStage, role).some((t) => t.to === toStage);
}

// Editability rules. LO-owned fields are editable by the LO (or LOA) while the LO holds the pen.
// MLP-owned fields are editable by the MLP while the MLP holds the pen. Overrides may edit anything.
export function canEditField(field, role, stage) {
  if (isOverrideRole(role)) return true;
  const owner = field.owner || "LO";
  const penHolder = STAGE_OWNER_ROLE[stage];
  if (owner === "LO")
    return (role === "LO" || role === "LOA") && penHolder === "LO";
  if (owner === "MLP") return role === "MLP" && penHolder === "MLP";
  if (owner === "PROCESSOR")
    return role === "PROCESSOR" && penHolder === "PROCESSOR";
  return false;
}

// Verify checkboxes are for the MLP while the MLP holds the pen.
export function canVerifyField(field, role, stage) {
  const verifiable = field.verify !== false && (field.owner || "LO") === "LO";
  if (!verifiable) return false;
  if (isOverrideRole(role)) return true;
  return role === "MLP" && STAGE_OWNER_ROLE[stage] === "MLP";
}

export function isQueueStageForRole(stage, role) {
  if (isOverrideRole(role)) return stage !== "COMPLETE";
  if (role === "LO" || role === "LOA")
    return ["DRAFT", "RETURNED_TO_LO"].includes(stage);
  if (role === "MLP")
    return [
      "LO_SUBMITTED",
      "MLP_REVIEW",
      "MLP_VERIFIED",
      "RETURNED_TO_MLP",
    ].includes(stage);
  if (role === "PROCESSOR")
    return ["SUBMITTED_TO_PROCESSING", "PROCESSING_ACCEPTED"].includes(stage);
  return false;
}

// These are workflow completeness checks, never credit eligibility decisions.
// Server functions independently enforce the same policy against a pinned schema.
export function assertTransition({
  worksheet,
  toStage,
  note,
  role,
  schema,
  ctx,
}) {
  const transition = availableTransitions(worksheet.stage, role).find(
    (t) => t.to === toStage,
  );
  if (!transition)
    throw new Error(
      `Transition ${worksheet.stage} → ${toStage} is not allowed for ${role}`,
    );
  if (transition.noteRequired && !note?.trim())
    throw new Error("A note is required for this action");
  if (!schema?.sections?.length)
    throw new Error("The pinned worksheet schema is unavailable");
  // Manager/admin overrides remain explicit, attributed, and require a note.
  if (isOverrideRole(role)) return;
  const checkedCtx = {
    ...ctx,
    data: Object.fromEntries(
      Object.entries(ctx.data).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    ),
  };
  const lo = completeness(schema, checkedCtx, "LO");
  const mlp = completeness(schema, checkedCtx, "MLP");
  if (
    ["LO_SUBMITTED", "MLP_VERIFIED", "SUBMITTED_TO_PROCESSING"].includes(
      toStage,
    ) &&
    lo.missing.length
  )
    throw new Error(`${lo.missing.length} required LO fields are missing`);
  if (
    ["MLP_VERIFIED", "SUBMITTED_TO_PROCESSING"].includes(toStage) &&
    mlp.missing.length
  )
    throw new Error(`${mlp.missing.length} required MLP fields are missing`);
  const check = verification(schema, checkedCtx, worksheet.verified);
  if (
    (toStage === "MLP_VERIFIED" ||
      (toStage === "SUBMITTED_TO_PROCESSING" &&
        worksheet.stage !== "MLP_REVIEW")) &&
    check.done < check.total
  )
    throw new Error(
      `${check.total - check.done} applicable fields still require verification`,
    );
}
