# Griffin Operations Hub — Content Alignment Assessment

**Role:** Mortgage operations strategist  
**Scope:** Information architecture, navigation, step flow, and form catalog  
**Source:** Handoff v1.4.0 (commit `17c4303b`, 18 native templates + DSCR, 7-phase / 49-step loan flow)  
**Standard:** MAG7 / Fortune-level internal tools — Linear, Stripe Dashboard, Rippling, ServiceNow workspaces used as the bar, not consumer apps  
**Date:** 2026-09-20

This is an alignment assessment, not a rebuild brief. Cadre still owns processing execution. LendingPad remains authoritative for loan data and milestones. Hub work is coordination, evidence, and handoffs. Do not turn training text into policy gates.

---

## 1. Verdict

The Hub already has the *right objects*: one loan record, versioned work items, named owners, evidence, and a source-mapped loan flow. That is the correct operating model.

What is not MAG7 is the *arrangement*. Fifteen peer nav items flatten four different jobs into one rail:

| Job | Current destinations that compete |
|---|---|
| Do my work today | Overview, All loan work, MLP desk, Closing desk, Evidence & handoffs, DSCR submissions |
| Understand this loan | Loan records, Loan flow, Evidence & handoffs |
| Start the right form | Workflow library, All loan work “Start loan work”, Loan flow “start” links |
| Learn / measure / administer | Source references, Operations insights, Submission metrics, Activity log, Connections, Workspace status |

An LOA, an MLP, and a closer should not land in the same 15-item list and hunt. Fortune-level ops tools personalize the first screen and put the rest one click behind a loan or a desk.

**Recommended principle:** *Loan is the spine. Work is the action. Flow is the map. Library is the catalog. Desks are filters, not destinations.*

---

## 2. What is already strong — do not break it

Keep these. They are the product.

1. **One loan number across work items.** Correct. Never create a second loan object for DSCR vs operations.
2. **Version-pinned templates + explicit source vs Hub field split.** Title/Escrow, Business Narrative, and Investor Exception already mark “Hub coordination · not part of the source form.” That is the right compliance posture.
3. **Work states with reasons** (draft → queue → active → blocked → review → complete / cancel / reopen). That is operationally adult.
4. **Journey steps carry owner, prerequisite, evidence, next owner, system, boundary, and `templateId`.** The data model for a guided flow already exists.
5. **Command palette over loans and work items.** Keep and expand; it is the MAG7 escape hatch.
6. **Role-gated metrics and admin.** Correct blast-radius control.
7. **Honest boundaries in copy** (no implied CD issuance, lock, CTC, or funding). Do not soften these into marketing.

---

## 3. The alignment problems, in operator language

### 3.1 Navigation is a directory, not a path

Current primary rail (15 + admin):

Overview · All loan work · MLP desk · Closing desk · Evidence & handoffs · DSCR submissions · Loan records · Loan flow · Workflow library · Source references · Operations insights · Submission metrics · Activity log · Connections · Workspace status

Problems:

- **Overview and All loan work are the same page** (`Operations.jsx`) with a path flag. Two labels for one surface trains people to distrust the rail.
- **MLP desk and Closing desk are department filters** of that same page. A filter is not a product area.
- **No Processing desk and no Lock desk**, even though those departments own templates and journey steps. The rail privileges two desks and hides two others.
- **DSCR submissions sits beside operations work** as if it were a second company. It is one product type with a seven-section worksheet. It should open from a loan or from the library, not own a top-level city.
- **Loan flow and Workflow library are teaching surfaces** competing with doing surfaces. New users bounce between map and catalog instead of opening a loan and seeing “you are here.”
- Labels mix objects (“Loan records”), places (“MLP desk”), artifacts (“Source references”), and systems (“Connections”). MAG7 rails use one noun class.

### 3.2 The loan flow is a guidebook, not a guided job

49 steps across 7 phases is the right grain for Griffin. The break is the last mile:

