-- Daily-life hub: chores, rewards, routines, check-ins, memories, milestones, shared lists, recipes, weekly reviews.

alter table public.family_members
  add column if not exists color text check (color is null or color in ('coral', 'ocean', 'sunshine', 'meadow', 'lavender', 'sky', 'peach', 'rose'));

alter table public.meal_plans
  add column if not exists recipe_id text,
  add column if not exists cook_id text references public.family_members(id) on delete set null;

create table if not exists public.chores (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  emoji text,
  assigned_to text references public.family_members(id) on delete set null,
  points integer not null default 5 check (points >= 0),
  frequency text not null check (frequency in ('daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  days_of_week integer[] not null default '{}',
  time_of_day text not null default 'anytime' check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  active boolean not null default true,
  notes text,
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chore_completions (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  chore_id text not null references public.chores(id) on delete cascade,
  member_id text references public.family_members(id) on delete set null,
  completed_on date not null,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  approved_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  emoji text,
  cost_points integer not null check (cost_points >= 1),
  description text,
  available boolean not null default true,
  for_member_id text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_claims (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  reward_id text not null references public.rewards(id) on delete cascade,
  member_id text not null references public.family_members(id) on delete cascade,
  points_spent integer not null default 0 check (points_spent >= 0),
  claimed_on date not null,
  fulfilled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  emoji text,
  member_id text references public.family_members(id) on delete set null,
  time_of_day text not null default 'morning' check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  steps text[] not null default '{}',
  days_of_week integer[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_completions (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  routine_id text not null references public.routines(id) on delete cascade,
  member_id text references public.family_members(id) on delete set null,
  completed_on date not null,
  steps_done integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  member_id text references public.family_members(id) on delete set null,
  checkin_date date not null,
  mood integer not null check (mood between 1 and 5),
  energy integer not null check (energy between 1 and 5),
  gratitude text,
  needs text,
  note text,
  shared_with_partner boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  entry_date date not null,
  title text not null,
  body text,
  author_id text references public.family_members(id) on delete set null,
  people text[] not null default '{}',
  tags text[] not null default '{}',
  mood text,
  highlight boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('birthday', 'anniversary', 'trip', 'holiday', 'school', 'custom')),
  date date not null,
  emoji text,
  member_id text references public.family_members(id) on delete set null,
  recurring_yearly boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_lists (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('todo', 'shopping', 'packing', 'wishlist', 'project', 'custom')),
  emoji text,
  description text,
  archived boolean not null default false,
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  list_id text not null references public.shared_lists(id) on delete cascade,
  name text not null,
  checked boolean not null default false,
  quantity text,
  note text,
  assigned_to text references public.family_members(id) on delete set null,
  sort_order integer not null default 0,
  added_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  emoji text,
  cuisine text,
  meal_type text not null default 'Dinner',
  prep_minutes integer check (prep_minutes is null or prep_minutes >= 0),
  cook_minutes integer check (cook_minutes is null or cook_minutes >= 0),
  servings integer check (servings is null or servings >= 1),
  ingredients text,
  instructions text,
  source_url text,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  kid_approved boolean not null default false,
  last_cooked_on date,
  rating integer check (rating is null or rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_reviews (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  week_start date not null,
  completed_steps text[] not null default '{}',
  wins text,
  focus text,
  worries text,
  date_night_plan text,
  completed_at timestamptz,
  reviewed_by text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'chores',
    'chore_completions',
    'rewards',
    'reward_claims',
    'routines',
    'routine_completions',
    'checkins',
    'journal_entries',
    'milestones',
    'shared_lists',
    'list_items',
    'recipes',
    'weekly_reviews'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Parent-managed definitions: everyone in the family can read, admins/parents write.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['chores', 'rewards', 'routines', 'milestones', 'shared_lists', 'recipes']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', table_name);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.can_access_family(family_id))', table_name);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', table_name);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.user_family_role(family_id) in (''admin'', ''parent''))', table_name);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', table_name);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.user_family_role(family_id) in (''admin'', ''parent'')) with check (public.can_access_family(family_id))', table_name);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', table_name);
    execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.user_family_role(family_id) in (''admin'', ''parent''))', table_name);
  end loop;
end $$;

-- Completions and claims: kids can log their own, parents can manage everything.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['chore_completions', 'routine_completions', 'reward_claims']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', table_name);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.can_access_family(family_id))', table_name);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', table_name);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.user_family_role(family_id) in (''admin'', ''parent'') or member_id = public.current_member_id(family_id))', table_name);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', table_name);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.user_family_role(family_id) in (''admin'', ''parent'') or member_id = public.current_member_id(family_id)) with check (public.can_access_family(family_id))', table_name);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', table_name);
    execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.user_family_role(family_id) in (''admin'', ''parent'') or member_id = public.current_member_id(family_id))', table_name);
  end loop;
