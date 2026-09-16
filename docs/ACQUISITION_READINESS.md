# Gather: Product and Acquisition Readiness

## Assessment

Technical feasibility: high confidence. Acquisition attractiveness: unknown. This repository demonstrates a working product and growing safety controls, not buyer demand, retention, revenue, a valuation, or completed diligence. A Fortune 500 acquisition is a commercial outcome, not a UI quality level.

Recommended positioning (moderate confidence): a private family coordination system that turns saved information into accountable next steps. Validate a narrow recurring workflow before adding more modules. The candidate workflow is a weekly family review connecting calendar commitments, tasks, and household spending. This is a hypothesis, not verified product-market fit.

## Changes in This Release

- Private, owner-scoped LLM session logs with complete saved messages and durable Markdown transcripts.
- Atomic transcript and conversation persistence; revision checks prevent stale replies from restoring cleared sessions.
- New-session archiving, per-session downloads, reference exclusion, owner reference notes, and deletion controls.
- Bounded historical retrieval with explicit sharing consent, model/scope isolation, visible log references, and untrusted-context instructions.
- Timestamped reply metadata: request ID, prompt version, provider latency, and token usage/cost when actually reported. Unknown cost stays unknown. This is not a billing reconciliation system.
- CI configuration for lint, types, unit/API/UI tests, isolated PostgreSQL tests, and production build. A workflow file is not branch protection; require its successful check in repository rules separately.

## Evidence Gates

These are proposed internal gates, not universal buyer requirements or industry benchmarks. Assign accountable people and review dates before a pilot.

| Priority | Work | Owner | Evidence to produce |
| --- | --- | --- | --- |
| P0 | Permission and privacy audit across every module, role, invitation, partner-private note, and file | Engineering + independent security reviewer | Threat model, permission matrix, repeatable negative tests, resolved critical/high findings |
| P0 | Children's data, adult consent, relationship confidentiality, data transfers, privacy notice, terms, deletion and retention policy | Product owner + qualified counsel | Written applicability assessment and approved controls before broader household onboarding; no implied legal certification |
| P0 | Staging, repeatable migrations, backup restore, rollback, secret rotation, incident response | Engineering/operations | Timed restore drill, deployment runbook, named incident owner, measured recovery objectives |
| P1 | Validate the weekly family-review workflow with consenting households | Product owner | Cohort activation, week-4/week-8 retention, paired-parent participation, tasks completed after review, churn interviews |
| P1 | Privacy-preserving product and reliability measurement | Product + engineering | Documented event dictionary, consent treatment, latency/error dashboard, support workload; no chat/health/child text in analytics |
| P1 | Reliable calendar connection lifecycle | Engineering | Tested connect, refresh, expiry, revocation, duplicate prevention, reconciliation and failure recovery for each supported provider |
| P1 | AI evaluation and operating costs | Engineering + product | Fixed synthetic eval set for grounded answers, bad citations, prompt injection, missing data, stale memories, restricted writes; cost per completed review and failure rate by model |
| P1 | Accessibility and mobile task completion | Design + QA | Keyboard/screen-reader checks, phone/tablet coverage, measured completion of calendar/task/grocery/review flows |
| P2 | Paid-demand and unit-economics validation | Product/business owner | Real conversion, cancellations, support cost, gross margin and acquisition-channel evidence; do not manufacture a pricing story from feature count |
| P2 | Buyer-specific integration hypothesis | Business owner | A named buyer's distribution or product gap, integration scope, migration plan and quantified value supported by customer evidence |
| P2 | Transferable asset and diligence package | Owner + counsel/accounting | IP assignments, contributor history, license inventory/SBOM, domain/cloud ownership, contracts, subprocessors, finances, architecture and operating evidence |

## Memory and Governance Boundaries

The full transcript is archival storage. It is not injected into every prompt and does not train the model. The assistant references at most three archived sessions in the same workspace, owner, model, and exact review scope. That deliberately prevents a finance-only review from silently inheriting a broader health/relationship chat. A reference note is a user statement, not independently verified truth. Current saved records take precedence over historical suggestions.

Logs contain sensitive family information. They are excluded from the shared family export, realtime store, public files, and browser persistence. They are not end-to-end encrypted from database administrators and not tamper-proof compliance records. Downloads become user-controlled local files. Delete/exclude controls cannot retract copies already sent to a provider, downloaded, retained in backups, or quoted in another transcript. Agree on a retention policy and implement expiry before a broad commercial launch; this release keeps logs until explicit deletion or account/workspace cascade deletion.

Current limits: no semantic embedding index, no automatic factual consolidation, no cross-model/cross-scope memory, no complete raw-file ingestion, no external payments, and no autonomous non-financial writes. Do not market these as implemented. Full-text retrieval indexes a bounded prefix; it is not a guarantee of finding every historical detail.

## Next Decision

Keep the product focused. First validate repeat household use and trust while closing P0 issues. Defer more modules, a native-store launch, and an acquisition pitch until the recurring workflow has evidence. Do not sell household data as the acquisition thesis.

## References

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework): voluntary risk-management guidance, not a certification awarded by this release.
- [FTC children's privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy): starting point for counsel's applicability and consent review, not a conclusion that this app complies.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): implementation reference for tenant and owner isolation.
- [OpenRouter usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting): provider-reported usage fields, not a substitute for provider billing records.
