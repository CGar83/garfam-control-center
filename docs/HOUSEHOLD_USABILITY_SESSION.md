# Household usability session

Status: prepared, not conducted. Run separately with a consenting parent and teen before marking usability validation complete. Use synthetic household records and a teen profile with the intended permissions. Do not use real health records, financial statements, passwords, or provider keys. No automatic analytics or recordings are collected by this release.

## Session method

Tell each participant: "Try each task as you normally would. Say what you expect to happen. You can stop at any time." Do not show the path first. Start a timer when the participant reads the task; stop at completion or when they choose to stop. Record help and wrong turns as observations. These are proposed checks, not measured results or industry benchmarks.

| Task | Successful outcome | Parent time / help / wrong turns | Teen time / help / wrong turns |
| --- | --- | --- | --- |
| Find tomorrow's family commitment | Opens correct event and recognizes its time and assigned person | Not measured | Not measured |
| Add a task for another household member | Correct title, assignee and due date saved if permitted; restricted profile understands its limit | Not measured | Not measured |
| Shop the shared list and recover a mistake | Checks intended item, uses Undo, and restores the item | Not measured | Not measured |
| Find a school contact | Finds correct contact and phone/email without editing it | Not measured | Not measured |
| Recover from an empty search | Revises query or clears filters and returns to the intended content | Not measured | Not measured |
| Switch from Tasks to Routines on a phone | Uses Family page picker and recognizes current destination | Not measured | Not measured |
| Explain calendar connection status | Distinguishes embedded view, manual copy, and unconnected two-way sync | Not measured | Not measured |
| Review next week's priorities | Uses Household Review instead of looking for the day's checklist | Not measured | Not measured |

For the parent, also test dismissing and reopening Family setup, selecting a particular recent grocery item, cancelling Clear Checked, and confirming it on disposable data. For the teen, verify that restricted Money, relationship and health destinations are absent or inaccessible according to the configured profile. Confirm server permissions using separate real test logins before inviting additional households.

## Questions after each session

- Which label or action was hardest to understand?
- Where did you expect the information to be?
- Which step would you avoid using again, and why?
- What would you change first?

## Decision record

Date: pending. Facilitator: pending. Participant consent: pending. Device/browser: pending. App commit: pending.

Record each issue as: observed trigger, expected outcome, actual outcome, impact, proposed change, owner, verification. Fix blockers and repeated wrong turns first. Repeat the failed task with fresh participants where possible. Do not treat automated tests or developer walkthroughs as household completion or satisfaction evidence.

## Provider checks that need real accounts

Test Google embed sharing with both parents signed in and signed out, permission revocation, and reload. Import a UTC ICS file, repeat it, and verify duplicate counts. Try a malformed file and a partial failure, then retry. Import an exported file into the actual Google/Apple/Outlook destination and verify local time and all-day duration. Provider subscription refresh, OAuth expiry/reconnect and two-way reconciliation remain unimplemented in Gather; do not report those as tested or working.
