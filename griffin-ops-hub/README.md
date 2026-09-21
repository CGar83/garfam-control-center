# Griffin Ops Hub

**1.6.0 (2026-09-21)** turns the IA-aligned shell into a daily operations cockpit: role-aware Home with urgency lanes and claimable desk work, a shareable URL-driven queue with group-by-loan and column sort, a loan record with human-set coordination context, a phase stepper, named blockers, and one activity timeline, plus keyboard shortcuts and a recents-aware command palette. The lead / intake phase is gone; six operations phases remain. See [Daily operations 1.6](docs/DAILY-OPERATIONS-1.6.md).

A unified loan-operations platform for preparation, MLP coordination, submissions, closing requests, exceptions, and post-close follow-up. Work items share loan records, named owners, saved revisions, review evidence, handoff history, and recorded handling time. A source-backed loan flow guide connects responsibilities to native work. The existing seven-section DSCR verification workflow remains available under **DSCR submissions**.

**Cadre is the processing build owner identified by the user.** The Hub coordinates preparation, handoffs, evidence follow-up, and human review. Cadre's current delivery state and interface remain unverified; the Hub does not recreate its processing engine.

**This delivery is not a deployed production system.** No hosted Supabase project, Google sign-in configuration, LOS connection, or public deployment was created or changed. Use fictional data in local mode. Production requirements and accountable owner roles are in [Production readiness](docs/PRODUCTION-READINESS.md).

This update adds source-faithful Title and Escrow, Self-Employed Business Narrative, and Investor Exception draft forms, plus six searchable closing/post-close reference excerpts. Form search, required-entry highlighting, section progress, previous/next navigation and keyboard/sticky saving work across the operations editor. Original fifteen template definitions remain unchanged. See [Processor integration assessment](docs/PROCESSOR-INTEGRATION-ASSESSMENT.md) for exact source disposition and content-preservation boundaries.

## Run the local review

Use Node **24.15.0 or later within Node 24**. The package requires `>=24.15.0 <25`.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Leave both Supabase connection values unset to use local mode. The workspace begins empty; **Load sample operations** on Home adds fictional work examples. The separate **Load sample portfolio** action on DSCR submissions adds worksheet examples when the demo is empty. The role selector lets you review LO, LOA, MLP, Processing, Closing, Lock Desk, Manager, and Admin workflows. Reset removes this browser's demonstration data after confirmation.

Browser storage persists between visits on the same origin. It is editable by the browser user and provides neither real authentication nor a protected audit log. It is not appropriate storage for live borrower records.

## Integrated workflow catalog

The library contains **18 native operations templates plus DSCR submissions: 19 workflow types**.

- CD request: 38 source fields, five form sections, human review flags, and copyable notification drafts. No CD issuance or actual messages are sent.
- LOA preparation: all 96 source controls across 14 sections; four source QC attestations gate readiness. Optional evidence is not falsely required on every loan.
- Processing preparation and handoff: all 166 original field keys plus product selection, covering DSCR, Bank Statement, HELOAN/HELOC, Asset Based, and Full Doc. This is preparation context for the responsible team, not Cadre processing execution or an eligibility engine.
- Hub coordination templates: lock request, closing coordination, condition follow-up, exception review, post-close QC, and custom loan work. These are proposed workflows, not adopted company policies.
- Evidence and follow-up: versioned condition/exception coordination, explicit unknown applicability and source binding, evidence states and routing reasons, document references, human disposition, and a Cadre handoff record. External references remain manually recorded; no source borrower files or investor/gate rules are imported.
- MLP coordination: welcome, document chase, appraisal coordination, borrower updates, and signing coordination. The **MLP desk** chip on Work (`/operations?desk=mlp`) brings that department's work together; **Flow** (`/journey`) connects source-described handoffs with loan-linked work. Cadence is human planning context, not an automatic timer or verified company policy.
- DSCR submission worksheet: original versioned seven-section LO → MLP → Processing flow with field verification.

[Attachment assessment and disposition](docs/INTEGRATION-ASSESSMENT.md) documents what each archive contributed, what was changed, and what remains unverified. [Cadre source assessment](docs/CADRE-INTEGRATION-ASSESSMENT.md) explains the two later processing-reference archives and their exclusions. [MLP workflow integration](docs/MLP-WORKFLOW-INTEGRATION.md) covers the 196-page training and four workflow images, including ownership conflicts, clipped forms and excluded private examples. [Connector boundaries](docs/INTEGRATION-CONTRACT.md) define the proposed LendingPad, Cadre, HubSpot, and LIA responsibilities.