end $$;

-- Check-ins are adult-to-adult: parents see shared ones, each person sees their own.
drop policy if exists "checkins_select" on public.checkins;
create policy "checkins_select" on public.checkins for select using (
  member_id = public.current_member_id(family_id)
  or (shared_with_partner and public.user_family_role(family_id) in ('admin', 'parent'))
);
drop policy if exists "checkins_insert" on public.checkins;
create policy "checkins_insert" on public.checkins for insert with check (
  public.user_family_role(family_id) in ('admin', 'parent') and member_id = public.current_member_id(family_id)
);
drop policy if exists "checkins_update" on public.checkins;
create policy "checkins_update" on public.checkins for update using (member_id = public.current_member_id(family_id)) with check (public.can_access_family(family_id));
drop policy if exists "checkins_delete" on public.checkins;
create policy "checkins_delete" on public.checkins for delete using (member_id = public.current_member_id(family_id) or public.user_family_role(family_id) = 'admin');

-- Journal: anyone in the family can write a memory; authors and parents can edit.
drop policy if exists "journal_entries_select" on public.journal_entries;
create policy "journal_entries_select" on public.journal_entries for select using (public.can_access_family(family_id));
drop policy if exists "journal_entries_insert" on public.journal_entries;
create policy "journal_entries_insert" on public.journal_entries for insert with check (public.can_access_family(family_id));
drop policy if exists "journal_entries_update" on public.journal_entries;
create policy "journal_entries_update" on public.journal_entries for update using (
  public.user_family_role(family_id) in ('admin', 'parent') or author_id = public.current_member_id(family_id)
) with check (public.can_access_family(family_id));
drop policy if exists "journal_entries_delete" on public.journal_entries;
create policy "journal_entries_delete" on public.journal_entries for delete using (
  public.user_family_role(family_id) in ('admin', 'parent') or author_id = public.current_member_id(family_id)
);

-- List items: everyone can add and check items; parents or the person who added can delete.
drop policy if exists "list_items_select" on public.list_items;
create policy "list_items_select" on public.list_items for select using (public.can_access_family(family_id));
drop policy if exists "list_items_insert" on public.list_items;
create policy "list_items_insert" on public.list_items for insert with check (public.can_access_family(family_id));
drop policy if exists "list_items_update" on public.list_items;
create policy "list_items_update" on public.list_items for update using (public.can_access_family(family_id)) with check (public.can_access_family(family_id));
drop policy if exists "list_items_delete" on public.list_items;
create policy "list_items_delete" on public.list_items for delete using (
  public.user_family_role(family_id) in ('admin', 'parent') or added_by = public.current_member_id(family_id)
);

-- Weekly reviews are a parent ritual.
drop policy if exists "weekly_reviews_select" on public.weekly_reviews;
create policy "weekly_reviews_select" on public.weekly_reviews for select using (public.user_family_role(family_id) in ('admin', 'parent'));
drop policy if exists "weekly_reviews_insert" on public.weekly_reviews;
create policy "weekly_reviews_insert" on public.weekly_reviews for insert with check (public.user_family_role(family_id) in ('admin', 'parent'));
drop policy if exists "weekly_reviews_update" on public.weekly_reviews;
create policy "weekly_reviews_update" on public.weekly_reviews for update using (public.user_family_role(family_id) in ('admin', 'parent')) with check (public.can_access_family(family_id));
drop policy if exists "weekly_reviews_delete" on public.weekly_reviews;
create policy "weekly_reviews_delete" on public.weekly_reviews for delete using (public.user_family_role(family_id) in ('admin', 'parent'));

create index if not exists chores_family_idx on public.chores(family_id, assigned_to);
create index if not exists chore_completions_family_date_idx on public.chore_completions(family_id, completed_on);
create index if not exists chore_completions_chore_idx on public.chore_completions(chore_id, completed_on);
create index if not exists rewards_family_idx on public.rewards(family_id);
create index if not exists reward_claims_family_member_idx on public.reward_claims(family_id, member_id);
create index if not exists routines_family_idx on public.routines(family_id, member_id);
create index if not exists routine_completions_family_date_idx on public.routine_completions(family_id, completed_on);
create index if not exists checkins_family_date_idx on public.checkins(family_id, checkin_date);
create index if not exists journal_entries_family_date_idx on public.journal_entries(family_id, entry_date);
create index if not exists milestones_family_date_idx on public.milestones(family_id, date);
create index if not exists shared_lists_family_idx on public.shared_lists(family_id);
create index if not exists list_items_list_idx on public.list_items(list_id, sort_order);
create index if not exists recipes_family_idx on public.recipes(family_id);
create index if not exists weekly_reviews_family_week_idx on public.weekly_reviews(family_id, week_start);
