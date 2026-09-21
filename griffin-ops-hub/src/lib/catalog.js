// Presentation alignment only. Template IDs, source fields, and versions stay pinned.
// The Hub serves the operations team: the origination lead / intake phase is not
// represented here. Origination conversations happen outside the Hub.

export const PHASES = [
  {
    id: "application",
    title: "Application, lock, disclosures",
    short: "Application",
    job: "File is real and priced",
    outside: "Blend → LendingPad · Initial disclosures",
  },
  {
    id: "preparation",
    title: "MLP preparation",
    short: "Preparation",
    job: "Borrower is live and file is packable",
    outside: "Appraisal order if Cadre / LendingPad owns it",
  },
  {
    id: "processing",
    title: "Processing handoff",
    short: "Processing",
    job: "Cadre can work the file",
    outside: "Cadre engine · LendingPad conditions",
  },
  {
    id: "submission",
    title: "Investor submission",
    short: "Submission",
    job: "File is in front of an investor",
    outside: "Investor portal",
  },
  {
    id: "closing",
    title: "Conditions, CTC, signing",
    short: "Closing",
    job: "Close the file",
    outside: "CD issuance · CTC · document release",
  },
  {
    id: "funded",
    title: "Funded & post-close",
    short: "Funded",
    job: "Prove the ending",
    outside: "Servicing / warehouse",
  },
];

// Custom work is not tied to a phase. It is grouped last in every chooser.
export const GENERAL_PHASE = {
  id: "general",
  title: "Any phase",
  short: "Any phase",
  job: "One-off coordination",
  outside: "Whatever system owns the underlying action",
};

export const PHASE_INDEX = Object.fromEntries(
  PHASES.map((phase, index) => [phase.id, index]),
);

export const DEPARTMENT_LABEL = {
  LO: "Origination",
  LOA: "Loan assistance",
  MLP: "Mortgage Loan Partners",
  PROCESSOR: "Processing",
  CLOSING: "Closing",
  LOCK_DESK: "Lock desk",
};

export const DESKS = [
  { id: "", label: "All desks", department: "" },
  { id: "mine", label: "Mine", department: "" },
  { id: "lo", label: "Origination", department: "LO" },
  { id: "mlp", label: "MLP", department: "MLP" },
  { id: "processing", label: "Processing", department: "PROCESSOR" },
  { id: "closing", label: "Closing", department: "CLOSING" },
  { id: "lock", label: "Lock", department: "LOCK_DESK" },
  { id: "dscr", label: "DSCR", department: "" },
];

// The desk chip a role lands on by default.
export const ROLE_DESK = {
  LO: "lo",
  LOA: "lo",
  MLP: "mlp",
  PROCESSOR: "processing",
  CLOSING: "closing",
  LOCK_DESK: "lock",
  MANAGER: "",
  ADMIN: "",
};

export const ROLE_DEPARTMENT = {
  LO: "LO",
  LOA: "LO",
  MLP: "MLP",
  PROCESSOR: "PROCESSOR",
  CLOSING: "CLOSING",
  LOCK_DESK: "LOCK_DESK",
};

