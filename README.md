# Gather — your family's home base

Gather is a shared family hub built for daily use by two parents and their kids. It started as a private "family control center" of records and grew into a consumer-grade app: a Today brief that answers "what's happening and who's on it," a color-coded calendar, chores with points and rewards, tappable routines, a recipe box that feeds a weekly meal plan and the grocery list, shared lists, a one-line family memory journal with countdowns, a thirty-second daily check-in between partners, and a guided Sunday planning ritual. Underneath, every family record still has a home: budget and cards, bills, accounts, health, school, home, vehicles, documents, contacts, emergency plan, and goals.

It works out of the box with no backend (local-first in the browser) and syncs across devices when connected to Supabase.

Installed on a phone, Gather runs as a Progressive Web App: it opens from the Home Screen without browser chrome, uses mobile safe areas, supports an offline shell, queues cloud edits made while disconnected, updates the app badge for unread/pending work, and can request device notification permission.

## What's inside

**Daily rhythm**
- **Today** (`/today`): greeting, next-up, member cards with progress rings, a unified timeline of events, tasks, chores, routines, meals, bills, appointments and milestones, smart nudges, tonight's dinner, grocery quick-check, kids' points, countdowns, and an inline mood check-in.
- **Quick add**: type it like you'd say it ("Dentist for Lily tomorrow 3pm", "Buy milk and eggs", "Pay water bill Friday", "$42 gas", "Memory: first lost tooth") and Gather files it as the right record. Center button on mobile, `N` on desktop.
- **Calendar**: month, week, day and agenda views, color-coded by person, with layer toggles for tasks, chores, meals, bills and milestones, member filters, overlap warnings, a day sheet, ICS import/export for Google, Apple and Outlook, and display-only Google Calendar iframe embeds.

**Family**
- **Chores & Rewards**: today's chores per kid as big tap tiles, a weekly chore chart, points, streaks, a reward store kids redeem from, parent approval and fulfillment, age-based starter chores.
- **Routines**: morning launches, bedtime wind-downs and family resets as step checklists with progress rings and celebrations.
- **Memories**: one-line moments, highlights, "on this day," and countdowns to birthdays, trips and big days.
- Tasks, Activities and Goals carried over from the original app.

**Lists & Meals**
- **Grocery** with store grouping; **Shared Lists** for packing, weekend to-dos, wishlists and projects, with templates; **Meal Plan** with a recipe picker, "pick for me," cook assignment and one-tap grocery export; **Recipe Box** with favorites, kid-approved, ratings and cook history.

**Us**
- **Daily Check-in**: mood, energy, one gratitude, one need, shared with your partner; fourteen-day trends.
- **Weekly Plan**: a six-step Sunday reset covering wins, calendar, meals, chores, money and connection.
- **Relationship** hub and the parent **Notes Board** from the original app.

**Money and Records**: Finance Hub, Budget & Cards, Bills, Accounts, Health, School, Home, Vehicles, Documents, Contacts, Emergency, and an **Overview** dashboard of every open loop.

**Finance Hub** (`/finances`): monthly cash-flow allocations, a recovery playbook and action queue, emergency reserve, per-card utilization milestones, fixed-payment payoff estimates, installment debts, subscription decisions and a what-if calculator, and assets with known-equity totals. Existing budget, bill, and account records remain connected. An optional OpenRouter assistant answers questions and proposes reviewed changes to financial records.

**Profiles**: each member has a color that follows them everywhere. A "Who is using this?" switcher makes a shared kitchen tablet work: switching to a kid personalizes Today and hides money, health, and adult areas.

**Installed mobile app**
- **Home Screen install prompt**: mobile users get guided iPhone/Android install steps. Android/Chrome uses the native install prompt when available.
- **Standalone app mode**: manifest metadata, iOS app metadata, maskable icons, status bar settings, and mobile safe-area spacing make the installed app open like a dedicated app.
- **Offline cloud queue**: signed-in users can keep adding/editing records while disconnected. Changes are stored on that device, shown immediately, and retried when the connection returns.
- **Device alerts and badges**: Settings includes device alert permission controls. The app badge reflects unread notifications and queued sync work where the browser/OS supports it.

## Tech stack

Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn-style local components, Supabase (Auth, Postgres, Realtime, RLS, Storage), Zod, React Hook Form, date-fns, lucide-react, Vitest.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without Supabase environment variables the app runs as a local workspace stored in the browser. First launch opens a short onboarding flow; you can also explore with the sample Rivera family.

Production-like local test:

```bash
npm run build
npm run start
```

## Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional shared server connection; leave both unset for session-only user keys.
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_ALLOWED_FAMILY_IDS=your-family-id
```

`SUPABASE_SERVICE_ROLE_KEY` is only for server-side scripts such as seeding. Never expose it in client code.
The finance API uses the signed-in user's token and RLS, not the service-role key. Never prefix an OpenRouter key with `NEXT_PUBLIC_`. `.env.example` lists the variables without credentials.

Future calendar OAuth work should add provider credentials only as server-side environment variables, such as `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, and a token encryption key.

## Supabase setup

