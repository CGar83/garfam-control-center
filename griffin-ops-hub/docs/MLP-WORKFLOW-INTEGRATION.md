# MLP workflow integration

The Hub adds five native MLP coordination templates, a loan flow guide, and an MLP work queue. The source contributes who acts, what they need, which evidence to keep, and where the next handoff belongs. Work completion remains an internal coordination event. It does not change a LendingPad milestone, clear an underwriting condition, send a message, or confirm funding.

**Cadre owns processing implementation under the user's stated scope.** Further processor information will refine that external boundary. The supplied training and diagrams are human reference material, not a complete processor specification or a verified live Cadre contract. LendingPad remains the authority for loan milestones; no LOS or Cadre connector is active.

## Delivered native workflows

The catalog contains **15 operations templates**, plus the separate DSCR submission workflow: **16 workflow types** in the library. These five MLP additions use the same saved revisions, assigned owners, internal target dates, history, human review, and export paths as existing work.

| Template                     | Source-derived coordination                                                                                                                               | Evidence and completion meaning                                                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MLP_WELCOME`                | Introduce MLP, LO and processor; confirm contact preference, travel/availability, requested items and next contact.                                       | Record the trigger reference, actual contact outcome and recap/next action. An attempted contact can be documented without claiming the borrower was reached.                                                                                |
| `MLP_DOCUMENT_CHASE`         | Follow borrower or third-party requests: authorizations, LOE/CEL, insurance/mortgagee, payoff, title/escrow, VOR/WVOE and other processor-authored needs. | Separate requested, received, incomplete/unreadable, reviewed and escalated observations. Record the source requirement and review/handoff evidence. Completion does not certify document authenticity or satisfy an underwriting condition. |
| `MLP_APPRAISAL_COORDINATION` | Track the responsible order owner, payment, scheduling, report receipt, borrower delivery and follow-up.                                                  | Keep order/report and delivery references. Value, rent, occupancy, repair and ROV concerns require a named human or processor handoff; the Hub does not place orders or decide an appraisal's acceptability.                                 |
| `MLP_BORROWER_UPDATE`        | Record milestone updates, Friday check-ins, conditional-needs communication, suspense escalation and funding follow-up.                                   | State the externally observed milestone and source, contact outcome, recap and next action. Internal investor approval documents are not borrower-facing needs lists.                                                                        |
| `MLP_SIGNING_COORDINATION`   | Coordinate availability, required parties, final-CD discussion, notary confirmation and signing follow-up.                                                | Record external CTC and closer-confirmed dates as references. A signing appointment, signed documents, Closed and Funded are distinct observations. No legal waiting period is calculated.                                                   |

Existing CD request, lock request, closing coordination, preparation dossier, evidence follow-up and exception work remain available. The STP summary is a preparation/handoff reference; it does not introduce a competing processor engine.

## Guide, queue and implementation paths

- `/journey`: source-backed loan flow guide, phase and role filters, searchable actions/evidence, source locators, and links to prepare native work. Selecting a phase is a reading choice, not a loan status update. Related records share a loan and template type; they do not prove a particular journey step occurred.
- `/mlp`: MLP department queue, named owners, internal target dates, list/board views and five starting points for coordination work. Access remains constrained by the current identity and saved work permissions.
- `/operations` and `/work/:id`: create, save, review and follow loan-linked work. The guide can prefill the selected loan and workflow. No vendor action or message is sent by those links.
- `src/data/loanJourney.json`: sanitized source register, phase/step descriptions, cadence references and unresolved ownership notes. `src/lib/journey.js` relates authorized loan/work records to that guide.
- `src/data/operationsTemplates.json`: versioned MLP field/check definitions alongside existing templates. Historical saved template snapshots remain unchanged.

The guide preserves external LO, Lock Desk, Disclosures, Processor, Investor, Title/notary and Closing dependencies. External actors are not automatically granted Hub accounts. Parallel appraisal/title work, term-change branches and repeated submission references are descriptive; the guide does not auto-create duplicate orders, infer prerequisites, or advance milestones.

## Supplied sources and provenance

The PDF was read across **all 196 pages**. It includes 147 image-bearing pages, many training screenshots, and clipped embedded forms. All pages were rendered; visual screening covered the workflow and screenshot sections, with detailed inspection of unclear forms. No linked system, video, training page or endpoint was opened. Dates printed in the source do not establish policy effective dates.

| Source                                                     | Preserved context                                                                 | SHA-256                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `GFU_ Mortgage Loan Partner (MLP).pdf`                     | Role, communication, evidence, cadence, LOS usage and handoff training; 196 pages | `40982d896592230fd78a2fc0ab62d35869a1c2b5a89ce3f23c56fd07e293dffa` |
| `codex-clipboard-a93781f4-d81a-4c15-a182-6dbd39418b65.png` | Six MLP lanes: Welcome, Appraisal, STP, Initial Submission, Approved, CTC         | `9dd75175d2339e7fb56d1939f9ac67550cfb393fca28b435291f9ec3b82466f4` |
| `codex-clipboard-09098928-7967-4e15-af11-0efd60f0035b.png` | Lead/application, LO preparation, Lock Desk and Disclosures handoffs              | `70ef8380ab0799c19a7bef5ed8afb62b94bb1650736036bd7f449bfb06d7bb8c` |
| `Screenshot 2026-09-19 at 4.15.56 PM.png`                  | Processing, submission, approved/suspended branches, term changes and initial CD  | `0384160fbf821868e4cbf67dadf2018af7a41d148c1f9e9a3a30044916b42447` |
| `Screenshot 2026-09-19 at 4.16.24 PM.png`                  | Conditions, external CTC, signing, Closed and Funded                              | `71bed91600a0dfa64113227cbfa79df51c1eebf4087c8983dce09e26add9340d` |

The screenshots overlap and have clipped edges. They have no supplied precedence/version legend. “LP” is read as LendingPad because another diagram names it; source labels such as IDS, Blend and “Hub board” do not establish configured integrations or prove that the pictured board is this product.

## Whole-curriculum coverage disposition

Page references are PDF pages, not embedded-form pages. This table covers the complete curriculum without importing private examples or claiming unseen attachment content.

| PDF pages | Material reviewed                                                                         | Native disposition                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–7       | Company values, sales framing, department directory                                       | Orientation only. No marketing claims, broken directory addresses or contact destinations imported.                                                                          |
| 8–13      | MLP responsibilities, eight communication milestones, four performance metrics            | Coordination actions and cadence references retained. Printed benchmarks are goals, not measured platform outcomes.                                                          |
| 14–38     | Terminology, loan purposes/types, qualification buckets and matrices                      | Context only. Product thresholds, eligibility, legal definitions and formulas do not become automated gates.                                                                 |
| 39        | Six-lane MLP workflow diagram                                                             | Ownership, dependencies and evidence mapped to the guide. Parallel lanes do not impose a universal stage order.                                                              |
| 40–81     | LendingPad/1003, notes, assets/liabilities, REO, declarations and document organization   | Review and discrepancy handoffs retained; screenshots, borrower data and proposed LOS edits excluded.                                                                        |
| 82–84     | Embedded product checklists, signed ITP and appraisal task                                | Record external readiness/task references. Only clipped first pages of the checklists are visible.                                                                           |
| 85–90     | Appraisal receipt, ROV, credits and HPML                                                  | Appraisal coordination and delivery evidence retained; classification, deadlines and broad ROV restrictions excluded from automated policy.                                  |
| 91–99     | Timing example, welcome, vesting, STP summary, insurance/mortgagee                        | Welcome/document work and source locators retained. Timing, vesting law, approved mortgagee wording and insurance requirements need current owner review.                    |
| 100       | Portal directory containing plaintext credentials                                         | Credentials and account identifiers redacted from working text. Credential-containing render intermediates removed. No values, logins or raw source imported.                |
| 101–105   | Payoff directory and VOR                                                                  | Third-party request, authorization, receipt and processor dependency retained. No hardcoded contact directory or evidence-period rule.                                       |
| 106–119   | Initial submission, conditional needs, state approval forms, document review and suspense | Borrower updates, document chase and exception handoffs retained. Investor approval remains internal; state rules and ownership conflicts remain unresolved.                 |
| 120–146   | LE/CD explanation, changes, fees, escrow and COC                                          | Actual disclosure version/evidence references and responsible-desk questions retained. No fee, tolerance or regulatory clock engine.                                         |
| 147–159   | CTC, signing, closing funds, funding and post-close                                       | Signing and borrower follow-up retained; actual milestone proof required externally. Wire instructions, legal waiting periods and selective public-review requests excluded. |
| 160–168   | Escrow/loan FAQs, seasoning and incomplete procedure headings                             | Reference disposition only. No investor rules inferred from FAQ examples or WIP sections.                                                                                    |
| 169–181   | Welcome/title/insurance/VOE and processor-certificate examples                            | Safe request categories and evidence relationships retained. Branding, contacts, certification wording and investor calculations are not adopted.                            |
| 182–191   | Payoff, ATR, fraud, CD/final-doc requests and funded email examples                       | Request/response/handoff categories retained. No automatic certification, identity answers, health detail, account instructions or fixed sample dates imported.              |
| 192–196   | Contract extension, LOE, business funds, CEL/CPA, joint access and EIN previews           | Visible categories documented; clipped operative text/signatures remain unknown. No complete legal form or certification recreated.                                          |

## Cadence and ownership that remain unconfirmed

Training describes Friday borrower updates even with no change and an email recap after a call/text (9), welcome within 24 hours of disclosure (91), requested items within three days (92, 114–115), and quarterly metric review (12). The processing diagram gives an initial-review target of 24–48 hours and LO suspense follow-up of 48–72 hours. These are **source planning targets**, not accepted company SLAs, scheduled automation or regulatory dates. Work items use explicit human target dates.

Operations must resolve these differences before enforcing policy:

- Welcome begins after disclosures/task assignment in the MLP lane, but appears beside initial Processing after STP in the end-to-end diagrams.
- Appraisal ordering is assigned to MLP on p8 and processor on p39/p83 and the diagrams. Pricing/restructure is assigned to LO on p54/p92, but MLP is told to restructure elsewhere (85, 117).
- Suspense gives MLP a 48–72-hour contact window (117), while another script assigns communication to LO and next-business-day escalation (118). Role names AM, MLP, LPA and LOA are not consistently mapped.
- Application-element lists differ (65/81), HPML timing contains inconsistent calendar labels (89–91), Wyoming approval-disclosure examples differ (110/113), CD waiting and rescission are conflated (148–150), and VA seasoning wording differs (164–165).
- Initial CD request, CD issued, borrower receipt/signature, final CD review, signed closing documents, Closed and Funded must remain separate observations.

Approved source ownership, actual delivery evidence, current legal/investor guidance and applicable loan facts are required to resolve these points. The platform does not choose a disputed interpretation automatically.

## Clipped content, privacy and authority limits

The PDF includes only viewports of URLA 1/9 (65), DSCR/BSL/VA checklists 1/4, 1/3 and 1/4 (82–83), ROV 1/4 (88), the cut-off STP summary (97), NTB/commitment guides 1/18 and 1/10 (111), and contract extension 1/2 plus other partial forms (192–196). Videos, access-controlled links, WIP procedures and off-image diagram branches remain unknown. The 16 visible STP labels are not a complete form schema.

The original PDF and screenshots remain private source material. Raw borrower examples, source contacts, account/identity data, credentials and health details are not application fixtures, training assets or public deliverables. Reusable content consists of sanitized task descriptions, source locators and fingerprints. Original source instructions were not executed.

Further processor material will be assessed before any processing-specific execution design. A future Cadre/LOS connection needs an agreed authenticated interface, source event identifiers, authorized loan binding, receipts, reconciliation, retention and explicit owner acceptance. None is inferred from a manual reference or a completed Hub work item.

## Outcome evidence and verification

The operational aim is less human handling and fewer missed handoffs. Handling minutes are self-reported; elapsed queue time includes waiting and rework. Neither proves labor savings. LIA attribution and application-to-funding improvement remain unknown until verified touchpoints join authoritative LOS application/funding records under a defined baseline and cohort. Training advancement benchmarks are not production results.

This assessment verifies source coverage and disposition. Current application tests, lint, build and browser results belong in [the release verification record](../VERIFICATION.md); no new test pass is asserted by this document. Owner-resolution, source accuracy and hosted-integration gates remain in [Production readiness](PRODUCTION-READINESS.md).
