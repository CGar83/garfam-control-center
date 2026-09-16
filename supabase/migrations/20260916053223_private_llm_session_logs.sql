begin;

alter table public.finance_assistant_conversations
  add column session_id uuid not null default gen_random_uuid();

create function public.llm_message_text(items jsonb) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg(coalesce(item->>'role','') || ': ' || coalesce(item->>'content',''), E'\n\n' order by n),'')
  from jsonb_array_elements(items) with ordinality as m(item,n);
$$;

create function public.llm_transcript(session uuid, model_name text, scope text, items jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare result text; item jsonb; n integer := 0;
begin
  result := '# Gather LLM Log' || E'\n\nSession: ' || session::text || E'\nModel: ' || model_name || E'\nScope: ' || scope ||
    E'\n\nPrivate conversation. Historical suggestions are not verified facts or proof of completed actions.\n';
  for item in select value from jsonb_array_elements(items) loop
    n := n + 1;
    result := result || E'\n## ' || n::text || '. ' || coalesce(item->>'role','message') ||
      case when item ? 'created_at' then ' (' || (item->>'created_at') || ')' else ' (legacy timestamp unavailable)' end ||
      E'\n\n> ' || replace(coalesce(item->>'content',''), E'\n', E'\n> ') || E'\n';
    if (item - 'content' - 'role') <> '{}'::jsonb then
      result := result || E'\n### Evidence and metadata\n\n    ' || replace(jsonb_pretty(item - 'content' - 'role'), E'\n', E'\n    ') || E'\n';
    end if;
  end loop;
  return result;
end $$;

create table public.llm_session_logs (
  id uuid primary key,
  family_id text not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null check (length(model) between 1 and 160),
  context_key text not null check (length(context_key) between 1 and 160),
  title text not null check (length(title) between 1 and 200),
  messages jsonb not null check (jsonb_typeof(messages)='array' and jsonb_array_length(messages) between 1 and 100 and octet_length(messages::text)<=8000000),
  message_count integer generated always as (jsonb_array_length(messages)) stored,
  transcript_md text not null,
  search_text text not null,
  search_vector tsvector generated always as (to_tsvector('english',left(title || E'\n' || memory_note || E'\n' || search_text,100000))) stored,
  memory_note text not null default '' check (length(memory_note)<=2000),
  reference_enabled boolean not null default true,
  revision integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
create index llm_logs_owner_updated on public.llm_session_logs(family_id,user_id,updated_at desc,id);
create index llm_logs_reference_scope on public.llm_session_logs(family_id,user_id,model,context_key,updated_at desc) where reference_enabled and ended_at is not null;
create index llm_logs_search on public.llm_session_logs using gin(search_vector);
alter table public.llm_session_logs enable row level security;
revoke all on public.llm_session_logs from public,anon,authenticated;
grant select,insert,update,delete on public.llm_session_logs to authenticated;
create policy llm_log_owner on public.llm_session_logs for all to authenticated
  using(user_id=(select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'))
  with check(user_id=(select auth.uid()) and public.user_family_role(family_id) in ('admin','parent'));

create function public.capture_llm_session() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP='UPDATE' and OLD.session_id <> NEW.session_id then
    update public.llm_session_logs set ended_at=now(),updated_at=now()
      where id=OLD.session_id and family_id=OLD.family_id and user_id=OLD.user_id;
  end if;
  if jsonb_array_length(NEW.messages)=0 then
    -- An explicit clear removes the active transcript. New session uses a new ID and keeps the archive.
    if TG_OP='UPDATE' and OLD.session_id=NEW.session_id then
      delete from public.llm_session_logs where id=OLD.session_id and family_id=OLD.family_id and user_id=OLD.user_id;
    end if;
    return NEW;
  end if;
  insert into public.llm_session_logs(id,family_id,user_id,model,context_key,title,messages,transcript_md,search_text,revision,created_at,updated_at)
  values(NEW.session_id,NEW.family_id,NEW.user_id,NEW.model,NEW.context_key,
    left(replace(coalesce(nullif(NEW.messages->0->>'content',''),'Conversation'),E'\n',' '),200),
    NEW.messages,public.llm_transcript(NEW.session_id,NEW.model,NEW.context_key,NEW.messages),public.llm_message_text(NEW.messages),NEW.revision,NEW.updated_at,NEW.updated_at)
  on conflict(id) do update set messages=excluded.messages,transcript_md=excluded.transcript_md,search_text=excluded.search_text,
    revision=excluded.revision,updated_at=excluded.updated_at
  where public.llm_session_logs.family_id=NEW.family_id and public.llm_session_logs.user_id=NEW.user_id;
  if not found then raise exception 'Session ownership conflict' using errcode='42501'; end if;
  return NEW;
end $$;
create trigger capture_llm_session after insert or update on public.finance_assistant_conversations
  for each row execute function public.capture_llm_session();

-- Backfill only conversations still present. Previously cleared history cannot be recovered.
insert into public.llm_session_logs(id,family_id,user_id,model,context_key,title,messages,transcript_md,search_text,revision,created_at,updated_at)
select session_id,family_id,user_id,model,context_key,left(replace(coalesce(nullif(messages->0->>'content',''),'Conversation'),E'\n',' '),200),
  messages,public.llm_transcript(session_id,model,context_key,messages),public.llm_message_text(messages),revision,updated_at,updated_at
from public.finance_assistant_conversations where jsonb_array_length(messages)>0;

create function public.start_llm_session(target_family text,target_model text,target_context text,expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family),'') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode='42501';
  end if;
  insert into public.finance_assistant_conversations(family_id,user_id,model,context_key)
    values(target_family,auth.uid(),target_model,target_context) on conflict do nothing;
  update public.finance_assistant_conversations set session_id=gen_random_uuid(),messages='[]',revision=revision+1
    where family_id=target_family and user_id=auth.uid() and model=target_model and context_key=target_context and revision=expected_revision
    returning revision into next_revision;
  if next_revision is null then raise exception 'Conversation changed' using errcode='40001'; end if;
  return next_revision;
end $$;

create function public.delete_llm_log(target_family text,target_log uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family),'') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode='42501';
  end if;
  -- Increment the current revision so in-flight replies cannot resurrect a deleted transcript.
  update public.finance_assistant_conversations set session_id=gen_random_uuid(),messages='[]',revision=revision+1
    where family_id=target_family and user_id=auth.uid() and session_id=target_log;
  delete from public.llm_session_logs where family_id=target_family and user_id=auth.uid() and id=target_log;
end $$;

create function public.find_llm_references(target_family text,target_model text,target_context text,question text)
returns table(id uuid,title text,excerpt text,updated_at timestamptz,matched boolean)
language sql stable security invoker set search_path = '' as $$
  with q as (select websearch_to_tsquery('english',left(question,500)) as terms)
  select l.id,l.title,
    left(case when length(l.memory_note)>0 then 'Owner reference note: ' || l.memory_note || E'\n' else '' end ||
      case when l.search_vector @@ q.terms then ts_headline('english',left(l.search_text,100000),q.terms,'MaxWords=140,MinWords=30,MaxFragments=2,StartSel=[,StopSel=]')
        else left(l.messages->0->>'content',400) || E'\nLatest reply: ' || left(l.messages->-1->>'content',1200) end,1800),
    l.updated_at, l.search_vector @@ q.terms
  from public.llm_session_logs l cross join q
  where l.family_id=target_family and l.user_id=auth.uid() and l.model=target_model and l.context_key=target_context
    and l.reference_enabled and l.ended_at is not null
  order by (l.search_vector @@ q.terms) desc,ts_rank(l.search_vector,q.terms) desc,l.updated_at desc,l.id
  limit 3;
$$;
revoke all on function public.llm_message_text(jsonb),public.llm_transcript(uuid,text,text,jsonb),public.capture_llm_session(),public.start_llm_session(text,text,text,integer),public.delete_llm_log(text,uuid),public.find_llm_references(text,text,text,text) from public,anon;
grant execute on function public.llm_message_text(jsonb),public.llm_transcript(uuid,text,text,jsonb),public.capture_llm_session(),public.start_llm_session(text,text,text,integer),public.delete_llm_log(text,uuid),public.find_llm_references(text,text,text,text) to authenticated;
commit;
