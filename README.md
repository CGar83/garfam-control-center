# Family Control Center

A private family management web app for centralizing calendars, calendar sync setup, activity ideas, tasks, groceries, meal planning, finances, budget and credit-card tracking, bills, safe account references, health details, school records, home and vehicle maintenance, documents, contacts, communication notes, relationship health, emergency planning, family goals, notifications, and settings.

The app is designed as a clean family operating system: fast enough for daily use, structured enough to replace scattered notes, texts, spreadsheets, paper folders, and fridge lists.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Supabase Auth, Postgres, Realtime, Row Level Security, and Storage
- Zod validation
- React Hook Form
- date-fns
- lucide-react
- Vitest

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If Supabase environment variables are missing, the app runs as a local workspace with starter family records stored in browser local storage.

For a production-like local test:

```bash
npm run build
npm run start
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is only for server-side scripts such as seeding. Never expose it in client code.

## Supabase Setup

1. Create a Supabase project.
2. Enable email/password authentication.
3. Apply all migrations in `supabase/migrations` in timestamp order.
4. Create a user in Supabase Auth.
5. Optionally seed starter data with that user's auth UUID as `SEED_USER_ID`.

When a signed-in Supabase user has no family membership yet, the app can bootstrap a private workspace automatically and attach that user as the Admin family member. Additional family members can be added from Settings.

## Database Migrations

With the Supabase CLI:

```bash
supabase db push
```

Or paste the SQL migration into the Supabase SQL editor.

The migrations create all family tables, child profile fields, budget tracker tables, notifications, activity log, RLS helper functions, RLS policies, indexes, and the `family-documents` Storage bucket.

If your Supabase project already has the original schema, run `supabase/migrations/20260905053711_family_member_profiles_and_access.sql` next. It adds child age fields and viewer access restrictions for sensitive areas.

## Calendar Sync

The Calendar page includes a Calendar Sync panel for Google Calendar, Apple Calendar, Outlook, and generic ICS/WebCal workflows.

- Use `Export ICS` to download a family calendar feed containing events, dated open tasks, bills, and health appointments. That file can be imported into Google Calendar, Apple Calendar, Outlook, and other calendar apps that support `.ics` files.
- Use `Import ICS` to import external `.ics` events into the Family Calendar.
- Use provider connection records to track calendar name, provider, sync direction, feed URL, status, and notes.

Automated two-way sync with Google, Microsoft, or Apple requires production OAuth or CalDAV credentials plus a hosted feed/callback endpoint. This first version includes the database and UI structure, `.ics` import/export, and provider tracking without storing calendar account passwords.

## Budget and Credit Card Tracker

The Budget & Cards page integrates the workbook-style `Ultimate Budget + Credit Card Tracker` into the app as live records instead of static spreadsheet formulas.

- Budget settings track month, year, planned income, starting cash, prior-balance handling, payoff strategy, and utilization thresholds.
- Budget categories track group, category, need/want/goal, monthly plan, rollover, and prior balance.
- Transactions log positive-amount income, expenses, transfers, and credit-card payments.
- Credit cards track issuer, owner, last four only, balance, limit, APR, payment assumptions, due dates, autopay, and password-vault location.
- Sinking funds track target amount, target date, saved amount, planned monthly contribution, and progress.
- The page computes monthly income, spending, savings rate, remaining budget, card debt, utilization targets, avalanche/snowball payoff order, and annual income/spending/savings summaries.

The tracker intentionally does not store full card numbers, account numbers, passwords, SSNs, or credit-score guarantees. Utilization thresholds are planning aids only.

## Starter Data

Local starter data is automatic and includes a family workspace with adults, child profiles, age-aware activity ideas, budget settings, budget categories, transactions, credit cards, utilization targets, payoff planning data, bills, and sinking funds.

For Supabase:

```bash
SEED_USER_ID=auth-user-uuid npm run seed:starter
```

`SEED_USER_ID` attaches the first parent record to your real Supabase Auth user so RLS can read the seeded workspace.

The SQL seed file at `supabase/seed.sql` is also available for CLI workflows, but it does not know your auth user UUID unless you edit the inserted `family_members.user_id`.

## Quality Commands

```bash
npm run icons:pwa
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run icons:pwa` regenerates the PNG app icons from `scripts/generate-pwa-icons.mjs`.

## Security Notes

- This is not a password manager.
- Do not store full passwords, full SSNs, full financial account numbers, or full medical record numbers.
- Account, finance, budget, credit-card, transaction, vehicle, health, and emergency forms validate partial identifiers and block obvious stored secrets.
- Store last four digits only where applicable.
- Use the `password_location` field for references such as `1Password Family Vault`.
- Privacy mode hides sensitive financial, budget, card, transaction, health, account, vehicle, and emergency details on shared screens.
- Supabase RLS scopes records by `family_id` and membership.

## Deployment Notes

1. Deploy the Next.js app to Vercel, Netlify, or another Node-compatible host.
2. Add the three Supabase environment variables in the hosting dashboard.
3. Apply the Supabase migration before inviting family members.
4. Use Supabase Auth for email/password access.
5. Keep Storage bucket policies private unless you intentionally add signed URL workflows.
6. Production builds include a web app manifest, iOS metadata, generated PNG icons, maskable icons, safe-area mobile nav support, and a service worker for installable app behavior with an offline fallback page.
7. In Supabase Auth settings, add your production URL to allowed redirect URLs before testing sign-in/sign-up from the deployed site.
8. Run Lighthouse against the deployed HTTPS URL and confirm the PWA installability checks pass.

## Production PWA Notes

- Manifest: `app/manifest.ts` defines install name, colors, icons, shortcuts, launch behavior, and standalone display.
- Icons: `public/icons` contains SVG source icons plus generated PNG icons for Android, desktop, maskable launchers, and iOS home screen installs.
- Service worker: `public/sw.js` precaches the app shell, common daily routes, manifest, icons, and the offline fallback page. Navigations use a network-first strategy with cached fallback.
- Offline status: the app shell shows a visible offline banner. Supabase-backed production writes are blocked while offline with a clear error. Local workspace records can still be edited because they are browser-local.
- Update behavior: production service worker registration checks periodically for updates and notifies the user when a new app version is ready to refresh.

## Current App Coverage

- Create a family workspace.
- Add and manage family members and roles.
- Add, edit, complete, and delete tasks.
- Add and check off grocery items.
- Add calendar events.
- Export and import `.ics` calendar data for Google Calendar, Apple Calendar, Outlook, and other popular calendar apps.
- Track calendar sync provider connections and status.
- Use the Activities hub for son, daughter, all-kids, family, and date-night ideas, then add ideas directly to the Family Calendar.
- Use the Budget & Cards hub for workbook-style budget settings, category plans, transactions, credit cards, utilization targets, debt payoff planning, sinking funds, and annual summaries.
- Add bills and see upcoming and overdue bills.
- Add health, school, home, vehicle, document, contact, emergency, communication, and goal records.
- Use the Relationship hub for marriage-health check-ins, connection rituals, conflict repair, stress conversations, and weekly state-of-the-union notes.
- Search across the app.
- Toggle privacy mode and dark mode.
- Export workspace data as JSON.
- Use desktop sidebar navigation and mobile bottom navigation.
- Use the notification center for assigned tasks, new notes, events, bills, and appointments.
- Install the production build as a standalone web app from supported browsers with generated PNG icons, maskable icons, and iOS home-screen metadata.
- Use cached app shell/offline fallback behavior when the network is unavailable.
- See a visible offline banner, with Supabase-backed production writes blocked until reconnect.