- Several early origination steps collapse to `CUSTOM_TASK` (contact, tailored solution, structure confirmation). That tells an LO “we don’t have a form for the work you actually do first.”
- Processing-heavy steps collapse to `CADRE_HANDOFF` (initial review, appraisal order, appraisal review, investor submission, portal review). Correct ownership — wrong operator cue. It looks like Cadre is a form instead of an external system.
- **Disclosures Desk has a journey step and no template.** Initial disclosures are a hole in the Hub catalog on purpose (LendingPad / disclosures team), but the UI does not say “do this in LendingPad” as a first-class next action.
- Related work only matches `templateId + loanNumber`. One loan can have many condition follow-ups; the flow cannot show “this step is done” vs “this step has an open item.”
- Phase selection “does not set status.” Correct legally. Incomplete operationally. Operators need *observed LOS status* next to *Hub work progress* on the same loan page.

### 3.3 The form catalog is complete and hard to choose from

18 templates + DSCR is not too many. The *chooser* is.

| Symptom | Example |
|---|---|
| Source titles vs Hub titles | “Self-Employed Business Narrative Form” next to “MLP welcome coordination” |
| Department codes in the filter | `LO`, `MLP`, `PROCESSOR` instead of Origination / Mortgage Loan Partners / Processing |
| One mega-dossier vs many small cards | `PROCESSING_SUBMISSION` is 13 sections / 167 fields; `LOCK_REQUEST` is 6 fields |
| Two exception objects | `EXCEPTION_REVIEW` (proposed Hub workflow) and `INVESTOR_EXCEPTION_REQUEST` (source form) |
| Two closing objects | `CD_REQUEST` (38 source fields) and `CLOSING_COORDINATION` (6 proposed fields) |
| Custom task as a junk drawer | Used as the journey fallback for origination conversations |

An MLP starting work from the create dialog sees a flat 18-item `<select>`. That is not how a closer or an LOA thinks. They think: *What is happening on this loan, and what is the next form?*

### 3.4 Dual product tracks

| Track | Entry | Mental model |
|---|---|---|
| Operations work items | `/operations`, `/work/:id` | Ticket + template + evidence |
| DSCR worksheet | `/submissions`, `/worksheets/:id` | Guided 7-section file |

Both attach to a loan number. The rail treats them as sibling products. For MAG7 quality, DSCR is “a workflow type on a loan,” same as Title & Escrow.

### 3.5 Evidence is split across four rooms

Evidence lives on the work item, on Evidence Desk, in Source references, and as journey “evidence” text. An auditor can find it. A processor in motion cannot. Evidence should hang off the **loan**, with work items as the writers.

---

## 4. Target information architecture

### 4.1 Four layers (only four)

```
1. HOME          What is mine, blocked, or due today
2. LOAN          One record: status, work, flow position, evidence, DSCR, activity
3. WORK          Queues and desks as filters of the same work object
4. SYSTEM        Library, references, insights, connections, admin
```

Everything an operator needs on Tuesday morning is in 1–3. Layer 4 is for starting net-new work, looking up source text, or running the company.

### 4.2 Recommended primary rail (7 items, role-aware)

| Rail label | Route | Who sees it first | Purpose in one sentence |
|---|---|---|---|
| **Home** | `/` | Everyone | My work, blocked, past target, and the next recommended action |
| **Loans** | `/loans` | Everyone | Find a file; the loan page is the system of record in the Hub |
| **Work** | `/operations` | Everyone | All open coordination, with desk chips: Mine / MLP / Processing / Closing / Lock |
| **Flow** | `/journey` | MLP, Processing, Managers | Playbook + this loan’s open work mapped onto phases |
| **Library** | `/workflows` | People who start work | Choose a form by phase and job, not by raw department code |
| **Insights** | `/insights` | Managers, Admin, MLP, Processing | Combine current insights + submission metrics |
| **Admin** | `/workspace` | Admin; others via footer | Connections, users, workspace status, activity |

**Remove from the primary rail** (keep the routes; nest them):

- All loan work → becomes Work
- MLP desk / Closing desk → chips on Work (`/operations?desk=mlp`)
- Evidence & handoffs → tab on the loan + a manager view under Insights
- DSCR submissions → library card + tab on the loan + Work filter `type=dscr`
- Loan records → Loans
- Source references → tab inside Library (and link from any source-backed field)
- Submission metrics → Insights
- Activity log → loan timeline + Admin
- Connections / Workspace status → Admin

