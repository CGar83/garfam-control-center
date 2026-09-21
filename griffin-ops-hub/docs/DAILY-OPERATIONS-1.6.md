# Griffin Operations Hub 1.6.0: built for the operations team's day

**Builds on:** 1.5.0 (IA alignment, 7-item rail, loan-page tabs)  
**Standard:** the same bar as the 1.5.0 assessment. Linear, Stripe Dashboard, Rippling, ServiceNow workspaces.  
**Date:** 2026-09-21

1.5.0 fixed the arrangement. Fifteen peer nav items became seven, the loan became the spine, and desks became filters. That made the Hub navigable. It did not yet make it the first tab an MLP, processor, or closer opens every morning and keeps open all day.

This release closes that gap. The question behind every change: **what does a person on the operations team need to see, decide, or do in the next ten minutes, and how many clicks does it take?**

Nothing about the operating boundaries changed. Cadre owns processing execution. LendingPad is authoritative for loan data and milestones. Template IDs, source field order, section titles, and boundary copy are untouched.

---

## 1. Scope decisions in this release

| Decision | What changed | Why |
|---|---|---|
| **Lead / intake phase removed** | The "Lead and discovery" phase and its two steps are gone from the flow, the library, the chooser, and the loan phase stepper. Six phases remain: Application → Preparation → Processing → Submission → Closing → Funded. | The Hub is an operations platform. Origination conversations happen in the CRM. A phase nobody in operations works on is noise on every screen. |
| **Custom work no longer pretends to be an origination note** | `CUSTOM_TASK` keeps its template ID and fields. The chooser labels it "Custom work" and groups it under "Any phase", last in every list. | Lead-phase language leaked into a general-purpose task. The label now says what the form is for. |
| **Download source ZIP removed** | The developer handoff card on the Admin page is gone. | It was a build artifact, not an operations tool, and the file it linked to was not shipped. |
| **Lint gate restored** | 1.5.0 failed `npm run lint` with five errors. The helper `useWhen` was renamed `whenToUse` so the hooks rule no longer fires on a plain function. Unused variables removed. | A release that fails its own quality gate is not at the stated standard. |

---

## 2. What was still missing for daily use

The 1.5.0 assessment measured information architecture. Watching the personas walk the 90-second scripts surfaced a second layer of friction that architecture alone does not fix.

| Friction | Where it showed up |
|---|---|
| **Home answered the role question with two counters.** No "due today", no "waiting on my desk to complete", no "nobody owns this yet". | An MLP with eight open items saw a flat list and no order of attack. |
| **The queue lost its state on every visit.** Scope, search, and status lived in component state. Nothing could be bookmarked or shared in Slack. | A manager could not send a closer a link to "Closing, past target". |
| **Unassigned work had no pickup path.** Claiming a queued item meant opening it, scrolling to Accountability, choosing yourself, saving. | Four clicks to say "I've got this." |
| **The loan page had no coordination context.** Which phase the team believes the file is in, and what LendingPad showed the last time someone looked, lived in people's heads. | Every handoff started with "where is this one?" |
| **Blocked meant a yellow badge.** The reason was buried in the work item's history tab. | The assessment rule "Blocked means a named missing artifact" was policy, not UI. |
| **Activity was split by record type.** The loan timeline showed worksheet events only. Work-item events lived on each item. | An auditor could reconstruct the story. A processor in motion could not. |
| **Navigation was mouse-only.** No shortcuts, no recents, the palette knew loans and pages but not actions. | Power users, the people who live in the tool, had no fast path. |
| **Creating work could create a duplicate.** The dialog did not show what was already open on the loan. | The most common MLP mistake in a shared queue. |

---

## 3. What 1.6.0 builds

### 3.1 Shell: the frame does more work

- **Live counts on the rail.** Home shows work assigned to you. Work shows open items, in red when anything is blocked. The rail is a status surface, not a list of links.
- **Contextual breadcrumb and window title.** On a loan: `Loans / Bennett · #1042802`. On a work item: `Work / Prep dossier · #1042803`. Browser tabs and history become readable.
- **Global "Start work" in the top bar**, and the `N` key. Creation is one click from anywhere.
- **Keyboard shortcuts.** `/` or `⌘K` search, `N` new work, `G` then `H / L / W / F / B / I` to jump between Home, Loans, Work, Flow, Library, Insights. `?` shows the list.
- **Command palette with recents and actions.** Opens with the last five loans and work items you touched. Typing a loan number offers "Start work on #…" as the first result. Open work shows its status inline.

### 3.2 Home: a daily cockpit, not a landing page

Six tiles answer the morning question in the order people actually ask it:

`Assigned to me · Due today · Past target · Blocked · Ready for review · Unclaimed in your desk`

Each tile is a link into the matching queue view. Below them:

- **"Your files, in order."** Open work in urgency lanes: past target, blocked, due today, ready for review, upcoming. Each row shows loan, borrower, phase, readiness bar, status, and target. One list, no scrolling between panels.
- **Unclaimed desk work with a Claim button.** Department members pick up queued, unowned items in their own desk without opening them.
- **Desk pulse for managers.** Open, blocked, late, and unowned counts per desk, each a link into that desk's queue. This is the stand-up table.
- **Recent loans.** Per device, per viewer. Pick up where you left off.

