# START HERE: Griffin Operations Hub (1.6.0)

Daily-operations release (2026-09-21) on top of the 1.5.0 Information Architecture alignment, which itself sits on v1.4.0 commit `17c4303b`.

## What this folder is

A **standalone Vite + React Router** app. `npm install`, `npm run dev`.

This is **not** a rebuild. Template IDs, source field order, Cadre/LendingPad boundaries, and work-item states are unchanged. Alignment is shell, grouping, and loan-page composition.

## Run

```sh
npm install
npm run dev
```

Vite serves http://127.0.0.1:4173. Leave Supabase unset for local demo mode. The browser starts empty — use **Load sample operations** on Home, then switch demo personas.

```sh
npm run lint
npm run build
```

## What changed in 1.6.0 (daily operations)

The operations team is the audience. Full write-up: `docs/DAILY-OPERATIONS-1.6.md`.

- **Lead / intake phase removed.** Six loan phases: Application → Preparation → Processing → Submission → Closing → Funded. `CUSTOM_TASK` is labelled "Custom work" under "Any phase".
- **Download source ZIP card removed** from Admin.
- Shell: live rail counts, contextual breadcrumb and window title, global **Start work** (`N`), keyboard shortcuts (`/`, `?`, `G` then a letter), palette with recents and "Start work on #loan".
- Home: six morning tiles (assigned, due today, past target, blocked, ready for review, unclaimed), urgency lanes, Claim on unclaimed desk work, manager desk pulse, recent loans.
- Work: every filter in the URL (shareable), nine scopes, column sort, **group by loan** view, Claim from the row, compact density, desk chip counts, duplicate guard in the create dialog.
- Loan record: human-set coordination context bar (Hub phase, observed LOS status, note), six-phase stepper with counts, Blocked panel with reasons, suggested next form, work grouped by phase, one activity timeline that includes work events, tabs in the URL.
- Work item: blocked-reason banner and Claim banner.
- Flow opens on the phase with open work for the selected loan. Library shows desk recommendations.
- Lint passes (1.5.0 shipped with five errors). 17 unit tests cover the catalog, journey data, and queue helpers.

## What changed in 1.5.0 (IA)

Principle: *Loan is the spine. Work is the action. Flow is the map. Library is the catalog. Desks are filters, not destinations.*

- Primary rail is 7 items: Home, Loans, Work, Flow, Library, Insights, Admin
- MLP / Closing / Processing / Lock desks are chips on Work (`/operations?desk=mlp`)
- Home is role-aware (not a duplicate of All loan work)
- Library grouped by loan phase; References nested as a tab
- Loan record tabs: Now / Work / Flow / Evidence / Activity / DSCR
- DSCR is a worksheet type, not a top-level product
- Completing a form offers the next in-phase template on the same loan
- Processing dossier has a product switcher; large forms keep a sticky section rail
- Chooser **UI titles only** (see `src/lib/catalog.js`). Source headings inside forms stay as ingested.

Do **not** in this lineage: new templates, merging CD_REQUEST with CLOSING_COORDINATION, live LendingPad writes, auto-advancing phases from work completion.

## Read before editing

1. `RESUME-PROMPT.md` — paste into Claude after it can see this folder
2. `docs/DAILY-OPERATIONS-1.6.md` — what 1.6.0 changed and why
3. `docs/IA-ALIGNMENT-ASSESSMENT.md` — the alignment brief that 1.5.0 implements
4. `README.md` and `VERIFICATION.md`
5. `docs/PROCESSOR-INTEGRATION-ASSESSMENT.md`
6. `src/lib/catalog.js` — UI titles, phase map, next-template suggestions; `src/lib/workView.js` — queue buckets, lanes, grouping

## Product boundaries (do not soften)

Cadre owns processing execution. LendingPad is authoritative for loan data and milestones. The Hub coordinates people, evidence, and handoffs. Completing Hub work is not lock, CTC, CD issuance, or funding.