That is how Stripe and Rippling stay at 6–8 items while covering more surface area than this Hub.

### 4.3 Role homes (same app, different first question)

| Role | Home should answer |
|---|---|
| LO | Which of my files are incomplete for handoff? What did MLP send back? |
| LOA | Which submission packages are missing the four QC attestations? |
| MLP | Who needs a welcome, a chase, an appraisal update, or a signing confirm today? |
| Processor / Cadre liaison | Which packets are ready, which Cadre handoffs are waiting on evidence, which conditions are open? |
| Closing | Which CD requests and signing coordinations are due, and what is blocked on title? |
| Lock Desk | Which lock requests are unassigned or past target? |
| Manager / Admin | What is past target by desk, and where is evidence missing? |

Do not build seven apps. Build one Home with a role query and one primary CTA.

---

## 5. Align content to the loan — the spine

Every loan page should read top-to-bottom like a closer’s file tab, not like a CMS.

**Recommended Loan record sections (fixed order):**

1. **Identity** — loan number, borrower, product, branch, observed LOS status (manual until LendingPad is live), Hub owner
2. **Now** — the single next Hub action, owner, target date, blocker
3. **Flow position** — which of the 7 phases this loan is *being coordinated in* (human-set, labeled “Hub coordination phase — not a LendingPad milestone”)
4. **Open work** — work items grouped by phase, not by created date
5. **DSCR worksheet** — if this product needs it; otherwise hidden
6. **Evidence & handoffs** — condition/exception packets, Cadre references, PDFs
7. **Activity** — immutable events

This collapses Loan records + Loan flow + Evidence + DSCR + Activity into one object with tabs. The standalone Flow page remains for training and multi-loan scanning.

### 5.1 Map the 7 phases to the form catalog

Use this as the Library grouping and as the Loan “start work” chooser. Do not reorder source fields inside a form.

| Phase | Operator job | Forms that belong here | Do this outside the Hub |
|---|---|---|---|
| **1. Lead & discovery** | Capture the conversation | `CUSTOM_TASK` renamed in UI to “Origination note” | CRM / marketing |
| **2. Application, lock, disclosures** | File is real and priced | `LOA_PREP`, `LOCK_REQUEST` | Blend → LendingPad transfer; Initial disclosures (Disclosures Desk) |
| **3. MLP preparation** | Borrower is live and file is packable | `MLP_WELCOME`, `MLP_DOCUMENT_CHASE`, `MLP_APPRAISAL_COORDINATION`, `PROCESSOR_TITLE_ESCROW_REQUEST`, `PROCESSOR_BUSINESS_NARRATIVE`, `PROCESSING_SUBMISSION` | Appraisal order placement if Cadre/LP owns it |
| **4. Processing handoff** | Cadre can work | `CADRE_HANDOFF`, `CONDITION_FOLLOWUP`, `EXCEPTION_REVIEW` | Cadre engine, LP conditions |
| **5. Investor submission** | File is in front of an investor | `INVESTOR_EXCEPTION_REQUEST`, `MLP_BORROWER_UPDATE` | Investor portal |
| **6. Conditions, CTC, signing** | Close the file | `CD_REQUEST`, `CLOSING_COORDINATION`, `MLP_SIGNING_COORDINATION` | CD issuance, CTC, doc release |
| **7. Funded & post-close** | Prove the ending | `POST_CLOSE_QC`, `MLP_BORROWER_UPDATE` | Servicing / warehouse |

**Catalog hygiene (labels only — do not fork templates):**

| Current title | Recommended UI title | Why |
|---|---|---|
| Loan officer submission package | LO / LOA submission package | Matches who fills it |
| Processing handoff dossier | Processing preparation dossier | “Handoff” is also Cadre handoff |
| Cadre handoff | Cadre handoff record | Emphasize it is a receipt, not the engine |
| Exception review | Internal exception review | Distinguishes from investor exception |
| Investor Exception Request Form | Investor exception request | Drop “Form”; source sections stay |
| Self-Employed Business Narrative Form | Business narrative | Shorter chooser label; source heading stays on the page |
| Title and Escrow Request | Title & escrow request | Same |
| Custom operations task | Custom work / origination note | Stop looking like a leftover |
| DSCR submissions | DSCR worksheet | It is a worksheet, not a department |

