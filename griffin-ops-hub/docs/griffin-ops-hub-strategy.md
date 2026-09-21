# Griffin Ops Hub: Implementation Strategy

**Source meeting:** Submission Worksheet Updates, Sept 18, 2026 (Leticia Dalton, Andromeda Moreno, Lien King, Cristin Nicholson, Chris Garmon)
**Source artifact:** `deploy-6a15f47ce76542c9e9ea1abf.zip` (Processing Submission Worksheet, single-file React app, 68 KB)
**Companion file:** `dscr-hub-field-inventory.csv` (166 fields extracted from the current form, ready for Lety and Andromeda's line-item review)
**Prepared:** Sept 18, 2026
**Freshness:** Production-state claims in this doc expire Oct 16, 2026. Reverify after that.

---

## 1. The call

Build the hub as a stage-tracked loan record, not as a form collection. Every module (submission worksheet, CD request, checklists, disclosure tracker) hangs off a `loan_number` row and writes timestamped events to one table. That single design choice delivers everything the meeting asked for: role handoffs, MLP verification checkboxes, trend reports, coverage when people are out, and loan-number search.

Stack: **Vite + React** front end on Netlify, **Supabase** (Postgres, Auth, RLS, Realtime, Edge Functions) as the backend. Google SSO restricted to `@griffinfunding.com`. No passwords to manage. LendingPad and HubSpot connections come later through adapter functions, never in Phase 1.

Sequence: DSCR worksheet v2 first (Tuesday Sept 22 for the field config, one more week for persistence and roles), then fold the CD request form and checklists in, then convert the remaining product types to schema-driven forms, then wire the LOS.

**Constraint check.** This work sits on the binding constraint. Lock-to-STP conversion is 62% against an 80% need (snapshot mid-July 2026, stale after Aug 7; reconfirm). The LO → MLP → STP handoff is exactly the segment this hub instruments. The stage events table becomes the first real measurement of where locked files stall. That is the strongest reason to build this well rather than fast.

**Filter stack.** Level 1: moves the constraint directly. Level 2: hits all three (removes retyping and email handoffs; MLP verification improves decision accuracy; timestamps produce attribution data). Level 3: opportunity cost is LOS Connector time this week; mitigated below by adding a LIA-touch field to the worksheet so the hub doubles as an attribution substrate. Level 4: platform owner is Chris; content and config owner must be Lety's group or this becomes a Chris-only bottleneck. Section 9 addresses that.

---

## 2. What the meeting decided, mapped to build items

| # | Ask (source) | Decision status | Build item |
|---|---|---|---|
| 1 | Universal timestamped worksheet: LO fills, MLP verifies with checkboxes, processing accepts, each with timestamps (Lety, 00:03:24) | Aligned | Stage machine + `field_events` table + role-aware field rendering |
| 2 | Backend database with individual user credentials and profiles (Chris, 00:04:33) | Committed | Supabase Auth + `profiles` + RLS |
| 3 | Trend and performance reporting; identify weak submissions and unverified handoffs (Lety, 00:05:23) | Requested | Reports module on SQL views |
| 4 | Backfill data into MLP and processing report tabs (Lety, 00:06:25) | Requested | CSV/Sheets export of views; later direct feed |
| 5 | Consolidate all third-party forms into one hub with role-based logins (Chris, 00:13:02) | Strongly supported | Hub shell with module registry |
| 6 | Loan-number portal: search, access, manage, export; management sees all; coverage when out (Andromeda, 00:21:44) | Agreed | Loan record as spine; queue views per role |
| 7 | Universal dynamic form: base fields plus product-specific fields loaded on program select (Lety, 00:24:12) | Agreed | Schema-driven form engine |
| 8 | Start with DSCR only; then whatever is highest volume (HELOC/HELOAN per Lien) | Agreed | Phase 1 = DSCR; Phase 3 = remaining types |
| 9 | Gov templates (VA, FHA, Home Possible, Home Ready) drafted by Lien, configured by Chris | Assigned | Phase 3, schema import |
| 10 | Export options: PDF, print, email; prefer living in LendingPad (Cristin, 00:20:59) | Direction set; LP not now | Export adapter interface; PDF now, LP later |
| 11 | Live weekly reporting to branch managers instead of monthly (Lety, 00:17:43) | Requested | Scheduled digest via pg_cron + Edge Function |
| 12 | Disclosure missing-items tracking currently in Morgan's Google Sheet (00:16:54) | Flagged, "more to come" | Disclosure Tracker module, Phase 2 |
| 13 | CD request form with processing tracker integration, two steps from done (Chris, 00:06:25) | In progress | Migrate into hub as second module |
| 14 | LOA and processing checklists Chris built earlier; possible merge (Lien, 00:27:30) | Under review | Checklist modules or role overlays on the worksheet |
| 15 | ELOs/LOAs on a parallel fill-and-verify track (Lety, 00:05:23) | Idea | LOA role in the same schema |
| 16 | Lock desk as gatekeeper; lock only at STP (Lety, 00:15:54) | 3 to 6 month thinking | Not a build. The stage data settles the debate. |
| 17 | Scenario desk (Chris, 00:17:43) | Future conversation | Future module; out of scope here |
| 18 | Bill moved class alignment on Sept 17 (Chris, 00:02:11) | Must fix before Tuesday | Move investor classes into DB; update Button Finance to Plan C |

---

## 3. Current state of the zip

One file, `index.html`. React 18 UMD from cdnjs, Babel Standalone compiling JSX in the browser, html2pdf for export, Google Fonts (DM Sans, Newsreader).

What it does well:

- Five product types (DSCR, Bank Statement, HELOAN/HELOC, Asset Based, Full Doc) with a shared shell and a type-specific Section 4.
- Investor overlay logic. `PR` maps type → Class A/B/C → products. `CFG` holds per-investor limits (min FICO, min DSCR, max LTV, STR rules, seasoning, reserves, prepay options, notes) extracted from 50 guideline PDFs. Selecting an investor surfaces its rules inline.
- Seven sections, 166 field keys, conditional rendering on purpose, amortization, vesting, rental type, and investor.
- Clean PDF export named `{ClientLastName}_{LoanNumber}.pdf`.

What it lacks against the meeting:

| Gap | Impact |
|---|---|
| No persistence. Refresh loses the form. | Nothing can be timestamped, handed off, searched, or reported. |
| No identity. "Submitted By" is a free-text MLP name. | No per-role verification, no accountability, no coverage. |
| Submit only flips a local `done` flag. | No stage transitions, no queue for the next role. |
| Form is JSX, not data. | Lety's line-item edits require code changes; universal dynamic form is impossible without a schema layer. |
| Investor config is hardcoded. | Bill's Sept 17 class change requires a redeploy. |
| Babel compiles at runtime. | Adds roughly 3 MB and a visible compile delay on every load. Fine for a prototype, wrong for a daily tool. |
| Design tokens are the older editorial variant (Newsreader, shadows, rounded radii). | Internal operator surfaces route to `gf-new` per current design routing. Not available in this environment; fall back to `gf-design-system` Track B tokens when rebuilding the shell. |
| Email export unwired. No LP or HubSpot path. | Expected; the meeting deferred these. |

The 166-field inventory is in the companion CSV with empty columns for Keep/Remove/Edit, Owner Role, and MLP Verifies. That is the spreadsheet Lety said she would produce. Send it to her and Andromeda so the review starts from the real field list rather than a screenshot.

---

## 4. Target architecture

### 4.1 Hub shell

One app, one login, one left nav. Modules register themselves with a name, icon, roles allowed, and a route. The landing view is role-specific: an LO sees their loans and drafts; an MLP sees the verification queue; a processor sees files submitted to processing; a manager sees the branch board; admin sees everything plus configuration.

Global loan search by loan number sits in the header. Hitting a loan opens the **Loan Record**: header card (borrower last name, loan number, product, investor, LO, MLP, processor, current stage, days in stage) and tabs for every module that has data on that loan (Submission Worksheet, CD Request, Disclosures, Checklists, Activity).

Modules at launch and near-term:

| Module | Phase | Replaces |
|---|---|---|
| Submission Worksheets | 1 | Current single-file app, LendingPad notes copy-paste |
| CD Request | 2 | Chris's redesigned CD form (finish the two tracker steps here) |
| LOA Checklist, Processing Checklist | 2 | Standalone HTML checklists |
| Disclosure Tracker | 2 | Morgan's Google Sheet |
| Reports | 2 | Monthly manual sends |
| Admin: Users, Form Schemas, Investor Configs | 1 (users), 3 (schemas UI) | Code edits and redeploys |
| Scenario Desk | Later | Not yet designed |

### 4.2 Backend: Supabase

Why Supabase over the alternatives:

| Option | Verdict |
|---|---|
| Supabase | Postgres, Auth with Google provider, Row Level Security, Realtime, Edge Functions, pg_cron. Already in the LIA stack plan. One free-tier project covers this volume. |
| Firebase | Document model fights the relational reporting Lety wants. Security rules are harder to reason about than RLS. |
| Next.js + Flask (Processing Refinery pattern) | Works, but adds a server to run and secure. Nothing here needs custom server code that an Edge Function cannot do. |
| Netlify Forms or Google Sheets | No roles, no stage tracking. Recreates the problem. |

Auth: Google provider, `hd=griffinfunding.com` hint on the client, and a database trigger that rejects any `auth.users` insert whose email domain is not `griffinfunding.com`. New users land as role `pending` until an admin assigns a role. That keeps Chris out of password resets.

### 4.3 Data model

```sql
-- Identity
profiles (id uuid pk -> auth.users, email, full_name, role, branch, manager_id, active, created_at)
  -- role enum: LO, LOA, MLP, PROCESSOR, LOCK_DESK, CLOSING, MANAGER, ADMIN, PENDING

-- The spine
loans (loan_number text pk, borrower_last, product_type, investor_id, lo_id, mlp_id,
       processor_id, lock_date, disclosure_sent_at, current_stage, created_at, updated_at)

-- Form definitions (versioned)
form_schemas (id, form_type, version, schema jsonb, published_at, published_by)

-- Investor rules, moved out of code
investor_configs (id text pk, name, class, product_types text[], config jsonb,
                  effective_from date, effective_to date null)

-- One row per worksheet instance
worksheets (id uuid pk, loan_number fk, form_type, schema_version, data jsonb,
            stage, created_by, created_at, updated_at)

-- Every meaningful action, one row. This is the reporting gold.
field_events (id, worksheet_id, field_key, action, actor_id, actor_role, value_snapshot, at)
  -- action enum: COMPLETED, EDITED, VERIFIED, UNVERIFIED, FLAGGED

stage_transitions (id, worksheet_id, loan_number, from_stage, to_stage, actor_id,
                   actor_role, note, at)

pushbacks (id, worksheet_id, from_role, to_role, reason, resolved_at, at)

-- Other modules attach the same way
cd_requests (id, loan_number fk, data jsonb, stage, ...)
disclosure_items (id, loan_number fk, item, status, owner_id, due_at, resolved_at)
checklist_runs (id, loan_number fk, checklist_type, data jsonb, completed_by, completed_at)
```

Two fields must be added to the base worksheet that do not exist today: **Lock Date** and **Disclosure Sent Date**. Without lock date the hub cannot compute lock-to-STP time, and that number is the whole point. Ask Lety to confirm both as required LO fields.

Add one more: **LIA Used** (Y/N) with an optional Guided Loan Pricing result link. Two seconds for the LO; it gives the hub a LIA-touch flag on every locked file until the LOS Connector exists. This is the cheapest attribution instrument available this quarter.

No SSN, DOB, or full account numbers enter the hub. Loan number is the join key to LendingPad. The current form already respects this; keep it that way in the review.

### 4.4 Stage machine

```
DRAFT (LO)
  -> LO_SUBMITTED            LO clicks Submit to MLP. Required fields enforced. Timestamp.
  -> MLP_REVIEW              MLP opens it. Auto-transition on first open.
  -> RETURNED_TO_LO          MLP pushback with reason. Counts against LO submission quality.
  -> MLP_VERIFIED            All verifiable fields checked. Timestamp.
  -> SUBMITTED_TO_PROCESSING MLP clicks Submit to Processing. This is the STP event.
  -> PROCESSING_ACCEPTED     Processor opens and accepts, or returns to MLP.
  -> RETURNED_TO_MLP
  -> COMPLETE                Processor marks conditions cleared (later: CTC hook from CD module).
```

Rules: transitions are functions in the app, not free-form status edits. Every transition writes a `stage_transitions` row. Managers and admins can override any stage with a required note. Reassignment (MLP out sick, LO on vacation) is a profile-id change on `loans`, logged, and the queue updates in real time for whoever inherits it.

### 4.5 Schema-driven forms

The universal dynamic form only works if fields are data. Convert the current JSX into a JSON schema with four layers that merge at render time:

1. **Base**: loan snapshot, borrower, property, submission. Same for every product.
2. **Product module**: DSCR, BSL, HELOC, ASSET, FULL today; VA, FHA, HOME_POSSIBLE, HOME_READY when Lien delivers.
3. **Investor overlay**: the existing `CFG` rules, now read from `investor_configs`, injecting limits, hints, and notes.
4. **Role overlay**: which role owns each field, which fields the MLP verifies, which fields processing sees read-only.

Field definition shape:

```json
{
  "key": "dscr",
  "label": "DSCR Ratio",
  "type": "number",
  "step": 0.01,
  "required": true,
  "owner": "LO",
  "verify": "MLP",
  "showIf": { "product": ["DSCR"] },
  "hint": { "fromInvestor": "mD", "template": "Min {value} for {investor}" },
  "section": "dscr_qualification"
}
```

`showIf` supports equality, inclusion, and simple AND/OR so the existing conditionals (purpose, amortization, vesting, rental type, DSCR below 1) port without special cases. The renderer is one component that walks sections and fields. Section 4 of the current form becomes five product modules that swap in by `product_type`.

Versioning: every worksheet stores `schema_version`. A submitted worksheet always renders with the schema it was filled under. Lety's edits publish a new version; in-flight drafts can opt in.

### 4.6 Role-aware rendering and verification

The MLP sees the same form the LO filled, read-only for LO-owned fields, with a verify checkbox beside each field marked `verify: MLP`. Checking writes a `VERIFIED` event with actor and timestamp. A field the MLP changes writes `EDITED` and preserves the LO's value in `value_snapshot`. Submit to Processing is disabled until every required verifiable field is checked, or the MLP overrides with a note.

Processing sees LO and MLP layers read-only and its own checklist fields editable. Same event pattern.

That is Lety's "check check check" with a timestamp on every check, and it produces the "who submits garbage, who does not verify" data without any extra work from anyone.

### 4.7 Security: Row Level Security

| Role | Can read | Can write |
|---|---|---|
| LO | Own loans | Own loans in DRAFT or RETURNED_TO_LO |
| LOA | Loans where assisting LO matches | LO-owned fields on those loans |
| MLP | Assigned loans plus the unassigned LO_SUBMITTED queue | Verification and MLP fields; stage transitions in their range |
| PROCESSOR | SUBMITTED_TO_PROCESSING and later | Processing fields and transitions |
| LOCK_DESK, CLOSING | Loans in their module scope | Their module's data |
| MANAGER | Branch (via profiles.branch) | Reassign, override with note |
| ADMIN | All | All plus schemas and configs |

Policies live in Postgres. The front end never decides who can see what; it only hides what the user cannot access anyway.

### 4.8 Export adapters

One interface, several implementations, all human-triggered by a button on the loan record:

| Adapter | Phase | Notes |
|---|---|---|
| PDF (html2pdf, existing) | 1 | Keep. Render from the stored `data`, not live DOM state, so exports match what was submitted. |
| Print | 1 | Existing. |
| Email (Edge Function + Resend or Gmail API) | 2 | Lety was unsure email is even wanted. Build it behind a flag. |
| LendingPad notes or document upload | 4 | Cristin's preference: live in the LP file. LendingPad API availability and scope for document push `[NEEDS VERIFICATION]`. Design the adapter now, wire it when confirmed. |
| HubSpot | 4 | Chris already started this on the CD form. Same adapter shape. |

Guardrail: exports to the LOS stay explicit-click, human-initiated, and logged. No scheduled or automatic write path to LendingPad, in line with the no-unattended-LOS-writes rule.

### 4.9 Reporting

Build as SQL views first, dashboards second. Views are stable; dashboards get redesigned.

Core views:

- `v_stage_aging`: every open worksheet with current stage, hours in stage, owner. Powers the queues and the manager board.
- `v_lo_submission_quality`: per LO, last 30/90 days: submissions, pushback count, pushback rate, median required-field completeness at first submit, median hours DRAFT → LO_SUBMITTED.
- `v_mlp_verification`: per MLP: files handled, median hours LO_SUBMITTED → MLP_VERIFIED, percent of verifiable fields checked, override count.
- `v_lock_to_stp`: per loan: lock_date → SUBMITTED_TO_PROCESSING in calendar days; per branch and per LO rollups; percent under 3, 5, and 7 days. This is the constraint metric.
- `v_disclosure_gaps`: open disclosure items by LO and age (Phase 2, replaces Morgan's sheet).

Delivery: a Reports module in the hub for managers, plus a **Monday 7:00 AM digest** to branch managers via pg_cron → Edge Function → email or Slack. Weekly, live, automatic. That answers Lety's request directly and removes the "whenever Morgan remembers" failure mode.

Backfill into existing MLP and processing report tabs: expose each view as a CSV endpoint (Edge Function with a signed token) so a Google Sheet `IMPORTDATA` pulls it. Zero manual retyping, no extra build.

---

## 5. Phased plan

| Phase | Window | Ships | Depends on |
|---|---|---|---|
| **0: Prep** | Sept 18 to 21 | Field inventory CSV to Lety and Andromeda. Supabase project, Google auth, `profiles`, `investor_configs` seeded from `CFG` with Bill's Sept 17 class changes applied. Vite scaffold with routing and auth shell. DSCR JSX converted to schema JSON. | Nothing external |
| **1: DSCR v2** | Target Tue Sept 22 for config; roles and persistence by Fri Sept 26 | Login. DSCR worksheet reading Lety's finalized fields. Save and resume. LO → MLP → Processing stages with timestamps. MLP verify checkboxes. Pushback. Loan-number search. PDF export from stored data. Basic queues per role. Admin user list. | Finalized DSCR field list from Lety and Andromeda |
| **2: Consolidate** | Sept 29 to Oct 10 | CD Request module migrated, processing tracker integration finished. LOA and Processing checklists as modules. Disclosure Tracker replacing the Google Sheet. Reports module with the five views. Monday digest live. Email adapter behind a flag. | Lien shares checklists (assigned in meeting); Morgan's sheet columns |
| **3: Universal form** | Oct 13 to 31 | BSL, HELOC/HELOAN, Asset, Full Doc converted to schema modules (HELOC first per Lien). Gov templates configured from Lien's drafts. Investor config admin UI so class changes are a row edit. Schema versioning UI for Lety's group. | Lien's gov templates |
| **4: Connect** | Nov onward | LendingPad backfill by loan number and export adapter. HubSpot adapter. Scenario Desk module. Lock-desk gating analysis from stage data. Hub stage events consumed by LIA Pipeline Manager (Agent 10). | LP API confirmation; scenario desk design conversation |

Honest scoping on Tuesday: the one-hour estimate given in the meeting covers loading Lety's field decisions into the schema. It does not cover auth, persistence, and the stage machine. Those are three to four focused evenings. Say that to Lety now, before Tuesday, so the DSCR config lands on time and the tracking layer lands the same week without anyone feeling a miss.

---

## 6. Phase 0 and 1 build order (for Chris)

1. Create Supabase project. Turn on the Google provider. Add the domain-restriction trigger. Create `profiles` with role enum and a trigger that inserts a `PENDING` profile on signup.
2. Create `investor_configs` and seed it from the existing `CFG` and `PR` objects with a short script. Apply Bill's Sept 17 realignment and set Button Finance to Class C. Add `effective_from`.
3. Create `loans`, `form_schemas`, `worksheets`, `field_events`, `stage_transitions`, `pushbacks`. Write RLS policies per the table in 4.7. Test with three test users, one per role.
4. Scaffold Vite + React. Routes: `/login`, `/`, `/loans/:loanNumber`, `/worksheets/:id`, `/queue`, `/admin/users`. Auth context reading the Supabase session and profile.
5. Port the current `index.html` component library (`Cd`, `L`, `I`, `Pill`, `YN`, `CkP`, `Tx`, `CO`, `CC`) into components. Keep the visual language for now; reskin in Phase 2 when the shell is stable.
6. Write `schemas/base.json` and `schemas/dscr.json` from the current Sections 1 through 7. Write the schema renderer. Confirm the rendered DSCR form matches the current one field for field before applying Lety's edits.
7. Implement `transition(worksheetId, toStage, note)` as a Postgres function with role checks, so the rule lives in the database and the UI cannot bypass it.
8. Implement verify checkboxes writing `field_events`. Gate Submit to Processing on verification completeness.
9. Loan search: `loans` lookup by number, create-if-missing when an LO starts a worksheet.
10. PDF export from `worksheets.data` plus `schema_version`.
11. Apply Lety and Andromeda's field decisions as `dscr.json` v2. Publish. Ship to Netlify.
12. Onboard the five meeting participants as first users with correct roles. Have one real DSCR file walk LO → MLP → Processing before the branch manager presentation.

---

## 7. Decisions needed from Lety's group

Send these with the field inventory. Each one changes the build.

| Question | Why it matters |
|---|---|
| Confirm Lock Date and Disclosure Sent Date as required LO fields. | Without them the hub cannot report lock-to-STP time. |
| Which fields does the MLP verify versus edit? Mark the `MLP Verifies?` column. | Drives the checkbox layer and the Submit-to-Processing gate. |
| Does the LO see Section 7 (Plan B/C, Processing Readiness) or is that MLP-only? | Today the whole form is one role. Ownership per section must be explicit. |
| Can an MLP submit to processing with unverified fields if they leave a note? | Override policy. Default proposal: yes, with a required note, and it shows in reports. |
| Who assigns MLPs to LOs: fixed mapping, branch pool, or first-come queue? | Determines whether `loans.mlp_id` is set at creation or claimed from a queue. |
| Is email export wanted at all, or is PDF plus future LendingPad enough? | Lety hesitated. Skipping email saves Phase 2 time. |
| Who owns form content after launch? | Proposal: Lety's group owns fields and checklists through the admin UI; Chris owns the platform. |
| Branch manager sign-off: required before LOs are told to use it, or roll out and inform? | Cristin said they have no choice. Confirm the sequence. |

---

## 8. Migration notes for the other forms

**CD Request form.** Already redesigned with a processing-tracker integration two steps from populating. Move it into the hub as its own module keyed by loan number. The tracker feed becomes a `loans` read rather than a separate pull. Its "Review items flagged for team review" pattern maps directly onto `field_events` with action `FLAGGED`.

**LOA and Processing checklists.** Two options. Merge them as role overlays on the submission worksheet (an LOA fills LO fields; processing checks its items on the same record), or keep them as standalone `checklist_runs` attached to the loan. Recommendation: standalone for Phase 2 so Lien and Lety can review without blocking DSCR v2, then merge whichever items duplicate worksheet fields in Phase 3. Lien offered to share them; that unblocks the decision.

**Disclosure Tracker.** Morgan's Google Sheet columns become `disclosure_items`. Each item has an owner (LO) and an age. The weekly digest lists open items by LO and branch. Lety said Chris will get involved here; this is the fastest visible win for branch managers after the worksheet itself.

**Scenario Desk.** Chris raised it; the group wants a separate conversation. Do not fold it into this plan. Note that a scenario desk module would be the natural front door for Guided Loan Pricing runs from inside the hub, which strengthens the LIA-touch field in 4.3.

---

## 9. Risks and guardrails

| Risk | Mitigation |
|---|---|
| Scope creep. Chris said it in the meeting: "getting ahead of myself as usual." | Phase gates. Nothing from Phase 2 ships before one real DSCR file has walked all three roles. |
| Single point of failure on Chris for content changes. | Schema and investor config in the database from day one; admin UI in Phase 3 so Lety's group edits fields without a deploy. Document the schema format in the repo README. |
| Borrower PII in a new system. | Domain-restricted SSO, RLS, no SSN or DOB fields, Supabase encryption at rest, 24-month retention policy on completed worksheets. Confirm with compliance before branch-wide rollout. |
| Investor config drifts from reality (Bill's Sept 17 change is the live example). | `effective_from` dates and an admin edit path. Tie config review to the Guideline Diff workflow when investors publish updates. |
| Adoption. LOs already have "too many systems." | The hub replaces systems rather than adding one. Retire the standalone worksheet URL, the CD form URL, and the Google Sheet as each module ships. Lety's framing: "throw it away, it's all in here." |
| Runtime compile and CDN dependencies. | Vite build removes Babel Standalone. Pin React versions. |
| LendingPad integration expectations. | Lety explicitly deferred. Keep it out of every demo until the adapter is real. |
| TRID timing on the Disclosure Tracker. | The tracker records status and dates only. It never generates or sends disclosures. |

Standing guardrails apply: no unattended writes to the LOS, every stage transition and verification logged with timestamp and actor, low-confidence data confirmed by a human before it moves forward, and no credit decision language anywhere in the hub. "Processing Readiness: Clean / Moderate / High Risk" is a workflow flag, not an approval; keep the label that way.

---

## 10. Strategic note

Two things in this meeting matter beyond the build.

First, the stage events table is the first instrument Griffin will have on the lock-to-STP segment. Within four weeks of Phase 1 the data will show whether the constraint is LO submission quality, MLP verification lag, or processing intake. That reframes Lety's lock-at-STP idea from opinion to a numbers conversation, and it is the strongest D10 update available this quarter.

Second, the hub is a LIA-adjacent surface with daily LO and MLP usage. Adding the LIA Used flag costs nothing and starts attribution coverage on funded loans before Cadre ships the LOS Connector. Pillars B and E both move. Frame it that way to Chloe when she is back.

---

## Appendix A: Field inventory

See `dscr-hub-field-inventory.csv`. 166 fields across seven sections, with section, key, label, current required flag, input type, and options, plus empty columns for Keep/Remove/Edit, Owner Role, MLP Verifies, and Notes. Section 4 rows cover all five product variants; filter to `DSCR Qualification + Rental Income` for the Tuesday review.

## Appendix B: Stage transition function sketch

```sql
create or replace function transition_worksheet(p_worksheet uuid, p_to text, p_note text)
returns void language plpgsql security definer as $$
declare v_from text; v_role text;
begin
  select stage into v_from from worksheets where id = p_worksheet;
  select role into v_role from profiles where id = auth.uid();

  if not allowed_transition(v_from, p_to, v_role) then
    raise exception 'Transition % -> % not allowed for %', v_from, p_to, v_role;
  end if;

  update worksheets set stage = p_to, updated_at = now() where id = p_worksheet;
  insert into stage_transitions (worksheet_id, loan_number, from_stage, to_stage, actor_id, actor_role, note, at)
  select id, loan_number, v_from, p_to, auth.uid(), v_role, p_note, now() from worksheets where id = p_worksheet;
  update loans set current_stage = p_to, updated_at = now()
    where loan_number = (select loan_number from worksheets where id = p_worksheet);
end $$;
```

`allowed_transition` is a lookup table of (from, to, role) triples. Managers and admins get a wildcard row with `p_note` required.

## Appendix C: Investor config seed

`CFG` keys in the current file map to `investor_configs.config` as-is: `mF` (min FICO), `mD` (min DSCR), `mL` (max LTV), `str`, `sF`/`sD`/`sL` (STR overrides), `nr` (non-recourse), `avm`, `fti`, `ftb`, `fn`, `bk` (BK/FC seasoning months), `res` (reserves text), `d1` (disqualifiers), `l6` (listed-in-6-months rule), `hR` (housing history), `pp` (prepay terms), `pt` (prepay types), `nt` (notes). Keep the keys; document them in a `config_key_glossary` table so the admin UI can label them.
