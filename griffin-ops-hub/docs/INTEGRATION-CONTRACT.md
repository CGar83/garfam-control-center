# LendingPad, Cadre, HubSpot, and LIA integration boundaries

Status: **internal design and validation scaffold, not connected**. Reviewed September 19, 2026. No production vendor credentials, endpoints, accounts, or record writes were configured by this build.

## Operating division

The Hub owns loan-linked work: internal preparation, requests, checklists, evidence references, department ownership, target dates, exceptions, handoff notes, and self-reported handling time. It does not take over credit decisions, disclosure issuance, authoritative LOS milestone changes, funds movement, or the official loan file.

The user identifies Cadre as the processing build owner. Current Cadre implementation, accepted delivery scope, deployment, and interfaces remain unverified. Cadre owns the proposed processing analysis/report-generation boundary; the Hub owns preparation, handoff records, source-referenced evidence follow-up, human disposition, and coordination history. The imported refinery and condition-flow documents are requirements and historical observations, not proof of current Cadre capability. See [the joint archive assessment](CADRE-INTEGRATION-ASSESSMENT.md).

LendingPad remains the proposed authority for loan identity, permitted loan facts, assigned team, and source application/funding milestones. The exact set of actions that must remain in LendingPad is a vendor, company-policy, and compliance decision. It has not been inferred from the supplied prototypes. The live tenant's approved API documentation and permissions are required before an adapter can be completed.

HubSpot remains the proposed authority for CRM contacts, deals, associations, and communication preferences. An approved outbound summary should contain the minimum operational context necessary. Do not copy the full loan application, financial documents, CD content, or sensitive borrower fields into CRM notes by default.

The LOS Connector is the attribution audit layer. Hub work completion and LO-reported LIA use are insufficient to prove LIA impact. Stable identity joins and source funding events must be implemented alongside the operational connector, not deferred behind a broader module rollout.

## Canonical record and event contract

- Keep a stable internal Hub work ID and loan number separate from each vendor's immutable object ID.
- Bind `(environment, source_system, source_loan_id)` to an authorized Hub loan only after a verified match. Never join on client surname alone.
- Every normalized event carries a source event ID, source and observation timestamps, correlation ID, environment, and explicit schema version.
- Deduplicate on `(environment, source_system, source_event_id)`. Redelivery must not duplicate work, notifications, time logs, or attribution.
- Quarantine conflicting identity matches, unsupported schemas, and malformed payloads. Missing or rejected events do not become successful syncs.
- Define an ordering/reconciliation policy before consuming milestones. An old event must not silently rewind a current source value.
- Record field provenance and observed time. A Hub worksheet value must never overwrite a source-owned loan field simply because it was edited more recently.
- Separate source transport, authentication, vendor payload normalization, validated bindings, persistence, and any outbound action. Do not put vendor tokens in browser code.

`server/integrations/contract.mjs` implements only internal normalized-event validation, stable idempotency-key construction, and exact binding checks. Its tests exercise those constraints. It is **not** a webhook endpoint, signature verifier, queue, secret store, vendor adapter, or persistent event processor. A caller cannot establish vendor authenticity merely by passing `verified: true`; only the trusted connector's verified binding store may supply that value.

`src/data/integrationContracts.js` contains the user-visible mapping draft and a clearly labeled synthetic envelope. The download in Connections exports this draft; it does not create an integration.

The **Cadre processing** card is a proposed connection boundary only. The existing normalized-event scaffold accepts the three configured LOS milestone, CRM association, and LIA touchpoint types; it has no Cadre processing report/finding envelope. No Cadre type or transport is added by showing that card. A future adapter needs a separately agreed schema, verified source identity, authorized loan binding, source revision semantics, and durable receipt handling. Do not submit a processing report under `lia.touchpoint_observed` to bypass that contract.

## Evidence coordination boundary

Native evidence and handoff fields are manually recorded coordination data. An external run/finding/receipt ID is a reference entered by a person until a verified connector establishes its source. A record's presence or completion cannot prove that Cadre received it, processed it, returned a report, cleared a condition, or produced a verified LIA touchpoint.