Keep source section titles inside the form exactly as ingested (`Borrower Certification:`, `Loss Payee:`, `Section 8: Investor Decision`). Alignment happens in the *chooser and loan grouping*, not by rewriting source paper.

---

## 6. Align the step flow (how a file should feel)

Fortune-level mortgage ops feels like this:

```
Home → open loan → see phase + next action → open or start the form
                                              → save / request review / hand off
                                              → evidence lands on the loan
                                              → next owner is named
```

Never this:

```
Home → Library → guess the template → type the loan number again
     → Flow page to remember who owns appraisal
     → Evidence desk to see if anyone uploaded
     → DSCR queue because the product is DSCR
```

### 6.1 Required flow rules

1. **Start work from the loan or from a journey step, not from a blank dialog first.** The create dialog stays as a power-user path. Default CTA is “Start [template] on #loan.”
2. **Every journey step with a `templateId` shows:** existing open items for that loan + “Start this work.” Steps with `templateId: null` show “Observed in LendingPad / outside Hub” and do not offer a fake form.
3. **A step can have many work items** (condition follow-up is the obvious case). Show count and newest status; never treat one completed ticket as “phase complete.”
4. **Handoff is the unit of progress**, not page scroll. Completing `MLP_WELCOME` should offer the next recommended template (`MLP_DOCUMENT_CHASE`), not dump the user on Overview.
5. **Blocked means a named missing artifact.** “Blocked” without an evidence reason is a status toy.
6. **DSCR and operations work appear on the same loan timeline.** A DSCR section verification is an event, same as a Cadre handoff save.

### 6.2 Journey gaps to treat explicitly (do not invent forms)

| Gap | Correct product behavior |
|---|---|
| Disclosures Desk / initial disclosures | Step card: “Authoritative in LendingPad. Record date observed.” Optional note via Custom work. |
| Investor CTC / Closed / Funded | Observation fields only, copied from LOS when connected. No Hub checkbox that says the loan is funded. |
| Appraisal order ownership conflict (already a review point) | Keep the conflict visible on the step. Do not pick a winner in UI copy. |
| Welcome trigger conflict | Same — show both source statements in References, require human choice on the welcome form. |
| Origination calls mapped to Custom task | Acceptable until a lightweight “contact outcome” template exists. Rename it in the chooser. |

Do not add new policy templates to fill gaps. Add *clear empty states* that name the system of record.

---

## 7. Form usability alignment (inside the editor)

The editor already has search, section progress, required highlighting, prev/next, sticky save, and PDF export. That is the right chassis. Alignment work is editorial and structural, not a new form engine.

### 7.1 Keep

- Source field order and row groups
- Read-only certification and investor-decision rows
- Visible Hub-only section at the end
- Keyboard save and unsaved-navigation guard
- Template version stamped on every work item

### 7.2 Change (presentation only)

1. **Chooser grouped by phase**, then by job, with a one-line “Use when…” and “Does not mean…” from `boundary`.
2. **Progress is job progress, not field count.** A 167-field dossier at 40% complete is not 40% ready for Cadre. Use the existing checklist / completionRules as the progress bar; keep field fill as secondary.
3. **Mega-forms need a left rail of sections that is always visible** (`LOA_PREP` 14, `PROCESSING_SUBMISSION` 13, `INVESTOR_EXCEPTION_REQUEST` 10). Prev/next is not enough at that size.
4. **Product forks inside the processing dossier** (DSCR, Bank Statement, HELOAN/HELOC, Asset Based, Full Doc) should be a first-screen product switch, not a surprise halfway down 167 fields.
5. **“Required” must respect applicability.** Optional evidence already called out for LOA prep — apply the same pattern to condition follow-up and exception review (`unknown` / `not applicable` is a first-class answer).
6. **Same Hub coordination block on every template:** owner, target date, evidence links, next owner, handling time. Operators learn one ending.

### 7.3 Do not merge these pairs

