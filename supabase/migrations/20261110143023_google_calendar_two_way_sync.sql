begin;
create table public.google_calendar_links (
  id uuid primary key default gen_random_uuid(),
  family_id text not null unique references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  calendar_id text,
  calendar_name text,
  time_zone text not null default 'UTC',
  status text not null default 'choose_calendar' check (status in ('choose_calendar','ready','paused','error','reconnect')),
  sync_from timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  error_code text,
  phase text not null default 'pull' check (phase in ('pull','push')),
  scan_min text,
  scan_max text,
  page_token text,
  pending jsonb not null default '[]'::jsonb,
  next_page_token text,
  push_after text not null default '',
  skipped_repeats integer not null default 0,
  lock_id uuid,
  lock_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.google_calendar_event_maps (
  link_id uuid not null references public.google_calendar_links(id) on delete cascade,
  google_id text not null,
  local_id text not null,
  baseline jsonb,
  conflict boolean not null default false,
  conflict_remote jsonb,
  read_only boolean not null default false,
  error_code text,
  primary key(link_id,google_id),
  unique(link_id,local_id)
);
create table public.google_calendar_oauth_states (
  state_hash text primary key,
  cookie_hash text not null,
  family_id text not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_verifier text not null,
  expires_at timestamptz not null
);
alter table public.google_calendar_links enable row level security;
alter table public.google_calendar_event_maps enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
revoke all on public.google_calendar_links, public.google_calendar_event_maps, public.google_calendar_oauth_states from public, anon, authenticated;
grant all on public.google_calendar_links, public.google_calendar_event_maps, public.google_calendar_oauth_states to service_role;

create function public.claim_google_calendar_sync(target uuid, lease uuid) returns setof public.google_calendar_links
language sql security invoker set search_path='' as $$
  update public.google_calendar_links set lock_id=lease,lock_until=clock_timestamp()+interval '90 seconds',last_attempt_at=clock_timestamp()
    where id=target and status in ('ready','error') and calendar_id is not null and (lock_until is null or lock_until<clock_timestamp())
    returning *;
$$;
create function public.consume_google_calendar_state(state_digest text,cookie_digest text)
returns setof public.google_calendar_oauth_states language sql security invoker set search_path='' as $$
  delete from public.google_calendar_oauth_states where state_hash=state_digest and cookie_hash=cookie_digest and expires_at>clock_timestamp() returning *;
$$;
revoke all on function public.claim_google_calendar_sync(uuid,uuid),public.consume_google_calendar_state(text,text) from public,anon,authenticated;
grant execute on function public.claim_google_calendar_sync(uuid,uuid),public.consume_google_calendar_state(text,text) to service_role;
create index google_calendar_due on public.google_calendar_links(last_attempt_at nulls first) where status in ('ready','error');
create index google_calendar_states_expiry on public.google_calendar_oauth_states(expires_at);
commit;
