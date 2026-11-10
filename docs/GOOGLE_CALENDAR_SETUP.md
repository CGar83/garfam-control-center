# Google Calendar two-way sync

Gather can connect one writable Google calendar to each family workspace. Calendar events sync in both directions, including title, description, location, dates and deletions. Tasks, bills, health records, attachments and other modules are not sent through this connection.

## 1. Create the Google Cloud project

1. Open https://console.cloud.google.com/ and sign in with the Google account that will own the integration.
2. Use the project selector to create a project named `Gather Family Calendar`, or select a project you already own.
3. Open **APIs & Services > Library**. Search for **Google Calendar API**, open it and click **Enable**.
4. Open **Google Auth Platform**. Complete **Branding** with an app name, support email and developer contact email. For personal testing, optional homepage, privacy and logo fields can remain empty. Do not claim ownership of `netlify.app` as a domain.
5. Under **Audience**, select **External** and keep the app in **Testing** initially. Add your Google email and your spouse's Google email as test users. A company Workspace administrator may restrict third-party access.
6. Under **Data Access**, add these two scopes:

   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

The first permission lets the server manage events; the second lists calendars so you can select one. Google permissions cover more than the selected calendar, but Gather's worker uses only your selected calendar. Review the consent screen carefully.

## 2. Create the OAuth client

1. Open **Google Auth Platform > Clients > Create client**.
2. Choose **Web application**, with a name such as `Gather Netlify`.
3. Under **Authorized redirect URIs**, add this exact address, without a trailing slash:

   `https://family-control-center.netlify.app/api/calendar/google/callback`

4. No JavaScript origin is required for this server-side authorization flow. If you add one, use `https://family-control-center.netlify.app`, without a path.
5. Create the client and keep the client ID and client secret in your password vault. Do not post the secret in chat, commit it or put it in a `NEXT_PUBLIC_` variable.

This is separate from Supabase sign-in. You do not need to configure Supabase's Google login provider to connect a calendar.

## 3. Add the Netlify server settings

Open the `family-control-center` project in Netlify, then **Project configuration > Environment variables**. Add these for the **Production** deploy context and **Functions** scope:

| Name | Value |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | Client ID from step 2 |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Client secret from step 2; mark secret |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Exact callback above |
| `GOOGLE_CALENDAR_ENCRYPTION_KEY` | One stable, random 64-character hexadecimal secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing Supabase service-role key; server-only |

The deployment also needs the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables.

For this rollout, the redirect URI and a new encryption key were already set on the production Netlify site. **Do not replace the encryption key.** Add the Google client ID and secret. Only add the Supabase service-role key if Calendar's missing-settings check reports it absent. Its value belongs in Netlify, not the browser or chat.

For a fresh installation, generate the encryption key once using `openssl rand -hex 32`. Keep a backup in your password vault. Changing it makes existing saved Google credentials unreadable; users must reconnect.

After changing variables, open **Deploys > Trigger deploy > Deploy site**. Existing deployments do not automatically acquire changed environment values.

## 4. Apply the database migration

Apply `supabase/migrations/20261110143023_google_calendar_two_way_sync.sql` using your normal migration workflow, or paste its contents into the project's Supabase SQL Editor and run once. For this rollout it is applied separately by Codex; do not rerun if it is already in migration history.

The migration adds private credential, mapping and one-time OAuth state tables. Browser roles cannot read them. Only server code with the service-role key can access them. The server checks the signed-in user's family membership and parent/admin role before managing a connection. Credentials are encrypted at rest in these tables, not end-to-end encrypted against the application server.

## 5. Connect the calendar

1. In Google Calendar, create a dedicated calendar such as `Family - Gather`. Share it with your spouse if desired. This is safer to start with than your primary calendar because deletions propagate in both directions.
2. Open https://family-control-center.netlify.app/calendar and sign in to Gather as a parent or admin.
3. Open the Calendar sync section and find **Google two-way sync**.
4. Click **Connect Google**. Sign in with an account added as a test user and grant both requested Calendar permissions. If Google blocks the app, check the test-user list or administrator restrictions; do not bypass security warnings.
5. Back in Gather, explicitly select your dedicated writable calendar.
6. Leave **Also send existing Gather calendar events to Google** off initially. New Gather events created after setup will sync. Turning it on includes older Gather events and may copy many records.
7. Read and check the sharing/deletion consent, then click **Start two-way sync**.
8. Click **Sync now** until the current batch cycle finishes. Check the selected calendar, time zone, status and last complete sync time.

