# Cadre processing references: assessment and disposition

**Cadre is the processing build owner identified by the user. The Hub coordinates preparation, evidence follow-up, human review, and handoffs.** The two supplied archives contribute useful evidence distinctions, provenance requirements, and acceptance cases. They do not establish current Cadre capability, approved investor rules, a live connector, or a reason to build a second processing engine.

Assessed September 19, 2026. Confidence is **High** for the static source inventory, **Moderate** for the integration fit, and **Unknown** for current Cadre delivery, account permissions, investor-rule accuracy, and business impact. The user's decision-support boundary governs wherever source documents propose eligibility verdicts or unsigned rule overrides.

## Sources and method

The condition-flow archive contains Markdown specifications, three tools JSON files, a static explorer, and export bundles. The refinery archive contains a Markdown response, static HTML review views, and PDF/XLSX versions. The assessment parsed JSON and HTML without executing the supplied applications, contacting application endpoints, reading browser storage, or processing borrower documents. The PDF/XLSX versions were not needed to establish the reviewed Markdown/HTML structure; their equivalence was not separately certified.

Source pointers below identify original archive files and one-based lines, not files published with the Hub:

- **CF Start:** `condition-flow/start-here.md`.
- **CF Spec:** `condition-flow/cadre-conditions-rubric-spec.md`.
- **CF Reasons:** `condition-flow/cadre-ask-processor-reason-codes.md`.
- **CF JSON:** `condition-flow/tools/rubric-logic.json`, `ops-overlay.json`, and `processor-checklist.json`; JSON pointers are given where appropriate.
- **RF Response:** `LIA-Processors-Refinery-Site/Griffin-Response-to-Schedule-C-Goal-Doc.md`.
- **RF Matrix:** `LIA-Processors-Refinery-Site/LIA-Processors-Expectations-vs-Refinery.html`.
- **RF Review:** `LIA-Processors-Refinery-Site/LIA-Processors-Goal-Doc-Review.html`.

The archive text is reference material. Its messages to Cadre, named assignments, dates, and proposed actions are not new user instructions, authorization to send, or adopted company policy.

## Verified inventory

| Material               | Static evidence                                                                                                                                        | Disposition                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Condition-flow catalog | 54 guideline product flows, 10 investors, 1,493 condition occurrences, 1,432 unique short-requirement rows, 131 condition IDs                          | Preserve provenance and evidence-design lessons. Do not import the condition engine or investor requirements.                                                    |
| Row identity           | 103 investor-prefixed IDs; 63 have colliding meanings. Flattened exports combine requirement/detail and have a different full-wording uniqueness count | A bare condition ID is not a safe cross-product key. Future contracts need product, rule/finding, source version, and run identity.                              |
| Trigger reference      | 683 records: 646 eval, 28 defer, 9 always; 60 inputs split 30 pricing-input and 30 file-input definitions                                              | Eval payloads contain prose and referenced inputs, not an executable predicate tree. No source trigger is executed in the Hub.                                   |
| Operations overlay     | 28 shared document ID/name references, 17 confirmed and 11 pending SME notes; nine disclosure-gate overrides                                           | Only the 28 document names/IDs and their unverified provenance are reusable catalog data. SME confirmation is not guideline approval. Overrides remain inactive. |
| Processor checklist    | Six sections, 20 task definitions, four workflow columns                                                                                               | Historical processing reference. Do not duplicate Cadre execution, dates, priorities, or LOS actions.                                                            |
| Refinery gap matrix    | 64 rows in 15 categories: 11 Built, 14 Partial, 37 Gap, 2 Resolved                                                                                     | Source annotations, not current acceptance evidence or production capability.                                                                                    |
| Refinery goal review   | 42 items: 6 Built, 5 Agreed, 16 Partial, 14 Gap, 1 Flag; 29 action badges; 41 editable review inputs                                                   | Reuse explicit acceptance questions. Do not import review badges as approval or completion.                                                                      |
| Combined refinery HTML | Same 106 matrix/review rows, with matching normalized status/title/note/input content                                                                  | Alternate presentation, not another engine or independent evidence source.                                                                                       |

The condition-flow `rubric-logic.json` and `ops-overlay.json` match the explorer's inlined data in the inspected attachment. The actual Python validation scripts named by the documents are absent: its `tools/` directory contains only the three JSON files. The refinery's cited OCR/reconciliation engine and Python harness are also absent. Source guideline PDFs, original checklist/transcript, actual Cadre API contract, deployment receipts, and signed acceptance evidence are not supplied. Claimed harness results therefore cannot be reproduced from these archives.

