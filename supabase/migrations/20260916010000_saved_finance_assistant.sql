begin;

create table public.finance_assistant_connections (
  family_id text not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null check (length(model) between 1 and 160),
  encrypted_api_key text check (encrypted_api_key is null or (encrypted_api_key like 'v1.%' and length(encrypted_api_key) <= 4096)),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.finance_assistant_conversations (
  family_id text not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null check (length(model) between 1 and 160),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 100 and octet_length(messages::text) <= 2000000),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id, model)
);

alter table public.finance_assistant_connections enable row level security;
alter table public.finance_assistant_conversations enable row level security;
revoke all on public.finance_assistant_connections, public.finance_assistant_conversations from public, anon, authenticated;
grant select, insert, update, delete on public.finance_assistant_connections, public.finance_assistant_conversations to authenticated;

-- A family admin cannot read another parent's key or conversation.
create policy assistant_connection_owner on public.finance_assistant_connections for all to authenticated
  using (user_id = (select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'))
  with check (user_id = (select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'));
create policy assistant_conversation_owner on public.finance_assistant_conversations for all to authenticated
  using (user_id = (select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'))
  with check (user_id = (select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'));

create trigger assistant_connection_updated before update on public.finance_assistant_connections
  for each row execute function public.set_updated_at();
create trigger assistant_conversation_updated before update on public.finance_assistant_conversations
  for each row execute function public.set_updated_at();

create function public.save_finance_conversation(target_family text, target_model text, expected_revision integer, new_messages jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family), '') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode = '42501';
  end if;
  insert into public.finance_assistant_conversations(family_id,user_id,model)
    values(target_family,auth.uid(),target_model) on conflict do nothing;
  update public.finance_assistant_conversations set messages = new_messages, revision = revision + 1
    where family_id = target_family and user_id = auth.uid() and model = target_model and revision = expected_revision
    returning revision into next_revision;
  if next_revision is null then
    raise exception 'Conversation changed' using errcode = '40001';
  end if;
  return next_revision;
end $$;
revoke all on function public.save_finance_conversation(text,text,integer,jsonb) from public;
grant execute on function public.save_finance_conversation(text,text,integer,jsonb) to authenticated;

commit;
