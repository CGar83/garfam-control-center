# Resume prompt for Claude

Continue development of Griffin Operations Hub from this folder. It is version **1.6.0**, the daily-operations release on top of the **1.5.0** IA alignment and verified **1.4.0** (commit `17c4303b`).

Read `START-HERE.md` first, then `docs/DAILY-OPERATIONS-1.6.md`, then `docs/IA-ALIGNMENT-ASSESSMENT.md`, then `README.md`. Do not rebuild the platform from scratch.

## Operating rules

- Preserve template IDs, source field order, section titles, and boundary copy. Alignment lives in `src/lib/catalog.js` (chooser labels, phase grouping, next-form suggestions), `src/lib/workView.js` (queue buckets, lanes, grouping) and page composition — not by forking JSON templates.
- The Hub serves the operations team. There is no lead / intake phase. Do not reintroduce origination-conversation steps.
- Loan coordination context (`hub_phase`, `observed_los_status`, `coordination_note`) is human-set and labelled unverified. Never derive it from work completion or present it as a LendingPad milestone.
- Cadre owns processing execution. LendingPad remains the system of record. The Hub does coordination, evidence, and named handoffs only.
- Do not merge these pairs: CD_REQUEST vs CLOSING_COORDINATION; EXCEPTION_REVIEW vs INVESTOR_EXCEPTION_REQUEST; PROCESSING_SUBMISSION vs CADRE_HANDOFF; MLP_SIGNING_COORDINATION vs CLOSING_COORDINATION; DSCR worksheet vs PROCESSING_SUBMISSION.
- Do not auto-advance loan phases from work completion. Do not invent forms for Disclosures Desk / CTC / Funded — those stay “outside Hub” empty states.
- Local demo data only. No live borrower records. No implied LOS writes.

## Architecture snapshot

- Vite + React 18 + React Router 7. Entry: `src/main.jsx`.
- Local adapter: `src/lib/db/local.js` (localStorage). Supabase adapter exists but is unused unless env vars are set.
- 18 native templates in `src/data/operationsTemplates.json` plus DSCR schemas.
- 6-phase / 47-step playbook: `src/data/loanJourney.json` (version 3).
- Tests: `tests/*.test.js` (Vitest). `npm run check` must pass before handoff.

## Current IA surface

Rail: `/` Home, `/loans`, `/operations` Work, `/journey` Flow, `/workflows` Library, `/insights`, `/workspace` Admin. Work filters, loan tabs, and the loan phase filter all live in the URL. Shortcuts: `/` search, `N` new work, `G` then `H/L/W/F/B/I`, `?` help.

My next request is: [add the next feature here].