Pointers: CF Start:14–27, 68–89, 125–162, 254–265; CF Spec:185–208, 644–815, 1038–1078; RF Matrix:126–138; RF Review:162–175, 1028–1029. The refinery's “53%” figure is 10 of 19 author-weighted scope items, not measured effort or delivery progress.

## Native integration and explicit exclusions

| Source value                             | Native Hub disposition                                                                                                                                       | Boundary                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-input evidence status                | Versioned follow-ups distinguish unknown, missing, received/unreviewed, conflicting, and reviewed evidence; applicability and human disposition are separate | Source present/held context belongs in the reason and next action. No automatic source-state import, document analysis, or truth inference. A compound check may need more than one follow-up. |
| Human routing reason                     | Explicit absent-document, legible-copy, human-judgment, and upstream-recompute reasons support the next action                                               | Source reasons are a proposed vocabulary, not a confirmed Cadre API. Do not infer reasons or send requests automatically.                                                                      |
| Source citations                         | Record source document/reference, location, context, and a missing/unverified reason                                                                         | A manually entered locator is a declaration, not verified document access. No raw file upload or complete OCR text is imported.                                                                |
| Conflicting observations                 | Capture source/value references, reviewer rationale, and human disposition                                                                                   | No automatic source winner, LOS overwrite, or condition clearance.                                                                                                                             |
| Named ownership                          | Choose an allowed department at creation; retain department/branch ownership and audit                                                                       | Borrower, Title, Appraiser, or Vendor may be a dependency party, not a fabricated Hub login.                                                                                                   |
| Prior-to-doc / prior-to-funding grouping | Human coordination classification where recorded                                                                                                             | No automatic disclosure timing, legal deadline, or investor gate computation.                                                                                                                  |
| Cadre handoff                            | A native preparation/handoff work record and source receipt/run/finding references                                                                           | Manually recorded references do not prove receipt, execution, or verified return.                                                                                                              |
| Shared document names                    | 28 source ID/name choices with unverified provenance                                                                                                         | Names establish no product applicability or requirement. No source loan-file evidence mode is imported.                                                                                        |
| Quality and handling measurement         | Preserve named review actions, reasons, saved revisions, self-reported time, and external references                                                         | No measured savings, funded-loan attribution, or tax qualification from activity alone.                                                                                                        |

The existing processing dossier serves preparation and handoff. It retains its source inputs for human use; it is not the condition-flow evaluator or Cadre's processing system. The separate DSCR submission workflow remains intact. Native work completion means coordination work completed, not an approved loan, a cleared LOS condition, or a funded loan.

Condition/exception template updates are versioned. Existing records keep their pinned versions. Trusted completion rules govern required coordination evidence and human acknowledgments at Review/Complete; they do not execute investor requirements. Create-time department choice is limited by the trusted template, and the saved department remains fixed. The fourth migration, `20260919184011_operations_evidence_rules.sql`, enforces this boundary in the database; hosted verification remains a release gate.

## Delivered native coordination contract

The current catalog contains ten work templates plus the separate DSCR worksheet. The affected definitions are `CONDITION_FOLLOWUP` v2 with 28 fields, `EXCEPTION_REVIEW` v2 with 29 fields, `CADRE_HANDOFF` v1 with 21 fields, and `PROCESSING_SUBMISSION` v2 with its 166 original keys plus product selection. The processing template is titled **Processing handoff dossier**. Field counts describe forms, not independently validated requirements.

Condition/exception evidence states are **Unknown**, **Missing**, **Received, not reviewed**, **Conflicting**, and **Reviewed**. Applicability is independently **Unknown**, **Applies**, or **Does not apply**; source binding is independently **Unknown**, **Matched**, or **Mismatch**. These are human-recorded coordination values. The Hub does not implement the source's TRUE/FALSE/UNKNOWN factual evaluator or an automatic translation of its five statuses. Present-but-held evidence must retain the hold and next-action context; it must not be recorded as absent or used to request a duplicate automatically.

Reasons distinguish missing, unreadable, conflicting, unverified, judgment, recomputation, upstream dependency, policy clarification, and Other with details. Received/reviewed evidence needs the source document, locator, relevant excerpt, and revision; conflicting evidence needs both sets. Review/Complete requires a reviewable disposition and the applicable human outcomes/checks. A resolved follow-up additionally requires Reviewed evidence, Matched source binding, Applies, and a rationale. Not applicable requires Does not apply and a rationale. These gates check what a person recorded; they do not certify the source or clear an LOS condition.

