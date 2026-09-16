-- No personal financial values or provider keys belong in migrations.
-- Only the creator can bootstrap an empty workspace. Knowing a family ID must
-- never be sufficient to insert your own administrator membership.
alter table public.families add column created_by_user_id text;
alter table public.families alter column created_by_user_id set default auth.uid()::text;
update public.families f set created_by_user_id = (
  select m.user_id from public.family_members m
  where m.family_id = f.id and m.role = 'admin' and m.user_id is not null
  order by m.created_at, m.id limit 1
) where created_by_user_id is null;

create function public.can_bootstrap_family(target_family text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.families f
    where f.id = target_family and f.created_by_user_id = auth.uid()::text
      and not exists (select 1 from public.family_members m where m.family_id = f.id)
  )
$$;
revoke all on function public.can_bootstrap_family(text) from public;
grant execute on function public.can_bootstrap_family(text) to authenticated;
drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert to authenticated
  with check (created_by_user_id = (select auth.uid())::text);
drop policy if exists family_members_insert on public.family_members;
create policy family_members_insert on public.family_members for insert to authenticated
  with check (
    public.user_family_role(family_id) = 'admin'
    or (user_id = (select auth.uid())::text and role = 'admin' and public.can_bootstrap_family(family_id))
  );

create table public.recovery_plans (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  name text not null, monthly_income numeric not null check (monthly_income >= 0),
  housing numeric not null default 0 check (housing >= 0), debt_minimums numeric not null default 0 check (debt_minimums >= 0),
  utilities numeric not null default 0 check (utilities >= 0), groceries numeric not null default 0 check (groceries >= 0),
  transportation numeric not null default 0 check (transportation >= 0), health numeric not null default 0 check (health >= 0),
  subscription_cap numeric not null default 0 check (subscription_cap >= 0), lifestyle_cap numeric not null default 0 check (lifestyle_cap >= 0),
  reserve_contribution numeric not null default 0 check (reserve_contribution >= 0), reserve_target numeric not null default 0 check (reserve_target >= 0),
  reserve_saved numeric not null default 0 check (reserve_saved >= 0), score integer check (score between 300 and 850),
  score_model text, as_of_date date, start_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recovery_subscriptions (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  name text not null, amount numeric not null check (amount >= 0),
  frequency text not null check (frequency in ('monthly','annual','quarterly','weekly','biweekly')),
  decision text not null default 'review' check (decision in ('review','keep','cancel','pause')),
  status text not null default 'active' check (status in ('active','cancelled','paused')),
  renewal_date date, recommendation text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.financial_assets (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  name text not null, category text not null check (category in ('cash','property','vehicle','investment','other')),
  estimated_value numeric check (estimated_value >= 0), debt numeric check (debt >= 0), as_of_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.installment_debts (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  name text not null, balance numeric not null check (balance >= 0), monthly_payment numeric not null check (monthly_payment >= 0),
  apr numeric check (apr between 0 and 1), due_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.finance_actions (
  id text primary key, family_id text not null references public.families(id) on delete cascade,
  title text not null, phase text not null check (phase in ('today','this_week','this_month','next_90_days','ongoing')),
  status text not null check (status in ('not_started','in_progress','done')),
  priority text not null check (priority in ('low','medium','high','urgent')), due_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.credit_cards alter column apr drop not null;

create table public.finance_change_log (
  family_id text not null references public.families(id) on delete cascade,
  request_id uuid not null, actor_id uuid not null, entity_type text not null, entity_id text not null,
  before_record jsonb, after_record jsonb not null, created_at timestamptz not null default now(),
  primary key (family_id, request_id)
);

do $$
declare t text;
begin
  foreach t in array array['recovery_plans','recovery_subscriptions','financial_assets','installment_debts','finance_actions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create index %I on public.%I(family_id)', t || '_family_idx', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_access_section(family_id, ''finances''))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.user_family_role(family_id) in (''admin'', ''parent''))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.user_family_role(family_id) in (''admin'', ''parent'')) with check (public.user_family_role(family_id) in (''admin'', ''parent''))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.user_family_role(family_id) in (''admin'', ''parent''))', t || '_delete', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.finance_change_log enable row level security;
grant select, insert on public.finance_change_log to authenticated;
create policy finance_change_log_select on public.finance_change_log for select to authenticated
  using (public.user_family_role(family_id) in ('admin','parent'));
create policy finance_change_log_insert on public.finance_change_log for insert to authenticated
  with check (actor_id = (select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'));

-- The write and its receipt commit together. Retries return the first result;
-- updates to records edited since review are rejected instead of overwritten.
create function public.apply_finance_change(
  target_family text, request_id uuid, target_table text, target_id text,
  operation text, expected_updated_at timestamptz, payload jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  old_record jsonb; result jsonb; column_names text; selected_names text; assignments text; key text;
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family), '') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode = '42501';
  end if;
  if target_table not in ('recovery_plans','recovery_subscriptions','financial_assets','installment_debts','finance_actions','credit_cards','bills','budget_categories')
    or operation not in ('create','update') or jsonb_typeof(payload) <> 'object' or length(payload::text) > 20000 then
    raise exception 'Unsupported change';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_family || request_id::text, 0));
  select l.after_record into result from public.finance_change_log l
    where l.family_id = target_family and l.request_id = apply_finance_change.request_id;
  if found then return result; end if;
  for key in select jsonb_object_keys(payload) loop
    if key in ('id','family_id','created_at','updated_at','created_by') or not exists (
      select 1 from information_schema.columns where table_schema = 'public' and table_name = target_table and column_name = key
    ) then raise exception 'Unsupported field'; end if;
  end loop;
  if payload = '{}'::jsonb then raise exception 'Empty change'; end if;
  if operation = 'update' then
    execute format('select to_jsonb(t) from public.%I t where id = $1 and family_id = $2 for update', target_table)
      into old_record using target_id, target_family;
    if old_record is null then raise exception 'Record not found' using errcode = 'P0002'; end if;
    if expected_updated_at is null or (old_record->>'updated_at')::timestamptz <> expected_updated_at then
      raise exception 'Record changed since review. Ask for a fresh proposal.' using errcode = '40001';
    end if;
    select string_agg(format('%I = p.%I', k, k), ',') into assignments from jsonb_object_keys(payload) k;
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) p where t.id = $2 and t.family_id = $3 returning to_jsonb(t)', target_table, assignments, target_table)
      into result using payload, target_id, target_family;
  else
    payload := payload || jsonb_build_object('id',target_id,'family_id',target_family);
    select string_agg(format('%I', k), ','), string_agg(format('p.%I', k), ',') into column_names, selected_names from jsonb_object_keys(payload) k;
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) p returning to_jsonb(%I)', target_table, column_names, selected_names, target_table, target_table)
      into result using payload;
  end if;
  insert into public.finance_change_log(family_id,request_id,actor_id,entity_type,entity_id,before_record,after_record)
    values(target_family,request_id,auth.uid(),target_table,target_id,old_record,result);
  return result;
end $$;
revoke all on function public.apply_finance_change(text,uuid,text,text,text,timestamptz,jsonb) from public;
grant execute on function public.apply_finance_change(text,uuid,text,text,text,timestamptz,jsonb) to authenticated;

create table public.finance_assistant_limits (
  user_id uuid primary key, window_start timestamptz not null, requests integer not null
);
alter table public.finance_assistant_limits enable row level security;
-- A narrowly scoped function is required so clients cannot reset their own quota.
create function public.claim_finance_assistant_request(target_family text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family), '') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode = '42501';
  end if;
  insert into public.finance_assistant_limits(user_id,window_start,requests)
    values(auth.uid(),now(),1)
    on conflict (user_id) do update set
      window_start = case when finance_assistant_limits.window_start < now() - interval '10 minutes' then now() else finance_assistant_limits.window_start end,
      requests = case when finance_assistant_limits.window_start < now() - interval '10 minutes' then 1 else finance_assistant_limits.requests + 1 end
    returning requests <= 10 into allowed;
  return allowed;
end $$;
revoke all on function public.claim_finance_assistant_request(text) from public;
grant execute on function public.claim_finance_assistant_request(text) to authenticated;