1. Create a Supabase project and turn on email/password auth.
2. Apply all migrations in `supabase/migrations` in timestamp order. `20260905090000_daily_life_hub.sql` adds chores, rewards, routines, check-ins, memories, milestones, shared lists, recipes, weekly reviews, member colors, and row-level security that lets kids check off their own chores, routines and list items while only parents manage definitions.
3. Apply `20260906145331_calendar_embed_fields.sql` if your project already existed before the embedded calendar work. It adds the Google Calendar embed URL, display toggle, and iframe height fields to `calendar_connections`.
4. Create a user in Supabase Auth and sign in from Settings. A workspace is bootstrapped automatically for a new user.
5. Optionally seed the sample family: `SEED_USER_ID=auth-user-uuid npm run seed:starter`.

## Financial recovery files

1. Open **Money > Finance Hub > Import files**. Choose the supplied recovery HTML, workbook, or both. Parsing happens in the browser; source files are not uploaded or executed.
2. Review each candidate and its warnings. The workbook and HTML contain conflicting balances and allocations, so no rows are selected automatically. Choose one source for each conflicting record and verify it against current statements.
3. Select the records to add, then import. Existing matching records are not overwritten. If a save fails partway through, successfully saved rows stay marked and can be skipped on retry.
4. Set the verified date, unknown APRs, minimum payments, and asset values before using estimates. An unknown value is not a zero balance or a zero-interest loan.

The workbook parser reads `Recovery Hub`, `Recovery Subscriptions`, `Asset Register`, and populated `Credit Cards` rows. Sample transactions, sample bills, and the workbook's generic starter budget are excluded. Card rows labeled as samples are flagged for review. The HTML parser reads its recovery plan, cards, subscriptions, installments, and action checklist. Listed subscription rows determine totals; source summary discrepancies produce warnings. Personal source values are not embedded in the repository or seed data.

Plan allowances are distinct from actual spending in Budget. Cancellation decisions are distinct from confirmed provider cancellations. The hub does not claim a complete net worth or guarantee credit-score changes.

## OpenRouter assistant setup

