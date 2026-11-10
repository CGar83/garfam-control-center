# Gather usability review

## November 10 implementation

The first three priorities below are implemented with the first-pass fixes in this release. Search results include the table and record ID, and a shared details dialog resolves the item within the current family and permitted destination. It supports refresh, unavailable-record messages, privacy masking, parent/admin editing, and returning to the page without losing other URL parameters. Legacy Calendar and Finance Hub links retain their existing behavior.

New record forms show required and common fields first. More details preserves optional values when collapsed, expands for validation errors, and starts open when editing an existing record. Closing a dirty form asks before discarding it. Mobile grouped pages have a labelled native section picker with only permitted destinations.

Local browser verification covered exact task search/open/edit/return, required-field validation, and switching Tasks to Routines on a phone without horizontal overflow. Production verification is limited to routes and the signed-out gate; no private household data or live provider accounts were changed.

The dated review below remains the original assessment and backlog; items 1-3 are now complete.

Reviewed November 9, 2026. Evidence: current repository, shared page components, automated tests, and the live signed-out Today page. Authenticated production workflows and calendar provider connections were not exercised. Findings below distinguish implemented fixes from remaining work. No household usability study or adoption measurements were available.

Local browser verification used the existing sample-family flow: page search navigated to Calendar, an unmatched task search displayed recovery controls, Clear filters restored the list, and the phone task view had no horizontal overflow. The 167-test suite, lint, TypeScript, and production build passed. Changes in this pass are local and have not been deployed.

## Assessment

The platform covers daily coordination well, but the breadth creates learning overhead. Focus the next iteration on finding an item, understanding what needs attention, and finishing a task with fewer decisions. Retain Today and Calendar as the daily entry points.

## Current feature map

| Area | Existing screens and capabilities visible in the code |
| --- | --- |
| Daily coordination | Today agenda, member selector, Calendar, dashboard overview, quick add, global record search |
| Family | Chores and rewards, routines, tasks, memories, activities, goals |
| Lists and meals | Grocery shopping view and quick entry, shared lists, meal planning, recipes |
| Couple coordination | Daily check-in, weekly planning, relationship records, notes board |
| Money | Finance hub, recovery planning, credit/debt, subscriptions, assets, budget/cards, bills, account references |
| Household records | Health, school, home, vehicles, documents, contacts, emergency plan |
| Assistance | Context selection, proposed financial changes, saved conversations, private Markdown session logs |
| Workspace | Members, roles, privacy, theme, cloud/local status, mobile navigation, installation support |

Screen availability does not prove that each external integration or workflow works end to end.

## Findings and first-pass fixes

| Priority | Finding | Change |
| --- | --- | --- |
| High | Signed-out cloud view showed a sample member, notification count, and workspace actions alongside a sign-in gate | Header now shows the app name and Sign in; removes the redundant Back to Today action on that gate |
| High | Search could not find destinations such as Calendar or Settings | Adds permission-filtered page results, useful destinations before typing, and separate page/record sections |
| High | Overdue filtering included completed records and treated an item due today as overdue | Excludes settled/cancelled statuses; overdue means before today, consistent with the daily filter label |
| Medium | Status dropdown mixed task, bill, and other module statuses | Reads the current module's configured choices |
| Medium | An empty filtered list gave no immediate recovery action | Clear filters available in the toolbar and no-results state |
| Medium | Full search text competed with the member selector and toolbar on phones | Uses an explicitly labelled icon button on small screens |
| Medium | Filter dropdowns lacked explicit accessible names | Adds person/status/priority/category/date labels |

## Next improvements in order

1. **Make every search result open the exact item.** Search generates `?record=` links, while the shared ModulePage does not consume that parameter. Define a consistent details view, including back navigation and unavailable-record states; implement it across custom pages too. Preserve privacy masking and edit permissions.
2. **Reduce form effort.** Review each module's most common action and show only required fields initially. Put less frequent fields behind optional details. Measure field errors and time to save using synthetic test cases before introducing real-content analytics.
3. **Make mobile section navigation direct.** The Family and Lists bottom tabs open one default page; sibling destinations require More. Add accessible section links or a section picker within each group, with the current page clearly identified.
4. **Clarify Today versus Overview.** Keep Today focused on the next commitment and actionable work. Give Overview an explicit purpose, such as a weekly household review, and remove repeated content after observing use.
5. **Show calendar connection outcomes.** Explain whether a connection is an embedded view, import, subscription, or two-way sync. Show last successful refresh, errors, and one clear recovery action. Verify expiry/reconnect and duplicate handling with real provider accounts.
6. **Improve grocery recovery.** Offer undo after checking an item and confirm bulk clearing. Replace Add Recent's arbitrary first checked item with a selectable recent-items list.
7. **Improve first-use setup.** After sign-in, prioritize adding household members, a first event, and a shared grocery list. Keep setup dismissible and based on actual saved data.
8. **Test with households.** Observe a parent and a teen separately: find tomorrow's event, add a task for someone, shop a list, find a school contact, and recover from an empty search. Record completion, wrong turns, and requested help. Do not infer ease of use from visual polish alone.

## Acceptance checks for the next pass

- A first-time user can identify Today, Calendar, and Add without opening every menu.
- Search opens the intended record, including after a refresh or a link from another page.
- A user can distinguish private cloud data, local-only data, and a disconnected calendar.
- Filtered empty states always offer recovery without deleting or creating records.
- Daily workflows work at phone widths, with keyboard focus visible and controls labelled.
- Privacy mode, child restrictions, and unsaved form handling survive navigation changes.

These are proposed acceptance checks. Household completion rates and satisfaction have not been measured.