Role headlines and the desk-specific "start here" forms from 1.5.0 remain.

### 3.3 Work: a queue you can share and act from

- **Every filter is in the URL.** Desk, scope, status, search, sort, and view. `/operations?desk=closing&scope=overdue` is a link a manager can paste into Slack, and it opens the same way for the closer.
- **Nine scopes.** Active, Mine, Due today, Past target, Blocked, Ready for review, Unclaimed, Complete, All.
- **Sort** by priority, target, last touched, or loan, from the toolbar or by clicking a column header.
- **Group by loan.** A third view beside list and board. Each loan becomes a header with open, blocked, and past-target counts, its work beneath. This is the queue read the way the assessment asked for: loan as the spine.
- **Claim from the row.** Unassigned items in your desk show a Claim control in the owner column.
- **Row context.** Phase chip, loan link, borrower, priority, readiness fraction, and "touched today / 3 days ago". Past-target rows carry a red edge.
- **Compact density toggle**, remembered per device.
- **Desk chips show counts.** MLP 8, Closing 3, Lock 1.
- **Duplicate guard in the create dialog.** Once a loan number is typed, the dialog lists the open items already on that loan and flags how many share the chosen template. "Recommended for your desk" heads the workflow chooser.

### 3.4 Loan record: the spine, with context the team sets

- **Coordination context bar.** Three human-set fields on the loan: Hub coordination phase, observed LOS status, and a one-line coordination note. Every field is labelled as human-set and unverified. Changes are recorded as loan events with before and after values. In the connected build the fields are read-only until a migration adds the columns; the adapter advertises this through `db.capabilities`.
- **Phase stepper.** Six phases with open, blocked, and complete counts. The current coordination phase is dark. Clicking a phase filters the Work tab to it.
- **Now tab.** Next action (blocked work first), a **Blocked** panel listing every blocked item with its recorded reason, and a **suggested next form** derived from the most recently completed item when that form is not already open.
- **Work tab grouped by phase**, open items first inside each phase.
- **One activity timeline.** Worksheet stage transitions, field events, and every operations event (work created, status changes, saves, time entries, coordination updates) in one list, filterable by kind, exportable as CSV.
- **Tabs and the phase filter live in the URL.** `/loans/1042803?tab=work&phase=preparation` is a shareable position in the file.

### 3.5 Work item: blockers and ownership up front

- **Blocked banner.** When status is Blocked, the newest block reason appears at the top of the page with the instruction to record the missing artifact before moving the work.
- **Claim banner.** Unowned work in your desk offers "Claim it" before you scroll.

### 3.6 Flow and Library

- **Flow opens on the right phase.** With a loan selected, the map opens on the earliest phase that has open work and shows "N open here" on each phase button.
- **Library counts phases from the catalog** and adds a "Recommended for your desk" strip.

---

## 4. Persona scripts, re-run

The 1.5.0 scripts, timed against 1.6.0 in the local demo.

| Persona | Script | Result |
|---|---|---|
| **LOA** | Home → loan # → Start "LO / LOA submission package" → Final QC → save → hand to MLP | `N`, type loan number, dialog shows the two items already open, choose package, create. Section rail jumps to Final QC. |
| **MLP** | Home → My work → welcome item → complete → offered next | Home lanes list the welcome under "Due today". Completing shows "Next on this loan: Document follow-up". |
| **Processor liaison** | Loans → # → Flow → Preparation → open the blocked one | Loan page opens with the phase stepper showing "Preparation · 1 open · 1 blocked". The Blocked panel names the artifact. One click. |
| **Closer** | Work → Closing → open CD request → flags → request review → Evidence tab | `/operations?desk=closing` shows 3 in the chip. The past-target CD request has a red edge and sorts first. |
| **Manager** | Insights → past target by desk → click into the loan | Home's desk pulse already answers it: Closing 1 late, Origination 1 late, each a link. Insights remains for trend. |

---

## 5. What was deliberately not done

- No new templates. No merged templates. Every pair the 1.5.0 assessment said to keep separate is still separate.
- No auto-advancing phases. The coordination phase is set by a person and says so.
- No LendingPad writes, and no inferred LOS status. "Observed LOS status" is a typed note with a timestamp and a name.
- No timers on cadences.
- No role-specific home *pages*. One Home, one role query, different first tiles.

---

## 6. Recommended next steps

| Priority | Change | Why |
|---|---|---|
| P1 | Migration for `hub_phase`, `observed_los_status`, `coordination_note` on `loans`, plus the `LOAN_COORDINATION` event, so the connected build matches local | The context bar is the most-used new surface in the demo. |
| P1 | Saved views: name and pin a queue URL per person (Slack-ready) | Every filter is already a URL. Naming them is the last step. |
| P2 | Desk pulse as a shared, refreshing stand-up screen | The manager table already exists. A wall display is a layout change. |
| P2 | Handoff notifications: when work moves to Ready for review, the next desk sees it in "Ready for review" the same minute | Today the count updates on load. A polling refresh is cheap in the connected build. |
| P3 | Observed LOS status fed from the LOS Connector when it ships | Same field, verified source. The label flips from "manual" to "observed". |

The attribution dependency has not moved: LIA touchpoints joined to funded loans through the LOS Connector. Every loan in this Hub carries the identifiers that join needs. Nothing in this release claims the join exists.