export const TEMPLATE_UI = {
  CUSTOM_TASK: {
    title: "Custom work",
    shortTitle: "Custom work",
    phase: "general",
    useWhen: "Record a one-off task or coordination step that has no dedicated form.",
  },
  LOA_PREP: {
    title: "LO / LOA submission package",
    shortTitle: "LOA package",
    phase: "application",
    useWhen: "File preparation, document checks, and the four QC attestations.",
  },
  LOCK_REQUEST: {
    title: "Lock request",
    shortTitle: "Lock request",
    phase: "application",
    useWhen: "Ask Lock Desk to review a float, lock, or extension.",
  },
  MLP_WELCOME: {
    title: "MLP welcome",
    shortTitle: "Welcome",
    phase: "preparation",
    useWhen: "First contact, preferences, and the needs list.",
  },
  MLP_DOCUMENT_CHASE: {
    title: "Document follow-up",
    shortTitle: "Document chase",
    phase: "preparation",
    useWhen: "Request, receipt, and human assessment of borrower items.",
  },
  MLP_APPRAISAL_COORDINATION: {
    title: "Appraisal coordination",
    shortTitle: "Appraisal",
    phase: "preparation",
    useWhen: "Payment, scheduling, delivery, and ROV follow-up.",
  },
  PROCESSOR_TITLE_ESCROW_REQUEST: {
    title: "Title & escrow request",
    shortTitle: "Title & escrow",
    phase: "preparation",
    useWhen: "Draft the source title/escrow request packet.",
  },
  PROCESSOR_BUSINESS_NARRATIVE: {
    title: "Business narrative",
    shortTitle: "Business narrative",
    phase: "preparation",
    useWhen: "Self-employed business narrative source form.",
  },
  PROCESSING_SUBMISSION: {
    title: "Processing preparation dossier",
    shortTitle: "Prep dossier",
    phase: "preparation",
    useWhen: "Inventory the file before a Cadre-owned processing handoff.",
  },
  CADRE_HANDOFF: {
    title: "Cadre handoff record",
    shortTitle: "Cadre receipt",
    phase: "processing",
    useWhen: "Record that a packet was sent to Cadre. Not the processing engine.",
  },
  CONDITION_FOLLOWUP: {
    title: "Condition follow-up",
    shortTitle: "Conditions",
    phase: "processing",
    useWhen: "Coordinate a named condition across teams with evidence.",
  },
  EXCEPTION_REVIEW: {
    title: "Internal exception review",
    shortTitle: "Internal exception",
    phase: "processing",
    useWhen: "Internal disposition of an exception. Not the investor form.",
  },
  INVESTOR_EXCEPTION_REQUEST: {
    title: "Investor exception request",
    shortTitle: "Investor exception",
    phase: "submission",
    useWhen: "Draft the source investor-facing exception request.",
  },
  MLP_BORROWER_UPDATE: {
    title: "Borrower update",
    shortTitle: "Borrower update",
    phase: "submission",
    useWhen: "Milestone, Friday check-in, or funded borrower communication.",
  },
  CD_REQUEST: {
    title: "Closing Disclosure request",
    shortTitle: "CD request",
    phase: "closing",
    useWhen: "Prepare the source CD request packet for Lock Desk and Closing.",
  },
  CLOSING_COORDINATION: {
    title: "Closing coordination",
    shortTitle: "Closing coordination",
    phase: "closing",
    useWhen: "Named owner, dependencies, and closing-desk follow-up.",
  },
  MLP_SIGNING_COORDINATION: {
    title: "Signing coordination",
    shortTitle: "Signing",
    phase: "closing",
    useWhen: "Availability, notary, Final CD review, and signing outcome.",
  },
  POST_CLOSE_QC: {
    title: "Post-close quality review",
    shortTitle: "Post-close QC",
    phase: "funded",
    useWhen: "Reconciliation and collateral follow-up after funding evidence.",
  },
};

export const NEXT_TEMPLATE = {
  LOA_PREP: "LOCK_REQUEST",
  LOCK_REQUEST: "MLP_WELCOME",
  MLP_WELCOME: "MLP_DOCUMENT_CHASE",
  MLP_DOCUMENT_CHASE: "PROCESSING_SUBMISSION",
  MLP_APPRAISAL_COORDINATION: "PROCESSOR_TITLE_ESCROW_REQUEST",
  PROCESSOR_TITLE_ESCROW_REQUEST: "PROCESSING_SUBMISSION",
  PROCESSOR_BUSINESS_NARRATIVE: "PROCESSING_SUBMISSION",
  PROCESSING_SUBMISSION: "CADRE_HANDOFF",
  CADRE_HANDOFF: "CONDITION_FOLLOWUP",
  CONDITION_FOLLOWUP: "CD_REQUEST",
  EXCEPTION_REVIEW: "INVESTOR_EXCEPTION_REQUEST",
  INVESTOR_EXCEPTION_REQUEST: "MLP_BORROWER_UPDATE",
  MLP_BORROWER_UPDATE: "MLP_SIGNING_COORDINATION",
  CD_REQUEST: "CLOSING_COORDINATION",
  CLOSING_COORDINATION: "MLP_SIGNING_COORDINATION",
  MLP_SIGNING_COORDINATION: "POST_CLOSE_QC",
};