## What the platform does

| Area                | Implemented scope                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily work          | Role-aware Home (due today, past target, blocked, ready for review, unclaimed), URL-driven queue with list / group-by-loan / board views, column sort, Claim from the row, desk chips with counts, searchable library, and loan-linked activity |
| Loan spine          | Human-set Hub coordination phase, observed LOS status and note (labelled unverified), six-phase stepper with counts, Blocked panel with reasons, suggested next form, work grouped by phase, unified activity timeline |
| Navigation          | Live rail counts, contextual breadcrumb and title, global Start work (`N`), keyboard shortcuts, command palette with recents and actions |
| MLP coordination    | MLP department queue, five native work templates, source-backed loan flow, communication outcomes, evidence references and human next actions                 |
| Operations work     | Draft, queue, active work, blocked, review, complete, cancel, and explicit reopen with role checks and recorded reasons                                       |
| Operations evidence | Versioned templates, required field/check gates, atomic change history, PDF copies, and self-reported handling-time entries                                   |
| DSCR worksheet      | Seven sections, conditional fields, ownership by stage, completeness, and human field verification                                                            |
| Saved work          | DSCR serialized autosave; explicit work-item save and save-before-handoff/export; unsaved-navigation protection and stale-revision rejection                  |
| Handoffs            | LO submission, MLP review, returns with reasons, processing handoff/acceptance, and workflow completion                                                       |
| Record integrity    | Trusted field differences and audit events saved together; LO changes invalidate prior verification                                                           |
| Reporting           | Submission timing/returns and LIA declarations; departmental work status, completion, past-target work, self-reported handling-time coverage, and CSV exports |
| Access              | Local demonstration identities; a separate Supabase adapter with assigned roles, loan/branch access, and database-enforced mutations                          |
| Reference history   | Pinned worksheet schema and selected investor reference snapshots; immutable published schema versions                                                        |
| Export              | Multipage PDF from saved revisions, browser print, escaped CSV, and a saved coordination JSON packet with explicit no-send and unverified-receipt markers     |

The source inventory is retained in [field-inventory.csv](docs/field-inventory.csv). Automated coverage checks preserve DSCR-relevant input keys, including address leaves and composite controls. The original inventory also contains fields for other products; those fields are preserved in the multi-product processing work template and are not all active DSCR inputs. CD request preparation and operational checklists are now native modules. Authoritative disclosure issuance, compliance-date calculation, and vendor actions remain outside this build.

The supplied investor configuration is imported reference material. It remains `UNVERIFIED_REFERENCE`; human verification of a worksheet field does not validate the underlying investor guideline. The platform does not issue credit approvals or denials, determine TRID deadlines, or export a loan to LendingPad.

## Outcome and attribution limits

`COMPLETE` means **worksheet or operations work complete**, according to the record type. It is not a funding event.

LIA usage and result-link presence are LO declarations. The LOS Connector is not connected. These records cannot establish funded-loan attribution, labor savings, 5× LO productivity, or a 77.7% application-to-funding improvement. The last two figures are strategic targets, not measured results.

A manually recorded Cadre run/finding reference does not prove that Cadre received a handoff, returned a result, or produced a LIA touchpoint. Evidence follow-up completion is not LOS condition clearance.

The next outcome-measurement dependency is a verified join between stable LOS loan identifiers, LIA touchpoint events, and application/funding events, alongside a handling-time baseline. Do not substitute worksheet throughput or elapsed queue time for those outcomes.

## Verification

```sh
npm run check
```

`npm run check` runs lint, application tests (Vitest), and the production build. The disposable PostgreSQL gate (`supabase/tests/run-local.mjs`) ships with the database repository, not this application folder.

See [the release verification record](VERIFICATION.md) for final commands, test totals, and known gaps. See [database verification](supabase/VERIFICATION.md) for the tested database boundaries. The isolated PostgreSQL checks use test stand-ins for Supabase auth; they do not prove a hosted project's OAuth, PostgREST, recovery, or session configuration.

