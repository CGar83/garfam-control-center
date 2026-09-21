// Fictional workflow fixtures, never loan advice or evidence of a lending decision.
// Loaded only into the isolated local demonstration, never a remote backend.
import base from "./schemas/base.json";
import dscr from "./schemas/dscr.json";
import { expandField, mergeSchema, verification } from "../lib/schema.js";
import { CFG, ST, PT, CZ, CE } from "./investors.js";

const SAMPLE_CASES = [
  [
    "1042801",
    "Morgan",
    "RETURNED_TO_LO",
    54,
    "Updated reserve documentation needed before the next handoff.",
  ],
  [
    "1042802",
    "Bennett",
    "MLP_REVIEW",
    31,
    "Review started. Confirm property and rental documentation.",
  ],
  [
    "1042803",
    "Chen",
    "SUBMITTED_TO_PROCESSING",
    8,
    "Verified worksheet delivered to Processing.",
  ],
  [
    "1042804",
    "Rivera",
    "DRAFT",
    5,
    "Loan officer completing the submission package.",
  ],
  ["1042805", "Ellis", "LO_SUBMITTED", 3, "Ready for MLP review."],
  [
    "1042806",
    "Parker",
    "MLP_VERIFIED",
    2,
    "Field verification complete. Preparing handoff.",
  ],
  [
    "1042807",
    "Brooks",
    "RETURNED_TO_MLP",
    26,
    "Clarify worksheet values against the supporting documents.",
  ],
  [
    "1042808",
    "Reed",
    "PROCESSING_ACCEPTED",
    16,
    "Processing accepted the package.",
  ],
  [
    "1042809",
    "Hayes",
    "COMPLETE",
    18,
    "Worksheet workflow complete. This is not a funding event.",
  ],
  ["1042810", "Sullivan", "DRAFT", 21, "Waiting for the remaining LO inputs."],
  ["1042811", "Diaz", "MLP_REVIEW", 12, "Review in progress."],
  [
    "1042812",
    "Walsh",
    "COMPLETE",
    40,
    "Worksheet workflow complete. This is not a funding event.",
  ],
];
const LINEAR_PATH = [
  "DRAFT",
  "LO_SUBMITTED",
  "MLP_REVIEW",
  "MLP_VERIFIED",
  "SUBMITTED_TO_PROCESSING",
  "PROCESSING_ACCEPTED",
  "COMPLETE",
];
const actorFor = (stage) =>
  ["PROCESSING_ACCEPTED", "RETURNED_TO_MLP", "COMPLETE"].includes(stage)
    ? ["u-proc", "PROCESSOR"]
    : ["DRAFT", "LO_SUBMITTED"].includes(stage)
      ? ["u-lo", "LO"]
      : ["u-mlp", "MLP"];

