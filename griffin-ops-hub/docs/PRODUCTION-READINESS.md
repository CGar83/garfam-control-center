# Production readiness

## Release position

This build supports local product review with fictional records. It contains 15 native operations work templates plus the separate DSCR submission workflow, a source-backed loan flow guide and MLP desk, and an implemented Supabase backend with database permission tests. Current test results belong in the release verification record. It has not been connected to a hosted project or verified with live identities and loan data. There is no evidence of a production deployment, measured LO labor savings, or application-to-funding improvement.

The release decision belongs to the designated product and operational owners, based on the evidence below. Owner labels identify responsibilities to assign; they do not imply that a particular person has accepted them. No new company policy or investor requirement is established by this document.

## Gate register

| Gate                        | Accountable owner role                                     | Required evidence before live use                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow definition         | Operations product owner                                   | Reviewed required fields, stage owners, return reasons, verification meaning, and permitted exception paths; documented pilot scope and acceptance criteria                                                        |
| MLP source ownership        | MLP/Operations owner with LO, Processing and Closing leads | Reconcile welcome trigger, appraisal ordering, pricing/restructure and suspense ownership; approve contact-outcome evidence and human target dates; resolve AM/MLP/LPA/LOA role mapping before any enforcement     |
| Reference accuracy          | Capital Markets or designated investor-guideline owner     | Current source documents and effective dates supporting each retained investor statement, product grouping, and selectable value; explicit handling of unavailable or expired references                           |
| Decision-support boundaries | Compliance owner with Operations                           | Review of loan-facing wording, disclosure-related fields, human review, exports, and any applicable RESPA, TILA, or TRID implications; no claim that the application determines compliance or credit eligibility   |
| Identity and access         | Identity administrator with engineering owner              | Hosted Google identity flow, organization restrictions, deliberate first-admin bootstrap, assigned roles/branches, LOA mapping, account deactivation, and cross-user/branch denial tests                           |
| Database integrity          | Backend engineering owner                                  | All four migrations applied in the intended environment; hosted RLS/grant/function advisor review; actual authenticated API tests for forged mutations, audit consistency, stale saves, and concurrent transitions |
| Data operations             | Infrastructure and data owner                              | Approved data classification and retention decisions, access to operational logs, monitored failures, a tested backup/restore exercise, recovery responsibilities, and incident ownership                          |
| User workflow reliability   | Frontend engineering and QA owners                         | Supported-device/browser review, keyboard and assistive-technology checks, slow/disconnected network recovery, save/retry behavior, two-session conflicts, and print/export review                                 |
| Attribution contract        | LOS Connector engineering owner with LIA product owner     | Stable LOS identifier mapping, LIA event contract, source event IDs, actors/timestamps, application/funding reconciliation, duplicate handling, and traceable sample joins                                         |
| Measurement design          | Operations analytics owner                                 | Defined cohorts, handling-time measurement, baseline period, exclusion rules, and distinction between elapsed time and active work time; unknown outcome coverage remains visible                                  |
| Pilot and release           | Product owner with Operations and infrastructure owners    | Human review of the preceding evidence, bounded pilot participants/data, an agreed stop and rollback process, monitored acceptance criteria, and an explicit go/no-go decision                                     |

A synthetic-data review can proceed while these gates are open. Real borrower use requires the relevant owners' release decision. Attribution implementation should run alongside operational hardening; postponing the LOS Connector would leave LIA impact unprovable even if worksheet adoption increases.

## Cadre processing and evidence boundary

The user identifies Cadre as the processing build owner. The archived refinery/condition-flow materials do not establish current Cadre delivery, accepted API contracts, or tenant permissions. The Hub's role is preparation, human review, evidence follow-up, and handoff coordination. No processing evaluator, external document analysis, investor/gate logic, unsigned disclosure override, vendor order, or source loan-file evidence is activated from these archives.

The Cadre connection card is a draft boundary and remains Not connected. The existing server event scaffold does not accept Cadre processing reports or findings. Manual run/finding/receipt references are not verified delivery evidence, LIA touchpoints, or funding attribution. A future connection requires an agreed source schema, authenticated receipts, authorized loan binding, privacy controls, reconciliation/replay behavior, and owner acceptance.