Keep evidence state separate from fact truth and workflow completion. Native fields record evidence, applicability, source binding, and human disposition separately; they do not evaluate factual truth. The condition-flow reference uses `pending_order_out` to mean a present document held from review; it does not mean a vendor order is awaiting return. In the source proposal, `ask_processor` needs an explicit reason, such as absent evidence, a legible-copy request, human judgment, or upstream recomputation. These source reason codes are proposals, not a confirmed Cadre API or an automatic Hub mapping. Unknown values remain unknown; a source `pass` result is not verified truth.

Document identifiers/locations and minimal context may support a human follow-up. No raw borrower-document upload, source loan-file evidence import, financial-rule activation, automatic source precedence, or automatic disclosure override is part of this boundary. Human-created request drafts require human review and an approved delivery channel; copying or exporting does not send them. Review dispositions must retain actor, saved revision, reason, and supporting references. Hub follow-up completion never becomes LOS condition clearance.

Create-time routing is constrained by each trusted template's allowed departments; the resulting work item's department stays fixed. Named owners must belong to that department and branch. Required evidence fields, checks, and trusted completion rules govern native review/completion, not eligibility, investor compliance, or external acceptance. Version-one records retain their pinned definitions.

Cadre handoff status and report status are separate human observations. A prepared packet can complete preparation without an external send. A receipt reference does not imply a report is available; a report observation does not prove authenticated delivery. The saved JSON export is labeled `griffin.hub.coordination.v1`, retains work/template revisions and manual references, and explicitly records no Hub send, no verified external receipt, and unknown outcome attribution. It is an internal review packet, not a Cadre request schema or an extension of the server event validator.

## Connector delivery sequence

Cadre's delivery owner and Griffin's product owner must first confirm accepted scope, actual report/finding schema, authentication/transport, source status definitions, failure/replay behavior, and deidentified acceptance evidence. Historical “Built” or “Agreed” labels do not satisfy this gate.

| Gate                  | Owner role                              | Concrete evidence                                                                                                                   |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Vendor access         | LOS/CRM administrators                  | Current approved docs, sandbox tenants, permissions, authentication model, and access limits                                        |
| Authority and privacy | Operations, compliance, data owner      | Field-by-field ownership, minimal data allowlist, borrower-data classification, retention/deletion handling                         |
| Identity and access   | Backend and identity owners             | Exact loan/object joins, cross-branch denial tests, deactivated-user behavior, association-collision handling                       |
| Inbound transport     | Backend engineering                     | Product-specific authenticity checks, replay handling, durable acceptance, retry/dead-letter handling, source reconciliation        |
| Read-only pilot       | Product and Operations                  | Sample source loans matched against Hub records; source timestamps and gaps visible                                                 |
| Attribution pilot     | LIA owner and analytics                 | Known LIA touchpoints joined to known application/funding records, documented cohort/exclusions and attribution coverage            |
| Outbound actions      | Vendor administrator and workflow owner | Individually approved action capabilities, idempotency, optimistic concurrency, audit evidence, and human checkpoint where required |
| Release               | Engineering, Operations, compliance     | Hosted auth/RLS tests, rollback, recovery, monitoring, limits/load verification and explicit release decision                       |

The first release should prioritize read-only identity/milestones, operational work summaries, and attribution. Every outbound capability needs its own approved contract. There is no generic unrestricted "sync loan" action in this build.

## Current reference checks

- [LendingPad integration knowledge base](https://kb.lendingpad.com/integrations) is the official integration catalog. It does not establish this account's API entitlements, custom endpoints, or write permissions. Those remain **NEEDS VERIFICATION** against vendor-provided documentation and the tenant administrator.
- [HubSpot webhook configuration](https://developers.hubspot.com/docs/apps/developer-platform/add-features/configure-webhooks) documents push subscriptions and configuration. Select the actual app platform and event product before choosing its authentication and webhook verification method.
- [HubSpot webhook journal documentation](https://developers.hubspot.com/docs/api-reference/legacy/webhooks/webhooks-journal) describes a distinct journal/subscription model. It must not be silently mixed with a traditional push endpoint.
- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) supports the database access-control model. Hosted deployment must verify RLS plus grants and RPC execution permissions under actual user sessions.

These references inform integration boundaries. They do not certify the imported loan rules or establish a live connection.