Only the parent who authorized Google can change or disconnect the connection. Another parent can disconnect an orphaned connection after its owner loses parent/admin workspace access and the worker pauses it. Other family members with calendar access can see imported event details.

## 6. Verify with disposable events

1. Create `Sync test - Gather` in Gather for tomorrow. Click **Sync now** and check Google Calendar.
2. Change its title and time in Google. Sync again and check Gather.
3. Create `Sync test - Google` in Google. Sync again and check Gather.
4. Test an all-day event and confirm the day is right. Gather converts using the selected Google calendar's time zone; keep your device and calendar zones aligned while testing.
5. Delete each disposable event, one from each side, and verify the corresponding deletion.
6. To test conflicts, edit the same synced event in both places before syncing. Neither version should be overwritten automatically. Review both versions and choose **Keep Gather** or **Keep Google**. If either changed again during review, refresh and review the new versions.
7. Test **Pause**, **Resume** and **Disconnect**. Disconnect removes credentials and sync mappings but does not delete copied events. Reconnecting an existing calendar can import previously copied events again; inspect for duplicates first.

Real Google authorization and these live event checks require your client credentials and consent. Automated engine, API and database tests do not replace this final check.

## Timing and limits

- Checks run about once a minute while a signed-in parent's app is visible, plus a Netlify scheduled function every five minutes on the published production deploy. This is polling, not instant push notification sync. Browser/hosting availability and Google quotas affect timing.
- The background job processes one eligible workspace per run, oldest checked first. Multiple workspaces or larger calendars need additional cycles. This is intended for small family calendars, not a large multi-tenant calendar service.
- Google imports use paginated reconciliation over the past 30 days through the next 365 days. Previously mapped events are checked separately for edits and deletions. Each request resumes bounded batches. Up to 1,000 local candidates/mappings per connection are supported.
- Events with guests, locked events and events not organized by the connected account are read-only from Gather. No guest invitations or attendee updates are sent.
- Repeating Google series import as individual occurrences. Gather can update writable occurrences, not manage the whole series. Gather's free-text repeat rules are skipped; create recurring series in Google instead.
- Keep titles, descriptions and locations within ordinary event lengths. Unsupported event types are not imported. Calendar lists are limited to the first 500 writable-calendar results.
- Failed requests retain progress. Revoked or expired Google access requires **Reconnect Google**. Simultaneous changes require manual review. Changes in another app may need several checks to appear.
- External apps in Google's **Testing** state using Calendar scopes normally lose refresh authorization after seven days. Reconnect during testing. For durable use, review Google's production publishing and verification requirements. Public distribution with sensitive scopes can require verification and an owned-domain privacy policy.
- Apple Calendar can display the same Google account calendar through Apple's account settings, but this implementation connects directly to Google, not Apple CalDAV or Microsoft Graph.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| One-time server setup shown | Expand missing settings; add those names in Netlify Functions/Production, then redeploy |
| `redirect_uri_mismatch` | Compare Google's authorized redirect byte-for-byte with the callback and Netlify variable |
| Access blocked | Confirm External/Testing test user, correct project, enabled API and any Workspace administrator restrictions |
| No writable calendar | Use the correct Google account and grant calendar editing permission |
| Reconnect required | Google authorization expired, was revoked or credentials changed; reconnect as the original owner |
| Busy/in progress | Wait for the bounded worker; its lease expires after 90 seconds if a process stops |
| Changes not appearing | Confirm correct calendar, scope/window, visible parent app or scheduled production function, then run additional batches |
| Conflict warning | Review both versions in the sync panel; no automatic last-write-wins overwrite |

Do not log OAuth codes, refresh tokens or private event payloads in support tickets. Share only sanitized status codes and event test results.

## Developer checks

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:google-db` and `npm run build`. Google API tests use an isolated fake transport; database tests execute the real migration in PGlite, checking browser-role denial, one-time state, expiry, leases and cascades.

Official references: [web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [OAuth refresh-token limits](https://developers.google.com/identity/protocols/oauth2#expiration), [Calendar event updates](https://developers.google.com/workspace/calendar/api/v3/reference/events/update), [resource version checks](https://developers.google.com/workspace/calendar/api/guides/version-resources).