Native evidence state, applicability, source binding, and work status are separate human observations. The Hub has no factual evaluator: unknown is not false, a source pass is not verified truth, and a present document held from review is not a missing document. Cadre handoff and report status are separate; prepared work can complete without any external send. Saved JSON packets identify manual references and carry explicit no-send, unverified-receipt, and unknown-attribution markers. Human follow-up closure does not clear an LOS condition. Before a live pilot, approve the routing reasons, document-reference catalog, human-disposition criteria, source access and retention, and deidentified acceptance cases in [the Cadre assessment](CADRE-INTEGRATION-ASSESSMENT.md).

## MLP training and loan flow boundary

The five MLP templates and loan flow guide use sanitized responsibilities, dependencies and evidence categories from the 196-page GFU training and four supplied workflow images. Phase selection and related work do not set or prove a loan milestone. Processor execution remains with Cadre and the responsible processor; the promised processor material is a follow-up source assessment, not evidence of an accepted live interface.

Before enforcement, Operations must reconcile conflicting welcome triggers, appraisal-order ownership, pricing/restructure ownership, suspense communication and overlapping role names. The PDF's 24-hour welcome, three-day document return and Friday updates, plus the diagrams' processing/suspense targets, remain unconfirmed planning references. Required human review gates do not establish that these are current company SLAs. Compliance and the appropriate policy owner must validate any future disclosure timing, ROV, state form, product or eligibility logic against authoritative current sources.

Embedded forms are clipped or incomplete. Do not claim full checklist/legal-form coverage from printed viewports or infer unseen video/link content. The source contains plaintext portal credentials on p100 and borrower/account examples in screenshots. Credentials are redacted from working text; no raw PDF, screenshots, borrower examples, contacts, identity answers or health detail are imported into application data. Approved source access, retention and reusable communication templates are release gates. See [MLP workflow integration](MLP-WORKFLOW-INTEGRATION.md) for complete page-range dispositions.

## Current control boundaries

The hosted adapter is designed to write through atomic database functions. Those functions derive the acting identity from the session and check active assigned roles, loan access, editable fields, workflow stage, required notes, and applicable completeness. The browser cannot directly update worksheet stages, verification maps, loan ownership, or audit rows through its granted table permissions.

A save records trusted differences together with the saved data. Changes to LO-owned fields invalidate existing verification and record the reason. Expected revision timestamps reject stale updates. Published schema rows cannot be edited in place; new worksheets capture the composed schema and selected investor reference. Historical records lacking their original reference need deliberate recovery rather than an automatic upgrade.

Managers and administrators have explicit DSCR worksheet stage overrides that require a reason. These are workflow exceptions recorded under the acting identity. Operations work uses a separate transition policy; completing work requires an eligible member of the assigned department. Neither action is a credit approval. Operations must confirm that the implemented exception scope matches its intended procedure before release.

Operations template versions pin allowed departments and completion rules. Department routing occurs at creation and remains fixed on the saved item; owners must be active in the same branch and department. Review/completion evaluates the saved template rules and fails closed on malformed rules. Earlier snapshots without those rules retain their earlier definitions. Changed evidence/answers invalidate affected human acknowledgments; no version change retroactively certifies a record.

Local mode deliberately provides interchangeable demonstration identities. Its records and audit history can be edited or reset by the browser user. Local adapter checks exercise workflow behavior but do not create a security boundary.

## Verification already represented in the package

Use [the final verification record](../VERIFICATION.md) for the final test totals and build results. The application suite covers schema/field coverage, workflow behavior, report calculations, persistence failure recovery, and rendered interaction paths. Database verification uses a disposable PostgreSQL 17 instance and synthetic equivalents of Supabase identity claims.

The database suite verifies rejected direct mutations, role/branch boundaries, required notes, conditional completeness, stale-update rejection, atomic verification invalidation and audit, immutable schemas, invoker-permission reporting views, and real BASE/DSCR schema composition. Its scope and reproducible command are documented in [database verification](../supabase/VERIFICATION.md).

Still unverified in a hosted environment: OAuth and domain configuration, PostgREST behavior, deployed grants/RLS advisors, real session lifecycle and revocation, environment isolation, monitored recovery, and actual user acceptance. A test result from isolated PostgreSQL does not establish those properties.

## Measurement and reporting limits