Current package configuration: React 18, React Router 7.18.4, Vite 8.3.0, `@vitejs/plugin-react` 6.1.1, and Vitest 5.0.1. `package-lock.json` records the resolved dependency set; use `npm ci` to reproduce it.

## Configure a separate Supabase test environment

These are manual integration steps, not actions already performed by this delivery. Complete the [release gates](docs/PRODUCTION-READINESS.md) before any live borrower use.

1. Have the infrastructure owner provision a test project and configure its identity provider, redirect URLs, and permitted organization access. The browser's Google domain hint is not an authorization boundary. The database signup trigger currently checks `griffinfunding.com`; reconcile provider settings with that server check.
2. Apply **all migrations in order** through the chosen migration process:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/20260919152621_workflow_integrity.sql`
   - `supabase/migrations/20260919181621_operations_work_items.sql`
   - `supabase/migrations/20260919184011_operations_evidence_rules.sql`

   The initial migration alone contains the original broad write paths and is not the completed security configuration. Never use `supabase/tests/bootstrap.sql` on a Supabase project.

3. Provision reference data from a trusted local process. Supply `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` through an approved secret-handling mechanism, then run:

   ```sh
   npm run seed
   ```

   The seed inserts missing investor references, schema versions, and immutable operations template versions. It does not overwrite existing investor references or an immutable published schema. It rejects a published schema whose content differs at the same version; publish a new version instead. Reference seeding is not guideline validation. The remote adapter requires published schemas and does not silently fall back to bundled data.

4. Create a git-ignored `.env.local` with the browser-safe project URL and publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   VITE_ALLOWED_DOMAIN=griffinfunding.com
   ```

   `VITE_SUPABASE_ANON_KEY` remains supported for an existing legacy client-key configuration. Never put a service-role or secret key in a `VITE_` variable or browser bundle. A partially configured connection fails explicitly instead of switching to demo storage.

5. Sign in with a verified organization identity. New profiles start `PENDING`. The infrastructure owner must deliberately bootstrap the first administrator through a trusted database channel. Then assign active users, branches, and LOA-to-LO relationships through **Users & roles**. Test permitted and denied access using separate identities before a pilot.
6. Verify the deployed API path end to end, including inactive users, unauthorized loans, failed saves, conflicting sessions, and audited overrides. Do not treat a successful connection badge as production verification.

## Manual deployment

`npm run build` writes `dist/`; `npm run preview` serves it locally for inspection. `netlify.toml` provides a static build definition and SPA route fallback. A hosting owner must configure the intended environment, review build-time client variables, configure identity redirects, and execute the deployment manually after release review. No site, DNS change, or production deployment was created by this delivery.

## Source and engineering map

| Location                                                                       | Purpose                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/data/schemas/`                                                            | Versioned BASE and DSCR form definitions                                         |
| `src/data/investors.js`                                                        | Imported investor/product references, not certified current rules                |
| `src/lib/schema.js` and `src/lib/stages.js`                                    | Form composition, conditional display, field ownership, and workflow gates       |
| `src/lib/db/`                                                                  | Isolated local adapter and authenticated Supabase adapter                        |
| `src/lib/reports.js` and `src/lib/operationsMetrics.js`                        | Submission and operations report calculations                                    |
| `src/data/operationsTemplates.json`                                            | Fifteen native operations templates with source provenance and pinned versions   |
| `src/data/loanJourney.json`, `src/lib/journey.js`, `src/pages/LoanJourney.jsx` | Source-backed loan flow and related work, without inferred LOS milestones        |
| `src/data/evidenceReference.json` and `src/lib/coordination.js`                | Document-name provenance, human evidence summaries, and internal handoff packets |
| `src/lib/operationsPolicy.js`                                                  | Shared work-item role and transition rules                                       |
| `server/integrations/contract.mjs`                                             | Normalized-event validation scaffold, with no live transport                     |
| `supabase/migrations/`                                                         | Schema, access boundaries, and atomic mutation functions                         |
| `tests/` and `supabase/tests/`                                                 | Application and disposable-database verification                                 |

[The original strategy document](docs/griffin-ops-hub-strategy.md) and [original design document](docs/griffin-paper-design-system.md) are historical attachment references. Their dates, assignments, proposed policies, implementation claims, and roadmap statements have not been adopted as verified current operating instructions. This README, the readiness document, current source code, and final verification record describe the delivered build.