export const ROLE_STARTERS = {
  LO: ["LOA_PREP", "LOCK_REQUEST", "CUSTOM_TASK"],
  LOA: ["LOA_PREP", "CUSTOM_TASK"],
  MLP: [
    "MLP_WELCOME",
    "MLP_DOCUMENT_CHASE",
    "MLP_APPRAISAL_COORDINATION",
    "MLP_SIGNING_COORDINATION",
  ],
  PROCESSOR: [
    "CADRE_HANDOFF",
    "CONDITION_FOLLOWUP",
    "PROCESSOR_TITLE_ESCROW_REQUEST",
    "EXCEPTION_REVIEW",
  ],
  CLOSING: ["CD_REQUEST", "CLOSING_COORDINATION", "POST_CLOSE_QC"],
  LOCK_DESK: ["LOCK_REQUEST", "CD_REQUEST"],
  MANAGER: ["CONDITION_FOLLOWUP", "CADRE_HANDOFF", "CD_REQUEST"],
  ADMIN: ["CONDITION_FOLLOWUP", "CADRE_HANDOFF", "CD_REQUEST"],
};

export const ROLE_QUESTION = {
  LO: "Which of your files still need a complete handoff?",
  LOA: "Which submission packages are missing the four QC attestations?",
  MLP: "Who needs a welcome, a chase, an appraisal update, or a signing confirm?",
  PROCESSOR: "Which packets are ready, waiting on Cadre evidence, or open on conditions?",
  CLOSING: "Which CD requests and signing coordinations are due?",
  LOCK_DESK: "Which lock requests are unassigned or past target?",
  MANAGER: "What is past target by desk, and where is evidence missing?",
  ADMIN: "What is past target by desk, and where is evidence missing?",
};

export function uiTitle(templateOrId, fallback = "") {
  const id = typeof templateOrId === "string" ? templateOrId : templateOrId?.id;
  const raw =
    typeof templateOrId === "string" ? fallback : templateOrId?.title || fallback;
  return TEMPLATE_UI[id]?.title || raw || id || "Workflow";
}

export function uiShort(templateOrId, fallback = "") {
  const id = typeof templateOrId === "string" ? templateOrId : templateOrId?.id;
  const raw =
    typeof templateOrId === "string"
      ? fallback
      : templateOrId?.shortTitle || templateOrId?.title || fallback;
  return TEMPLATE_UI[id]?.shortTitle || raw || id;
}

export function templatePhase(id) {
  return TEMPLATE_UI[id]?.phase || "processing";
}

export function phaseById(id) {
  return id === GENERAL_PHASE.id
    ? GENERAL_PHASE
    : PHASES.find((phase) => phase.id === id) || null;
}

export function phaseTitle(id, short = false) {
  const phase = phaseById(id);
  return phase ? (short ? phase.short : phase.title) : "Unphased";
}

export function templatesByPhase(templates) {
  return [...PHASES, GENERAL_PHASE]
    .map((phase) => ({
      ...phase,
      templates: templates.filter(
        (template) => templatePhase(template.id) === phase.id,
      ),
    }))
    .filter((phase) => phase.templates.length);
}

export function nextTemplateId(templateId) {
  return NEXT_TEMPLATE[templateId] || null;
}

// Plain helper (not a React hook): the one-line "use when" for a template.
export function whenToUse(template) {
  return (
    TEMPLATE_UI[template?.id]?.useWhen ||
    String(template?.description || "").split(".")[0]
  );
}

export function departmentLabel(code) {
  return DEPARTMENT_LABEL[code] || code || "Unassigned";
}

export function roleDepartment(role) {
  return ROLE_DEPARTMENT[role] || "";
}