1. Apply existing migrations first, then `supabase/migrations/20260915232546_finance_recovery_hub.sql` using the Supabase SQL editor or your linked CLI migration workflow. The migration creates five finance tables, family-scoped RLS, realtime subscriptions, transactional change receipts, and a request quota. It also fixes workspace bootstrap so users cannot self-join another family by knowing its ID.
2. Sign in to Gather as a parent or admin. Viewer accounts cannot use the assistant or apply changes. A local-only workspace supports finance records but cannot make LLM requests.
3. Create an API key at [OpenRouter](https://openrouter.ai/settings/keys). Set a credit limit appropriate for your household. Never put the key in a financial note, Git, or a public environment variable.
4. Open **Finance Hub > Assistant**, enter the key, and select **Connect & load models**. Choose a tool-capable model and check its displayed token prices. The key and chat live only in the current page's memory, not localStorage or Supabase. Leaving the assistant, turning on privacy mode, or reloading clears them.
5. Alternatively, set `OPENROUTER_API_KEY` on the server and `OPENROUTER_ALLOWED_FAMILY_IDS` to a comma-separated list of approved workspace IDs, then redeploy. The current ID is under **Workspace connection details** in the assistant. Both variables are required for a shared key; an unrelated workspace cannot use it.
6. Read and accept the financial-data sharing checkbox. Requests send an allowlisted financial snapshot and your chat messages to OpenRouter and the selected provider. Login references, account last-four values, health records, relationship records, and record notes are excluded from the snapshot. Anything you type into chat is still sent.
7. Try: "Review my cash-flow shortfall" or "Add a high-priority action to verify my card minimums this week." Review exact proposed fields, then select **Apply this change**. Applying persists the record inside Gather and saves a before/after receipt in `finance_change_log`.

Assistant scope: recovery plans, subscription records, assets, installments, private finance actions, credit cards, bills, and budget categories. It cannot delete records, change family permissions, make payments, transfer money, contact creditors, or cancel services with providers. Subscription changes inside Gather are tracking changes only.

Each request is bounded to one model call, 2,500 output tokens, up to five proposed changes, and the latest 100 records per supported table. Ten chat requests per user per ten minutes are allowed. Subset warnings appear in model context; large contexts are rejected. Retries of an applied proposal return its first receipt; edits made after a proposal was generated cause a conflict instead of being overwritten. Request limits are not a dollar spending cap: set one on your OpenRouter key.

Provider routing requests `data_collection: deny`; this is not a promise of zero retention. Review [OpenRouter's data policy](https://openrouter.ai/docs/guides/privacy/data-collection) and your chosen provider's terms. Never paste full account identifiers or secrets into chat. Models can make mistakes; confirm figures and advice against statements and appropriate professional guidance.

## Calendar embeds and sync

The Calendar page supports three calendar integration levels:

- **Embedded view**: paste a Google Calendar iframe snippet or `calendar.google.com/calendar/embed` URL into Embedded Calendar View. Gather stores only the sanitized Google embed URL and displays it inside the app. This is display-only; Google Calendar sharing settings decide who can view it.
- **ICS import/export**: export Gather events, dated tasks, bills, and appointments into an `.ics` file, or import external `.ics` events into the Family Calendar.
- **Provider tracking**: save connection records for Google, Apple, Outlook, ICS/WebCal, and other calendar providers so setup status, feed URLs, external IDs, and notes are tracked in one place.

Automated two-way sync with Google, Microsoft, or Apple requires production OAuth or CalDAV credentials plus hosted callback/feed endpoints. Do not store calendar account passwords in Gather.

## Mobile install

For iPhone:

1. Open the live site in Safari.
2. Tap Share.
3. Choose Add to Home Screen.
4. Tap Add.

For Android:

1. Open the live site in Chrome.
2. Tap the install prompt, or open the browser menu and choose Install app.
3. Confirm the prompt.

After install, open Gather from the Home Screen or app launcher. Use Settings → Mobile App to check install state, device alerts, and queued sync.

## Calendar OAuth setup plan

1. Create a Google Cloud project, turn on the Google Calendar API, and create OAuth credentials for a Web application.
2. Add authorized redirect URIs for local and production, for example `http://localhost:3000/api/calendar/google/callback` and `https://your-domain.com/api/calendar/google/callback`.
3. Store the Google client ID and client secret as server-side environment variables. Do not expose the secret through `NEXT_PUBLIC_` variables.
4. Add a server route that redirects the user to Google with the smallest required Calendar scopes, such as `calendar.events` for event create/update/delete or `calendar.events.readonly` for read-only sync.
5. Add a callback route that exchanges the authorization code for access and refresh tokens on the server.
6. Store refresh tokens encrypted in Supabase, scoped by `family_id`, member ID, provider, and external calendar ID.
7. Build server actions or API routes for creating, updating, deleting, and importing events. Client components should call your server, not Google directly.
8. Add token refresh, disconnect, retry/error status, and activity logging before calling it production-ready.

For Outlook/Microsoft 365, use Microsoft Entra app registration, request Microsoft Graph calendar permissions, and follow the same server-side token storage pattern. For Apple Calendar, start with ICS/WebCal display/import/export unless you choose to build CalDAV support.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:finance-db
npm run build
npm run icons:pwa
```

Tests cover schemas, filtering, access control, calendar sync and embeds, PWA config, the natural-language quick-add parser, chore scheduling and streak math, and the daily brief builder.
Finance tests also cover import parsing, unknown values, utilization math, cash-flow deficits, subscription scenarios, API authorization, context boundaries, consent, quotas, and proposal validation. `test:finance-db` runs the new migration against isolated in-memory Postgres via PGlite to check RLS, workspace bootstrap, atomic writes, retries, and stale-edit conflicts. It does not connect to production. Live Supabase and paid OpenRouter calls require your configured accounts and a deployment smoke test.

Dependency check for this release: `npm audit --omit=dev` reports zero runtime advisories. The full audit still flags 10 development-tool dependencies, including the existing Vitest 2 UI-server advisory. Tests here use `vitest run`, not an exposed UI server. Updating the test toolchain remains separate follow-up work; do not expose development or test servers publicly.

## Security notes

- Not a password manager. Forms block obvious secrets (full card or account numbers, SSNs, passwords). Store last four digits and a `password_location` reference only.
- Privacy mode hides money, health, account, vehicle, and emergency details on shared screens.
- Offline cloud edits and the latest signed-in workspace snapshot are cached in browser storage on the device so the installed app can keep working through connection drops. Treat installed devices as trusted family devices and use the device passcode/biometric lock.
- Supabase RLS scopes every table by family membership. Check-ins are visible to the author and, when shared, to the other parents. Kid profiles (role `viewer`) are blocked from finance, accounts, health, documents, contacts, communication, relationship and emergency areas by default.
- Finance API responses are `no-store`, and the service worker excludes API requests. Finance privacy mode unmounts records, import previews, and assistant chat; global search also omits financial records while privacy mode is active. Privacy mode is a display control, not encryption or an account security boundary.

## Deployment

Deploy to Vercel, Netlify or any Node host, add the three Supabase variables, apply migrations, and add the production URL to Supabase Auth redirect URLs. The build ships a web manifest, iOS metadata, maskable icons and a service worker with offline fallback, push-notification handlers, and app-badge support so it installs as a standalone app.

For this finance release, apply the finance migration before using the new cloud records, deploy the updated Next.js server routes, and configure an OpenRouter connection as above. On Netlify, keep shared OpenRouter credentials server-side in Functions scope. Public Supabase variables must be present at build time and available to server functions. Use Node 22 or newer. Do not deploy as a static export: the assistant requires server execution. After deployment, verify sign-in, import one reviewed record, reload it, and test a small assistant proposal and apply action. Code changes here do not automatically update the hosted site until committed, pushed, and deployed.

Native App Store packaging is intentionally deferred. If you later want store distribution, wrap the tuned web app with Capacitor and add native push/calendar bridges after the web experience is stable.

## Product name

The name is a single constant in `lib/constants.ts` (`APP_NAME`, `APP_TAGLINE`). Change it there and in `app/manifest.ts` if you want something else.
