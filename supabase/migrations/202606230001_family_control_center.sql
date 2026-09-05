create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.families (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  user_id text,
  display_name text not null,
  role text not null check (role in ('admin', 'parent', 'viewer')),
  avatar_url text,
  phone text,
  email text,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  recurrence_rule text,
  assigned_to text references public.family_members(id) on delete set null,
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('not_started', 'in_progress', 'waiting', 'done')),
  assigned_to text references public.family_members(id) on delete set null,
  due_at timestamptz,
  repeat_rule text,
  completed_at timestamptz,
  created_by text references public.family_members(id) on delete set null,
  tags text[] default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grocery_items (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  name text not null,
  category text not null,
  quantity text,
  unit text,
  store text,
  needed_by date,
  checked boolean not null default false,
  added_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_plans (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  meal_date date not null,
  meal_type text not null,
  title text not null,
  recipe_url text,
  ingredients text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_accounts (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  institution_name text not null,
  account_type text not null,
  owner_name text,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  website_url text,
  support_phone text,
  renewal_date date,
  password_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_settings (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  budget_year integer not null check (budget_year between 2000 and 2100),
  budget_month date not null,
  starting_cash_available numeric(12, 2) not null default 0 check (starting_cash_available >= 0),
  planned_monthly_income numeric(12, 2) not null default 0 check (planned_monthly_income >= 0),
  include_prior_category_balances boolean not null default true,
  payoff_strategy text not null check (payoff_strategy in ('avalanche', 'snowball')),
  target_utilization numeric(5, 4) not null default 0.3 check (target_utilization between 0 and 1),
  excellent_utilization numeric(5, 4) not null default 0.1 check (excellent_utilization between 0 and 1),
  high_utilization_alert numeric(5, 4) not null default 0.5 check (high_utilization_alert between 0 and 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  budget_month date not null,
  group_name text not null,
  category text not null,
  need_want_goal text not null check (need_want_goal in ('need', 'want', 'goal')),
  monthly_plan numeric(12, 2) not null default 0 check (monthly_plan >= 0),
  rollover boolean not null default false,
  prior_balance numeric(12, 2) not null default 0 check (prior_balance >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  transaction_date date not null,
  account_name text not null,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'transfer', 'credit_payment')),
  category text not null,
  description text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  cleared boolean not null default true,
  recurring boolean not null default false,
  owner_name text,
  notes text,
  tags text[] default '{}',
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  card_name text not null,
  issuer text,
  owner_name text,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  current_balance numeric(12, 2) not null default 0 check (current_balance >= 0),
  credit_limit numeric(12, 2) not null default 0 check (credit_limit >= 0),
  apr numeric(6, 5) not null default 0 check (apr between 0 and 1),
  minimum_payment numeric(12, 2) not null default 0 check (minimum_payment >= 0),
  extra_payment numeric(12, 2) not null default 0 check (extra_payment >= 0),
  statement_day integer check (statement_day between 1 and 31),
  due_day integer check (due_day between 1 and 31),
  due_date date,
  autopay boolean not null default false,
  payment_account text,
  password_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sinking_funds (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  goal text not null,
  category text not null,
  target_amount numeric(12, 2) not null default 0 check (target_amount >= 0),
  target_date date,
  saved_so_far numeric(12, 2) not null default 0 check (saved_so_far >= 0),
  planned_monthly numeric(12, 2) not null default 0 check (planned_monthly >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  name text not null,
  category text not null,
  amount numeric(12, 2) not null default 0,
  due_day integer check (due_day between 1 and 31),
  due_date date,
  autopay boolean not null default false,
  payment_account text,
  status text not null check (status in ('upcoming', 'paid', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_records (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  person_id text references public.family_members(id) on delete set null,
  record_type text not null,
  provider_name text,
  provider_phone text,
  policy_provider text,
  policy_last_four text check (policy_last_four is null or policy_last_four ~ '^[0-9]{4}$'),
  medication_name text,
  dosage text,
  allergy text,
  condition text,
  appointment_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_records (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  child_id text references public.family_members(id) on delete set null,
  school_name text not null,
  grade text,
  teacher_name text,
  teacher_email text,
  school_phone text,
  pickup_notes text,
  activities text,
  important_dates text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_records (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  category text not null,
  title text not null,
  vendor_name text,
  vendor_phone text,
  warranty_expiration date,
  maintenance_due date,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_records (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  vehicle_name text not null,
  vin_last_six text check (vin_last_six is null or vin_last_six ~ '^[A-Za-z0-9]{6}$'),
  plate text,
  insurance_provider text,
  policy_last_four text check (policy_last_four is null or policy_last_four ~ '^[0-9]{4}$'),
  registration_due date,
  maintenance_due date,
  mileage integer check (mileage is null or mileage >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  category text not null,
  file_url text,
  storage_location text,
  renewal_date date,
  owner text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  name text not null,
  relationship text,
  category text not null,
  phone text,
  email text,
  address text,
  notes text,
  emergency_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_notes (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null,
  importance text not null check (importance in ('low', 'medium', 'high', 'urgent')),
  related_date date,
  visible_to text references public.family_members(id) on delete set null,
  acknowledged_by text[] default '{}',
  created_by text references public.family_members(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_records (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  category text not null,
  practice text,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('not_started', 'in_progress', 'waiting', 'done')),
  assigned_to text references public.family_members(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  connection_score integer check (connection_score is null or connection_score between 0 and 10),
  partner_a_state text,
  partner_b_state text,
  positive_interactions integer check (positive_interactions is null or positive_interactions >= 0),
  negative_interactions integer check (negative_interactions is null or negative_interactions >= 0),
  cycle_name text,
  repair_attempt text,
  next_step text,
  notes text,
  tags text[] default '{}',
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_ideas (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  category text not null,
  audience text not null check (audience in ('son', 'daughter', 'all_kids', 'date_night', 'family')),
  description text,
  location text,
  estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  season text,
  indoor boolean not null default false,
  supplies text,
  status text not null check (status in ('idea', 'planned', 'done')),
  scheduled_event_id text references public.events(id) on delete set null,
  assigned_to text references public.family_members(id) on delete set null,
  notes text,
  created_by text references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_connections (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  provider text not null check (provider in ('google', 'apple', 'outlook', 'ics', 'other')),
  calendar_name text not null,
  sync_direction text not null check (sync_direction in ('export', 'import', 'two_way')),
  sync_status text not null check (sync_status in ('setup_required', 'active', 'paused', 'error')),
  feed_url text,
  external_calendar_id text,
  include_events boolean not null default true,
  include_tasks boolean not null default false,
  include_bills boolean not null default false,
  include_appointments boolean not null default false,
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_plan_items (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  category text not null,
  title text not null,
  details text,
  location text,
  contact_name text,
  contact_phone text,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_goals (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  title text not null,
  category text not null,
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null check (status in ('not_started', 'in_progress', 'complete', 'paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  kind text not null check (kind in ('due_soon', 'overdue', 'communication_note', 'assigned_task', 'upcoming_event', 'upcoming_bill', 'upcoming_appointment')),
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  actor_id text references public.family_members(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  created_at timestamptz not null default now()
);

create or replace function public.user_family_role(target_family_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select fm.role
  from public.family_members fm
  where fm.family_id = target_family_id
    and fm.user_id = auth.uid()::text
  limit 1
$$;

create or replace function public.can_access_family(target_family_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()::text
  )
$$;

create or replace function public.current_member_id(target_family_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select fm.id
  from public.family_members fm
  where fm.family_id = target_family_id
    and fm.user_id = auth.uid()::text
  limit 1
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'families',
    'family_members',
    'events',
    'tasks',
    'grocery_items',
    'meal_plans',
    'financial_accounts',
    'budget_settings',
    'budget_categories',
    'financial_transactions',
    'credit_cards',
    'sinking_funds',
    'bills',
    'health_records',
    'school_records',
    'home_records',
    'vehicle_records',
    'documents',
    'contacts',
    'communication_notes',
    'relationship_records',
    'activity_ideas',
    'calendar_connections',
    'emergency_plan_items',
    'family_goals',
    'notifications'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.grocery_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.budget_settings enable row level security;
alter table public.budget_categories enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.credit_cards enable row level security;
alter table public.sinking_funds enable row level security;
alter table public.bills enable row level security;
alter table public.health_records enable row level security;
alter table public.school_records enable row level security;
alter table public.home_records enable row level security;
alter table public.vehicle_records enable row level security;
alter table public.documents enable row level security;
alter table public.contacts enable row level security;
alter table public.communication_notes enable row level security;
alter table public.relationship_records enable row level security;
alter table public.activity_ideas enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.emergency_plan_items enable row level security;
alter table public.family_goals enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families for select using (public.can_access_family(id));
drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families for insert with check (auth.role() = 'authenticated');
drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families for update using (public.user_family_role(id) = 'admin') with check (public.user_family_role(id) = 'admin');
drop policy if exists "families_delete" on public.families;
create policy "families_delete" on public.families for delete using (public.user_family_role(id) = 'admin');

drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select" on public.family_members for select using (public.can_access_family(family_id));
drop policy if exists "family_members_insert" on public.family_members;
create policy "family_members_insert" on public.family_members for insert with check (
  user_id = auth.uid()::text
  or public.user_family_role(family_id) = 'admin'
);
drop policy if exists "family_members_update" on public.family_members;
create policy "family_members_update" on public.family_members for update using (public.user_family_role(family_id) = 'admin') with check (public.user_family_role(family_id) = 'admin');
drop policy if exists "family_members_delete" on public.family_members;
create policy "family_members_delete" on public.family_members for delete using (public.user_family_role(family_id) = 'admin');

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select using (public.can_access_family(family_id));
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert with check (public.user_family_role(family_id) in ('admin', 'parent'));
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update using (
  public.user_family_role(family_id) in ('admin', 'parent')
  or assigned_to = public.current_member_id(family_id)
) with check (public.can_access_family(family_id));
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete using (public.user_family_role(family_id) in ('admin', 'parent'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'events',
    'grocery_items',
    'meal_plans',
    'financial_accounts',
    'budget_settings',
    'budget_categories',
    'financial_transactions',
    'credit_cards',
    'sinking_funds',
    'bills',
    'health_records',
    'school_records',
    'home_records',
    'vehicle_records',
    'documents',
    'contacts',
    'communication_notes',
    'relationship_records',
    'activity_ideas',
    'calendar_connections',
    'emergency_plan_items',
    'family_goals',
    'notifications'
  ]
  loop
    execute format('drop policy if exists "%s_select" on public.%I', table_name, table_name);
    execute format('create policy "%s_select" on public.%I for select using (public.can_access_family(family_id))', table_name, table_name);
    execute format('drop policy if exists "%s_insert" on public.%I', table_name, table_name);
    execute format('create policy "%s_insert" on public.%I for insert with check (public.user_family_role(family_id) in (''admin'', ''parent''))', table_name, table_name);
    execute format('drop policy if exists "%s_update" on public.%I', table_name, table_name);
    execute format('create policy "%s_update" on public.%I for update using (public.user_family_role(family_id) in (''admin'', ''parent'')) with check (public.user_family_role(family_id) in (''admin'', ''parent''))', table_name, table_name);
    execute format('drop policy if exists "%s_delete" on public.%I', table_name, table_name);
    execute format('create policy "%s_delete" on public.%I for delete using (public.user_family_role(family_id) in (''admin'', ''parent''))', table_name, table_name);
  end loop;
end $$;

drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log for select using (public.can_access_family(family_id));
drop policy if exists "activity_log_insert" on public.activity_log;
create policy "activity_log_insert" on public.activity_log for insert with check (public.can_access_family(family_id));

create index if not exists family_members_family_id_idx on public.family_members(family_id);
create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists events_family_start_idx on public.events(family_id, start_at);
create index if not exists tasks_family_due_idx on public.tasks(family_id, due_at);
create index if not exists budget_settings_family_month_idx on public.budget_settings(family_id, budget_month);
create index if not exists budget_categories_family_month_idx on public.budget_categories(family_id, budget_month, category);
create index if not exists financial_transactions_family_date_idx on public.financial_transactions(family_id, transaction_date);
create index if not exists credit_cards_family_due_idx on public.credit_cards(family_id, due_date);
create index if not exists sinking_funds_family_target_idx on public.sinking_funds(family_id, target_date);
create index if not exists bills_family_due_idx on public.bills(family_id, due_date);
create index if not exists health_family_appointment_idx on public.health_records(family_id, appointment_date);
create index if not exists activity_ideas_family_audience_idx on public.activity_ideas(family_id, audience);
create index if not exists calendar_connections_family_provider_idx on public.calendar_connections(family_id, provider);

insert into storage.buckets (id, name, public)
values ('family-documents', 'family-documents', false)
on conflict (id) do nothing;

drop policy if exists "family_documents_select" on storage.objects;
create policy "family_documents_select" on storage.objects for select using (
  bucket_id = 'family-documents'
  and public.can_access_family(split_part(name, '/', 1))
);

drop policy if exists "family_documents_insert" on storage.objects;
create policy "family_documents_insert" on storage.objects for insert with check (
  bucket_id = 'family-documents'
  and public.user_family_role(split_part(name, '/', 1)) in ('admin', 'parent')
);

drop policy if exists "family_documents_update" on storage.objects;
create policy "family_documents_update" on storage.objects for update using (
  bucket_id = 'family-documents'
  and public.user_family_role(split_part(name, '/', 1)) in ('admin', 'parent')
);

drop policy if exists "family_documents_delete" on storage.objects;
create policy "family_documents_delete" on storage.objects for delete using (
  bucket_id = 'family-documents'
  and public.user_family_role(split_part(name, '/', 1)) in ('admin', 'parent')
);