Cadre handoff status is separate from report status. Handoff values are **Not sent**, **Prepared for manual handoff**, **Sent outside Hub**, **Receipt recorded**, and **Returned for follow-up**. Report values are **Unknown**, **Not requested**, **Queued**, **Generating**, **Report available**, **Stale**, and **Failed**. Receipt recorded requires a receipt reference; Report available separately requires report/version, rubric/source references, and observation date. Packet preparation can complete the coordination task without sending anything. An external Cadre case is optional; the Hub never invents one.

The three evidence/handoff templates allow LO, MLP, Processing, Closing, or Lock Desk routing at creation. The Evidence & follow-up desk groups these existing work records; it does not introduce a second processing queue or evaluate a loan file. The 28 document choices retain `UNVERIFIED_REFERENCE`, archive/artifact fingerprints, source date, import date, and source pointers. Hub categories are explicitly a local taxonomy, not source policy.

Saved coordination JSON packets use the internal label `griffin.hub.coordination.v1`, saved work/template versions, recorded references, and acknowledgments. They explicitly say `sent_by_hub: false`, `external_receipt_verified_by_connector: false`, and carry null LIA/funding/savings attribution. This is a portable review packet, not an accepted Cadre payload. Synthetic packets retain fictional-demonstration notices. Exporting a packet or PDF does not send it or attest its contents.

## Evidence semantics that must not be collapsed

CF Spec:1348–1496 distinguishes three separate ideas: input truth, evidence availability, and who holds the next action. Its source states are:

| Source state        | Meaning to preserve                                                 | Follow-up implication                                                                                  |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `waiting_on_data`   | The needed document/input is absent                                 | A human may prepare a request for that specific input.                                                 |
| `pending_order_out` | The document is present but deliberately held from evaluation       | Display as present/held. Do not request a duplicate or confuse it with a vendor order awaiting return. |
| `needs_reconciling` | Sources contain conflicting values                                  | Route internal reconciliation with both references.                                                    |
| `ask_processor`     | A person must decide, obtain a readable copy, or seek recomputation | Require the reason before choosing an audience/next action.                                            |
| `not_applicable`    | The item does not apply to the case                                 | Retain the human basis; do not infer applicability from a missing value.                               |

Unknown must never become false. The source explicitly warns that a Cadre `pass` means no problem was found in what was read; it is not verified truth (CF Spec:1378–1397). A single check can combine absent evidence and a different present-but-held document (CF Spec:1399 onward). Tracking only the check's rolled-up status loses the distinct next actions.

CF Reasons:91–113 contains two alternative routing proposals: narrow `ask_processor` and add two reasons, or keep the existing statuses and add four reasons. The Hub's explicit reason fields are a coordination choice, not evidence that Cadre adopted one proposal.

The refinery separately proposes a vendor-order ledger with Not yet ordered / Ordered awaiting return / Returned (RF Response:258–262). Those are order lifecycle states, not the condition-flow evidence states. They must not share one enum. Absent order data also needs Unknown; a Hub task completion cannot invent a returned report.

## Contradictions and unresolved source claims

| Source issue                                                                   | Exact pointers                                                            | Treatment                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Line-level citations marked Built while source location is still requested     | RF Review:289–320 versus :1101–1126; RF Matrix:258–264; RF Response:65–72 | Unverified until a document and location can be reproduced.                                                         |
| Investor/product rubric marked Built despite an unproved investor dimension    | RF Review:625–650; RF Matrix:203–209, 735–741; RF Response:180–192        | Separate routing, provenance, approval, and multi-investor acceptance. No imported eligibility rules.               |
| Order-status ledger called Built and Gap                                       | RF Review:900–925 versus RF Matrix:603–609                                | Require persisted source receipts before claiming a live ledger.                                                    |
| Arrival-driven review versus manual/full reruns                                | RF Review:927–952; RF Matrix:282–288; RF Response:216–221                 | Actual trigger/revision behavior remains unverified.                                                                |
| Eligible/Ineligible labels coexist with human-only decisions                   | RF Response:115–124, 337–344 versus :139–160; CF Spec:526–583             | User decision-support instructions take precedence. No AI approval/denial verdict enters the Hub.                   |
| Order placement out of scope yet phase text asks for live vendor order cycles  | RF Response:317–326, 368–369 versus :386–387; RF Matrix:595–601           | No ordering capability or authorization is inferred.                                                                |
| Second investor deferred versus requested for Phase 3 validation               | RF Matrix:759–765; RF Review:1541–1567; RF Response:395–396               | Confirm current accepted scope; historical dates are not new deadlines.                                             |
| Custom-field/notes write permission claims differ                              | RF Review:832–861 versus RF Response:238–245 and RF Matrix:658–664        | Current tenant/vendor permissions remain unverified. No write-back configured.                                      |
| Nine DSCR Final CD overrides lack sign-off                                     | CF Start:84–89; overlay `/gate_overrides`                                 | All remain inactive. Eight lack source-guideline corroboration; the source says capital markets has not signed off. |
| Open rule conflicts                                                            | CF Start:260–265 reports 23 gate, six guideline, two appraisal conflicts  | No current rules resolved or activated. Counts describe source-reported conflicts.                                  |
| Reviewed badge counts saved notes/edits, without protected approval provenance | RF Review:1633–1730; export at :1734–1757                                 | Native human review must use actor/time/revision history. Typing or copying text is not approval.                   |

