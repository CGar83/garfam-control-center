# Release verification

## 1.6.0 (September 21, 2026)

Local review build. Not a production certification or deployment.

| Check | Result |
| --- | --- |
| Lint | `npm run lint` passes with no errors or warnings on Node 22.22.2 (1.5.0 failed with five errors: a helper named `useWhen` tripped the React hooks rule, plus three unused variables) |
| Unit tests | 17 Vitest tests pass across `tests/catalog.test.js`, `tests/journey.test.js`, `tests/workView.test.js`: no lead phase, every template mapped to a phase, next-form suggestions point at published templates, queue buckets / lanes / grouping / claim rules / block-reason lookup |
| Production build | Vite 8.3.0 passes; route and PDF code still load on demand |
| Browser smoke | Playwright (Chromium) at 1440 px and 390 px: Home for LO, MLP, Processor, Closing and Manager personas; Work list, group-by-loan and unclaimed scopes; loan record Now / Work / Activity tabs and the coordination editor round trip; Flow, Library, Admin; palette, shortcuts dialog, and the create dialog with the duplicate guard. Zero page errors; the only console noise is font loading blocked by the sandbox proxy |
| Scope | Lead / intake phase removed from `loanJourney.json` (version 3, 6 phases, 47 steps) and `catalog.js`; Download source ZIP card removed from Admin; no template JSON changed |

Not covered in this pass: hosted Supabase behaviour for the new `setLoanCoordination` and `listLoanEvents` adapter methods (the connected adapter advertises `capabilities.loanCoordination: false` and the UI shows the fields read-only), axe accessibility sweep on the new surfaces, and assistive-technology review. These remain release gates.

## 1.4.0 (September 20, 2026)

Version 1.4.0 verified September 20, 2026. Local review build and source delivery, not a production certification or deployment.

## Evidence

| Check | Result |
| --- | --- |
| Application quality gate | `npm run check` passed on Node 24.19.0 |
| Lint | Passed with no errors or warnings |
| Node tests | 128 passed, 0 failed |
| Rendered React tests | 39 passed, 0 failed |
| Production build | Vite 8.3.0 passed; route and PDF code load on demand, no oversized-chunk warning |
| Dependencies | No dependency versions changed; the earlier v1.2.0 advisory check reported zero known vulnerabilities |
| Database | Four migrations, all 18 operations templates, actual source-form routing/identity/review gates, and existing RLS/audit/concurrency assertions passed in isolated PostgreSQL 17 |
| Source review | All 14,742 supplied Markdown lines assessed; three source forms, six bounded references and six new handoffs implemented |
| Preservation | Original 15 workflow templates are unchanged; three standalone new templates match the published catalog; 227 retained reference lines match the source exactly, with 11 explicit private-example omissions |
| Browser accessibility | Axe WCAG 2 A/AA and WCAG 2.1 A/AA: zero violations across 35 desktop and 12 mobile snapshots |
| Responsive layout | No document-width overflow across the checked 1536, 390 and 320 pixel layouts; source row groupings verified on desktop |
| Browser interactions | Field search focuses the selected field; keyboard save persists after reload; changing an answer clears prior review acknowledgments; canonical loan identity is read-only; investor-decision and borrower-certification sections expose no editable source fields |
| PDF exports | All 11 pages of the three source-form exports rendered and visually inspected: Title 3 pages, Business Narrative 3, Investor Exception 5; source-only sections and disclaimer/footer retained |
| Code review | Changed editor, reference reader, export, source catalog, routing and SQL assertions reviewed; no remaining material findings in this release scope |

Desktop snapshots cover Overview, Workflow library, three affected loan-flow phases, all six source references, all 21 sections across the three new forms and all three review tabs. Mobile snapshots cover two references, title loan details, business ownership, exception request information and exception review at both widths. Automated accessibility checks do not establish full WCAG conformance; assistive-technology and human usability review remain production gates.

The source comparison uses the exact Markdown fingerprint recorded in `docs/PROCESSOR-INTEGRATION-ASSESSMENT.md`. Generic instructional examples and menu descriptions are retained. Private loan/financial examples are replaced by explicit omissions at their original positions. Source reference text is not active investor policy, a calculated regulatory deadline, or an executable instruction.

Independent review caught and corrected a missing source Date field, noncanonical exception loan identity, a routed-department PDF label, a clipboard feedback race, a reference-text contrast failure, and four-column source row spans. Subsequent tests and browser checks cover the corrected behavior. Original section order and source labels are preserved; responsive stacking preserves their reading order.

