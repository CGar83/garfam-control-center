begin;
-- Supabase may grant anon directly through project default privileges.
revoke all on function public.save_workspace_conversation(text,text,text,integer,jsonb) from anon;
revoke all on function public.save_finance_conversation(text,text,integer,jsonb) from anon;
commit;