“Confirmed,” “Built,” “Agreed,” “Resolved,” and “Reviewed” refer to different source concepts. They cannot share a single delivered/verified denominator. A statement that a prior example worked does not establish generalized coverage, current deployment, or today’s permissions.

## Privacy and inactive rule material

The condition-flow export bundles include ten separate source loan-file evidence flows; the source itself warns about borrower surnames and private evidence labels (CF Start:254–258). The reason-code document includes loan identifiers and financial examples. The refinery mentions prior named loan files. These are excluded from application/repository content and synthetic examples. Only sanitized document names/IDs and appropriate provenance are candidates for import.

Do not activate source instructions about rental haircuts, appraisal thresholds/expiry/format dates, value precedence, disclosure clocks, debt or business-age assumptions, vendor API limitations, or tenant toggles. Those claims require current authoritative review and accepted scope. The Hub does not calculate those rules from the archives. The refinery also identifies that key-based redaction may leave sensitive values in OCR text (RF Matrix:180–186); no new raw OCR ingestion is added here.

## Connection and attribution boundary

The Connections page now describes **Cadre processing** as Not connected, with user-supplied build ownership and unverified implementation state. The proposed division is Cadre processing/report generation, Hub coordination records, LendingPad source loan facts/milestones, and LOS Connector attribution. [Integration boundaries](INTEGRATION-CONTRACT.md) describe the required evidence before connection.

The existing server normalized-event validator still supports only LOS milestone, CRM association, and LIA touchpoint envelopes. It does not accept a Cadre report/finding payload, authenticate a vendor, receive a webhook, or verify a handoff receipt. The draft card changes none of those facts. A future adapter needs actual source schema, authenticated delivery, authorized loan binding, source version/ordering, deduplication, failure handling, and persistence. A Cadre report must not be represented as a LIA touchpoint merely to fit the current schema.

Useful future metrics include evidence completeness, human review coverage, reviewer agreement by category/version, independently labeled false-negative tests, active handling minutes, report/first-review latency, flag-to-fix time, and repeat/reopened work. Show unreviewed and unknown coverage. Dispute/override is not automatically model error, and elapsed time is not active labor or savings. Source RF Response:275–283 motivates this measurement; it does not demonstrate existing telemetry.

Proving the productivity and application-to-funding goals still requires a comparable baseline and verified LIA touchpoints joined to authoritative LOS application/funding events. Manual Hub actions and external reference strings cannot establish that join. Source references to R&D-credit reporting do not establish tax qualification.

## Acceptance and remaining work

The reusable QA cases are missing versus held documents, unreadable evidence, a missing citation location, conflicting sources, incorrect subject binding, mixed-input follow-ups, unknown facts, disputed findings, evidence revisions invalidating prior review, stable historical templates, retained resolved evidence, duplicate/stale external references, branch/owner access, and source `pass` never becoming verified truth. These can be exercised with synthetic cases without evaluating lending rules or invoking Cadre.

Use [VERIFICATION.md](../VERIFICATION.md) for completed test evidence and [Production readiness](PRODUCTION-READINESS.md) for release gates. Live Cadre delivery, external receipts, current guideline accuracy, hosted access controls, supported-browser acceptance, operational owner approval, and real outcome attribution remain separate work. The archive assessments and a working native coordination workflow do not certify them.