## Meaningful regression coverage

- All 49 loan-flow steps and six source artifacts retain ownership boundaries. Cadre owns processing execution. Reading a phase does not change a loan milestone.
- Three new source forms enforce trusted department routing, canonical loan binding, immutable snapshots, stale-revision rejection, Hub review gates and review invalidation. Partial preparation can complete with a named next action, without certifying source answers or changing loan state.
- New reference search, empty-state reset and clipboard race coverage; no raw HTML interpretation or external actions.
- Source-only descriptions, original disclaimer/footer, saved revision and actual routed department survive PDF export.
- Required/conditional fields, allowed choices, role/stage ownership, loan/branch authorization, atomic data/audit writes, immutable schema references and failed-save draft retention.
- Five existing MLP templates, three evidence/Cadre templates and 24 JavaScript/PostgreSQL completion-rule parity cases remain covered.
- Reporting uses valid elapsed-event pairs and defined cohorts. Workflow completion and LIA declarations never become verified funding attribution or measured savings.

## Reproduce

```sh
npm ci
npm run check
npm run test:db
```

The database command requires Docker. See `supabase/VERIFICATION.md`. It tests PostgreSQL using stand-in auth identities, not hosted Google OAuth or PostgREST. GitHub Actions runs the application and disposable-database gates on push and pull requests. Check the repository's Actions history for hosted results; the evidence above records local verification.

## Remaining boundaries

1. No production environment, SSO provider, Supabase project, LendingPad/HubSpot/Cadre connection, messaging service, or public deployment was configured or changed.
2. Investor references, CD prompts, checklist policy, and regulatory assumptions in the attachments remain unverified. MLP training also contains unresolved appraisal/pricing/suspense ownership and timing conflicts; these remain visible references, not enforced rules. Raw training images, borrower examples, and embedded portal credentials were excluded. Source-owner and compliance review must approve any operational policy before live use. Internal target dates are not calculated regulatory deadlines. The new condition-flow source predicates and unsigned DSCR CD overrides were not activated; referenced verification scripts were absent from the archive. Contradictory Refinery status claims remain unverified.
3. Local mode uses browser storage and switchable personas. It is intentionally not a security boundary or tamper-proof audit. Use fictional data only.
4. Completed work is not a funded loan. Verified LIA attribution, LO productivity, and application-to-funding improvement require source events through the LOS Connector and measured baselines. Attribution must ship with the connector pilot.
5. Hosted identity, RLS/grants, PostgREST race/retry behavior, recovery, retention, monitoring, and load testing remain release gates. Authorized records currently support client-side exploration; production query budgets and scale have not been benchmarked.
6. DSCR worksheets autosave after 900ms; operations work items save explicitly. Unsaved drafts remain in memory. Navigation and tab-close warnings protect ordinary use, but abrupt process/device failure has no unsaved-draft recovery. Ambiguous network outcomes require an authoritative reload; a persistent idempotency ledger is not implemented.
7. PDFs are client-generated operational copies of saved records, not signed immutable artifacts or official disclosures. CD notification drafts can be copied but are not sent. No document-upload or secure file-storage service is implemented; evidence references point to approved systems.
8. Static hosting headers in `public/_headers` require a compatible host. Custom auth/data domains require a deliberate CSP review. Header enforcement was not tested on a hosted deployment. Original SQL reporting views require metric-parity validation before direct BI use; application reports use tested JavaScript calculations.

See `docs/PROCESSOR-INTEGRATION-ASSESSMENT.md` for this release's forms, references, source conflicts and exclusions, `docs/MLP-WORKFLOW-INTEGRATION.md` for the 196-page training and four-diagram disposition, `docs/CADRE-INTEGRATION-ASSESSMENT.md` for the new archives and retained Cadre ownership boundary, `docs/PRODUCTION-READINESS.md` for release gates and accountable owner roles, `docs/INTEGRATION-ASSESSMENT.md` for archive dispositions, and `docs/INTEGRATION-CONTRACT.md` for vendor boundaries.

## Dependency references

The dependency graph is pinned in the lockfile. The earlier Vite/Vitest migration followed the official [Vite migration guide](https://vite.dev/guide/migration) and [Vitest migration guide](https://vitest.dev/guide/migration/). A clean advisory report is not a claim that the application is free of vulnerabilities.