They look related and are not the same job.

| Leave separate | Reason |
|---|---|
| `CD_REQUEST` vs `CLOSING_COORDINATION` | One is a source request packet; one is a named-owner coordination ticket |
| `EXCEPTION_REVIEW` vs `INVESTOR_EXCEPTION_REQUEST` | Internal disposition vs investor-facing source form |
| `PROCESSING_SUBMISSION` vs `CADRE_HANDOFF` | Prep dossier vs external-run receipt |
| `MLP_SIGNING_COORDINATION` vs `CLOSING_COORDINATION` | Borrower/notary/Final CD vs closing-desk dependencies |
| DSCR worksheet vs `PROCESSING_SUBMISSION` | Product verification flow vs multi-product prep inventory |

Merging them would feel simpler for a week and destroy auditability.

---

## 8. Recommended navigation copy (exact labels)

Use operator English. Drop internal engineering names from the rail.

| Avoid | Use |
|---|---|
| All loan work | Work |
| Loan flow | Flow |
| Workflow library | Library |
| Source references | References (nested in Library) |
| Operations insights | Insights |
| Submission metrics | (tab inside Insights) |
| Evidence & handoffs | Evidence (tab on the loan) |
| DSCR submissions | DSCR (filter or loan tab) |
| Workspace status | Workspace |
| Connections | Connections (under Workspace) |

Page eyebrows can stay specific (`WORKSPACE / LIBRARY`). The rail cannot.

---

## 9. What “straightforward” looks like for each persona (test scripts)

Use these as the acceptance tests for any IA change. If a new user cannot finish them without training, the alignment is not done.

**LOA — 90 seconds**  
Home → loan # → Start “LO / LOA submission package” → jump to Final QC section → save → hand to MLP.

**MLP — 90 seconds**  
Home → My work → open welcome item → complete contact outcome → offered next: Document follow-up on the same loan.

**Processor liaison — 90 seconds**  
Loans → # → Flow tab → phase “Preparation” → see Title & escrow request + Cadre handoff record → open the one that is blocked.

**Closer — 90 seconds**  
Work → desk chip Closing → open CD request → required invoice/review flags visible → request review → loan Evidence tab shows the packet.

**Manager — 90 seconds**  
Insights → past target by desk → click into the loan, not into a CSV.

---

## 10. Implementation sequence (do not boil the ocean)

Preserve template JSON. This is shell, grouping, and loan-page composition.

| Priority | Change | Why first | Risk |
|---|---|---|---|
| P0 | Collapse rail to 7 items; desks become chips | Stops daily confusion immediately | Low — routes can stay |
| P0 | Loan page tabs: Now / Work / Flow / Evidence / Activity (+ DSCR if present) | Creates the spine | Medium — compose existing pages |
| P1 | Library + create-dialog grouped by the 7 phases; UI titles only | Makes form choice obvious | Low if IDs unchanged |
| P1 | Journey step → existing work + start link; null-template steps labeled “outside Hub” | Connects map to action | Low |
| P1 | After complete, suggest the next template in-phase | Creates flow without a workflow engine | Low |
| P2 | Merge Insights + Submission metrics | One measurement room | Low |
| P2 | Section rail on forms with ≥8 sections | Makes large source forms usable | Low |
| P2 | Product switcher at top of processing dossier | Prevents 167-field thrash | Low |
| P3 | Observed LOS status field on the loan (manual) | Prepares LendingPad join | Must stay labeled unverified |
| P3 | Role-specific Home modules | MAG7 feel | Medium — needs design |

**Do not do in this pass:** new templates, merging forms, live LendingPad writes, auto-advancing phases from work completion, or treating journey cadences as timers.

---

## 11. Decision

Adopt the four-layer model and the 7-item rail. Keep every current template ID, source section, and boundary sentence. Move DSCR, desks, evidence, references, and metrics *under* Loan / Work / Library / Insights instead of beside them.

That is the alignment that makes the platform feel inevitable: open the loan, see the phase, do the next form, leave evidence, name the next owner.

The Hub is already an operations system. It is not yet an obvious one. This sequence makes it obvious without pretending it is the LOS.