export function createDemoPortfolio() {
  const schema = {
    ...mergeSchema(base, dscr),
    option_refs: { ST, PT, CZ, CE },
  };
  const reference = {
    ...CFG["dh-dscr"],
    name: "Deephaven DSCR",
    source_status: "UNVERIFIED_REFERENCE",
  };
  const clock = Date.now();
  const at = (hoursAgo) => new Date(clock - hoursAgo * 36e5).toISOString();
  const fields = Object.fromEntries(
    schema.sections
      .flatMap((section) => section.fields)
      .flatMap((field) => [
        ...expandField(field).map((leaf) => [leaf.key, { ...field, ...leaf }]),
        ...(field.type === "checkgroup"
          ? field.items.map((item) => [item.key, field])
          : []),
      ]),
  );
  const loans = {},
    worksheets = {},
    events = [],
    transitions = [];

  SAMPLE_CASES.forEach(([number, last, stage, age, note], index) => {
    const id = `sample-${number}`;
    const path =
      stage === "RETURNED_TO_LO"
        ? ["DRAFT", "LO_SUBMITTED", "MLP_REVIEW", "RETURNED_TO_LO"]
        : stage === "RETURNED_TO_MLP"
          ? [
              "DRAFT",
              "LO_SUBMITTED",
              "MLP_REVIEW",
              "MLP_VERIFIED",
              "SUBMITTED_TO_PROCESSING",
              "RETURNED_TO_MLP",
            ]
          : LINEAR_PATH.slice(0, LINEAR_PATH.indexOf(stage) + 1);
    const stageAges = Object.fromEntries(
      path.map((step, stepIndex) => [
        step,
        age + (path.length - 1 - stepIndex) * 12,
      ]),
    );
    const createdAt = at(stageAges.DRAFT);
    const loEditAt = at(stageAges.DRAFT - 1);
    const mlpEditAt = path.includes("MLP_REVIEW")
      ? at(stageAges.MLP_REVIEW - 1)
      : null;
    // Complete review marks precede the MLP_VERIFIED transition. Partial review
    // marks occur after MLP_REVIEW starts, rather than after downstream handoffs.
    const verifiedAt = path.includes("MLP_VERIFIED")
      ? at(stageAges.MLP_VERIFIED + 1)
      : path.includes("MLP_REVIEW")
        ? at(stageAges.MLP_REVIEW - 2)
        : null;
    const full = {
      dt: createdAt.slice(0, 10),
      ln: number,
      cln: last,
      pr: "dh-dscr",
      lockDate: at(stageAges.DRAFT + 18).slice(0, 10),
      discDate: at(stageAges.DRAFT + 6).slice(0, 10),
      liaUsed: index % 3 === 0 ? "No" : "Yes",
      pur: "Purchase",
      pp: "650000",
      amort: "Fixed",
      la: "487500",
      av: "650000",
      ltv: "75",
      cltv: "75",
      dscr: "1.21",
      st1: `Sample property ${index + 1}`,
      city: "San Diego",
      state: "CA",
      zip: "92101",
      vest: "Individual",
      fti: "No",
      ftb: "No",
      prv: "Yes",
      lrf: "No",
      jobChg: "No",
      cit: "US Citizen",
      cv: "Sample borrower",
      pt: "SFR",
      hoa: "No",
      rType: "Long-Term Rental",
      r1007: "4200",
      lst6: "No",
      vac: "No",
      noo: "Yes",
      rur: "No",
      flood: "No",
      solar: "No",
      unpermit: "No",
      addlLiens: "No",
      appr: "Full",
      i1007: true,
      rDSCR: "1.0",
      fico: "742",
      resM: "9",
      resV: "Yes",
      resS: "Sample bank document",
      pCr: "N/A",
      hH: "Met",
      hm: "No",
      seas: "Yes",
      biz: "Yes",
      ppp: "Yes",
      pTerm: "3 Yr",
      pType: "5% Flat",
      pInf: "Yes",
      impound: "Yes",
      travel: "No",
      otherLender: "No",
      bLTVval: "75",
      bLTV: "Yes",
      bCREDval: "742",
      bCRED: "Yes",
      bINCval: "1.21",
      bINC: "Yes",
      bASTval: "9",
      bAST: "No",
      risks: "Fictional review fixture; no lending determination.",
      planB: "Pending human review",
      planC: "Pending human review",
      ready: "Clean",
    };
    const data =
      stage === "DRAFT"
        ? {
            dt: full.dt,
            ln: number,
            cln: last,
            pr: full.pr,
            pur: full.pur,
            la: full.la,
            state: full.state,
            liaUsed: full.liaUsed,
            lockDate: full.lockDate,
          }
        : { ...full };
    if (!path.includes("MLP_REVIEW")) {
      for (const key of Object.keys(data))
        if ((fields[key]?.owner || "LO") === "MLP") delete data[key];
    }
    const ctx = { data, investor: reference, product: "DSCR" };
    const verified = {};
    if (!["DRAFT", "RETURNED_TO_LO", "LO_SUBMITTED"].includes(stage)) {
      // The same engine used by handoff validation includes visible address leaves
      // and group keys such as incSrc, whose stored selection is i1007=true.
      verification(schema, ctx).items.forEach((field, fieldIndex) => {
        if (stage !== "MLP_REVIEW" || fieldIndex % 3 !== 0)
          verified[field.key] = { by: "u-mlp", at: verifiedAt };
      });
    }

    path.forEach((step, stepIndex) => {
      const [actorId, actorRole] = actorFor(step);
      transitions.push({
        id: `${id}-t${stepIndex}`,
        worksheet_id: id,
        loan_number: number,
        from_stage: path[stepIndex - 1] || null,
        to_stage: step,
        actor_id: actorId,
        actor_role: actorRole,
        note: stepIndex === path.length - 1 ? note : "Fictional workflow event",
        at: at(stageAges[step]),
      });
    });
    Object.entries(data).forEach(([key, value], fieldIndex) => {
      const mlpOwned = (fields[key]?.owner || "LO") === "MLP";
      events.push({
        id: `${id}-f${fieldIndex}`,
        worksheet_id: id,
        field_key: key,
        action: "COMPLETED",
        actor_id: mlpOwned ? "u-mlp" : "u-lo",
        actor_role: mlpOwned ? "MLP" : "LO",
        value_snapshot: { from: null, to: value },
        at: mlpOwned ? mlpEditAt : loEditAt,
      });
    });
    if (stage === "RETURNED_TO_LO") {
      // The original submission was complete. These fields are cleared only once
      // the LO owns the returned step, leaving an explicit event for each removal.
      for (const key of ["resS", "resV"]) {
        events.push({
          id: `${id}-clear-${key}`,
          worksheet_id: id,
          field_key: key,
          action: "EDITED",
          actor_id: "u-lo",
          actor_role: "LO",
          value_snapshot: { from: data[key], to: null },
          at: at(age - 1),
        });
        delete data[key];
      }
    }
    Object.entries(verified).forEach(([key, value], fieldIndex) =>
      events.push({
        id: `${id}-v${fieldIndex}`,
        worksheet_id: id,
        field_key: key,
        action: "VERIFIED",
        actor_id: "u-mlp",
        actor_role: "MLP",
        at: value.at,
      }),
    );
    const updatedAt = [
      ...events.filter((event) => event.worksheet_id === id),
      ...transitions.filter((event) => event.worksheet_id === id),
    ].reduce(
      (latest, event) => (event.at > latest ? event.at : latest),
      createdAt,
    );
    worksheets[id] = {
      id,
      loan_number: number,
      form_type: "DSCR",
      schema_version: schema.version,
      base_schema_version: base.version,
      schema_snapshot: structuredClone(schema),
      investor_snapshot: structuredClone(reference),
      data,
      verified,
      stage,
      created_by: "u-lo",
      created_at: createdAt,
      updated_at: updatedAt,
      sample: true,
    };
    loans[number] = {
      loan_number: number,
      borrower_last: last,
      branch: "San Diego",
      product_type: "DSCR",
      investor_id: "dh-dscr",
      lo_id: "u-lo",
      mlp_id: "u-mlp",
      processor_id: "u-proc",
      lock_date: data.lockDate,
      disclosure_sent_at: data.discDate,
      current_stage: stage,
      created_at: at(stageAges.DRAFT + 24),
      updated_at: updatedAt,
      sample: true,
    };
  });
  return { loans, worksheets, events, transitions };
}