- The system's unit of completion is a worksheet or an operations work item. `COMPLETE` does not establish that a loan funded.
- LO productivity and application-to-funding improvements require separate outcome evidence. The 5× and 77.7% figures are goals, not results produced by this build.
- LIA usage and result-link presence are declarations. They cannot substitute for LOS-linked touchpoint and funding-event attribution.
- Stage aging and MLP review duration measure calendar elapsed time, including waits and rework. They do not measure active labor hours.
- Application reports operate on records visible to the current identity. They must not be presented as company-wide results without an appropriately authorized, defined cohort.
- Lock-to-processing handoff is a workflow measure, not funding conversion. Date-only lock values and recorded transition timestamps have specific interpretation rules in the report methodology.
- The initial SQL reporting views have secured read permissions, but their legacy metric formulas are not established as equivalent to the revised application report calculations. Direct BI use requires formula and cohort parity tests first.

For an attribution pilot, finalize the join and measurement contract before collecting production claims: LOS loan identifier, LIA session/touchpoint identifiers, source system, source event ID, actor, event timestamp, application timestamp, funding event, and reconciliation result. The package provides an internal draft and normalized-event validation scaffold. The assigned owners must settle actual interfaces and missing-data behavior; no live event transport, verified source-loan binding store, or funded-loan attribution pipeline is implemented.

## Provisioning and change discipline

Apply `001_init.sql`, `20260919152621_workflow_integrity.sql`, `20260919181621_operations_work_items.sql`, then `20260919184011_operations_evidence_rules.sql`. The first migration on its own retains the original broad write paths. Apply and verify the completed sequence before exposing an application client to the environment. Test bootstrap files are for disposable databases only.

Reference seeding runs from a trusted process with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service key through client variables, frontend code, a committed file, or a shared artifact. The script inserts missing reference data, preserves existing investor rows, and rejects schema content conflicts under an already published version. It does not authenticate or validate the reference sources.

New users remain `PENDING` until assigned. The first administrator requires a deliberate trusted bootstrap. Ordinary access changes are made through the administrator interface. Engineering and the identity owner must verify that live session behavior follows the intended deactivation and role-change procedure.

Publish a new schema version when fields, ownership, requiredness, choices, or workflow meaning change. Confirm how existing worksheets will remain readable before deploying that version. Updates to investor reference content require source review and an explicit release process; captured snapshots provide history, not proof that a rule is correct.

Deployment remains manual. Review the destination, environment variables, build artifact, identity redirects, SPA routing, and rollback procedure as part of the release evidence. No remote hosting, project provisioning, or public publication was performed during this build.

## Historical source material

`griffin-ops-hub-strategy.md`, `griffin-paper-design-system.md`, and `field-inventory.csv` preserve the supplied attachment material for traceability. They contain historical planning assumptions and review prompts. Their schedules, named assignments, policy suggestions, and investor references must not be treated as current verified operational instructions.

The expanded platform preserves the CD, LOA preparation, and multi-product processing preparation fields in native work templates. It adds proposed coordination templates for other operational tasks and five source-derived MLP workflows. Source structure is not current policy validation. Operations and compliance owners must approve requiredness, routing, field meaning, retention, and completion criteria before live borrower use. See [the original attachment assessment](INTEGRATION-ASSESSMENT.md), [the Cadre reference assessment](CADRE-INTEGRATION-ASSESSMENT.md), [MLP workflow integration](MLP-WORKFLOW-INTEGRATION.md), and [integration boundaries](INTEGRATION-CONTRACT.md) for source disposition and connection boundaries.

Operations work uses a separate status machine and never changes the recorded worksheet or LOS stage. Readiness is required-field/check completeness, not credit eligibility, legal compliance, a funded loan, or successful external delivery. Notification copies are drafts for a human; their recipients and actual delivery are not configured. Handling-time entries are self-reported, distinct from elapsed time and measured savings.

## Processor-source release gates

The processor source capture adds three preparation-only forms and six read-only references. Operations must validate current controlled originals and resolve documented source conflicts before live use. The exception form's investor-decision block and business narrative certification/signature rows remain source-only text. Hub review does not act as an investor decision, borrower signature, or submission. Native draft form labels/order and source-only text are tested against pinned fixtures; user-selected routes preserve department/branch controls. Raw captures and credentials are excluded.

Owner review must cover source legal/timing conflicts, applicant/fair-lending language, full and unaltered evidence presentation, field types/options/requiredness absent from the consolidation, source recipients and branding, and missing linked forms/workbooks. No calculation, financial transfer, disclosure clock, investor status mapping or external integration was activated. Cadre retains processing execution. Verified LIA artifact-to-LOS joins still require the connector pilot and cannot be inferred from entered references.
