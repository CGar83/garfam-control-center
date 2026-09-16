begin;
alter table public.finance_assistant_conversations add column context_key text not null default 'finance' check (length(context_key) between 1 and 160);
alter table public.finance_assistant_conversations drop constraint finance_assistant_conversations_pkey;
alter table public.finance_assistant_conversations add primary key (family_id,user_id,model,context_key);
alter table public.finance_assistant_conversations drop constraint finance_assistant_conversations_messages_check;
alter table public.finance_assistant_conversations add constraint finance_assistant_conversations_messages_check
  check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 100 and octet_length(messages::text) <= 8000000);

create function public.save_workspace_conversation(target_family text,target_model text,target_context text,expected_revision integer,new_messages jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or coalesce(public.user_family_role(target_family),'') not in ('admin','parent') then
    raise exception 'Parent access required' using errcode = '42501';
  end if;
  insert into public.finance_assistant_conversations(family_id,user_id,model,context_key)
    values(target_family,auth.uid(),target_model,target_context) on conflict do nothing;
  update public.finance_assistant_conversations set messages=new_messages,revision=revision+1
    where family_id=target_family and user_id=auth.uid() and model=target_model and context_key=target_context and revision=expected_revision
    returning revision into next_revision;
  if next_revision is null then raise exception 'Conversation changed' using errcode = '40001'; end if;
  return next_revision;
end $$;
revoke all on function public.save_workspace_conversation(text,text,text,integer,jsonb) from public;
grant execute on function public.save_workspace_conversation(text,text,text,integer,jsonb) to authenticated;

-- Old clients keep their finance conversation and cannot update other scopes.
create or replace function public.save_finance_conversation(target_family text,target_model text,expected_revision integer,new_messages jsonb)
returns integer language sql security invoker set search_path = '' as $$
  select public.save_workspace_conversation(target_family,target_model,'finance',expected_revision,new_messages);
$$;
commit;
