# Gather — your family's home base

Gather is a shared family hub built for daily use by two parents and their kids. It started as a private "family control center" of records and grew into a consumer-grade app: a Today brief that answers "what's happening and who's on it," a color-coded calendar, chores with points and rewards, tappable routines, a recipe box that feeds a weekly meal plan and the grocery list, shared lists, a one-line family memory journal with countdowns, a thirty-second daily check-in between partners, and a guided Sunday planning ritual. Underneath, every family record still has a home: budget and cards, bills, accounts, health, school, home, vehicles, documents, contacts, emergency plan, and goals.

It works out of the box with no backend (local-first in the browser) and syncs across devices when connected to Supabase.

## What's inside

**Daily rhythm**
- **Today** (`/today`): greeting, next-up, member cards with progress rings, a unified timeline of events, tasks, chores, routines, meals, bills, appointments and milestones, smart nudges, tonight's dinner, grocery quick-check, kids' points, countdowns, and an inline mood check-in.
- **Quick add**: type it like you'd say it ("Dentist for Lily tomorrow 3pm", "Buy milk and eggs", "Pay water bill Friday", "$42 gas", "Memory: first lost tooth") and Gather files it as the right record. Center button on mobile, `N` on desktop.
- **Calendar**: month, week, day and agenda views, color-coded by person, with layer toggles for tasks, chores, meals, bills and milestones, member filters, overlap warnings, a day sheet, and ICS import/export for Google, Apple and Outlook.

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

**Money and Records**: Budget & Cards, Bills, Accounts, Health, School, Home, Vehicles, Documents, Contacts, Emergency, and an **Overview** dashboard of every open loop.

**Profiles**: each member has a color that follows them everywhere. A "Who is using this?" switcher makes a shared kitchen tablet work: switching to a kid personalizes Today and hides money, health, and adult areas.

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
```

`SUPABASE_SERVICE_ROLE_KEY` is only for server-side scripts such as seeding. Never expose it in client code.

## Supabase setup

1. Create a Supabase project and enable email/password auth.
2. Apply all migrations in `supabase/migrations` in timestamp order. The newest, `20260905090000_daily_life_hub.sql`, adds chores, rewards, routines, check-ins, memories, milestones, shared lists, recipes, weekly reviews, member colors, and row-level security that lets kids check off their own chores, routines and list items while only parents manage definitions.
3. Create a user in Supabase Auth and sign in from Settings. A workspace is bootstrapped automatically for a new user.
4. Optionally seed the sample family: `SEED_USER_ID=auth-user-uuid npm run seed:starter`.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run icons:pwa
```

Tests cover schemas, filtering, access control, calendar sync, PWA config, the natural-language quick-add parser, chore scheduling and streak math, and the daily brief builder.

## Security notes

- Not a password manager. Forms block obvious secrets (full card or account numbers, SSNs, passwords). Store last four digits and a `password_location` reference only.
- Privacy mode hides money, health, account, vehicle, and emergency details on shared screens.
- Supabase RLS scopes every table by family membership. Check-ins are visible to the author and, when shared, to the other parents. Kid profiles (role `viewer`) are blocked from finance, accounts, health, documents, contacts, communication, relationship and emergency areas by default.

## Deployment

Deploy to Vercel, Netlify or any Node host, add the three Supabase variables, apply migrations, and add the production URL to Supabase Auth redirect URLs. The build ships a web manifest, iOS metadata, maskable icons and a service worker with an offline fallback so it installs as a standalone app.

## Product name

The name is a single constant in `lib/constants.ts` (`APP_NAME`, `APP_TAGLINE`). Change it there and in `app/manifest.ts` if you want something else.
