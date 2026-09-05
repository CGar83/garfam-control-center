alter table public.family_members
  add column if not exists birthdate date,
  add column if not exists age_label text,
  add column if not exists blocked_sections text[] not null default '{}';

update public.family_members
set blocked_sections = '{}'
where blocked_sections is null;

create or replace function public.can_access_section(target_family_id text, section_name text)
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
      and (
        fm.role in ('admin', 'parent')
        or not (section_name = any(coalesce(fm.blocked_sections, '{}')))
      )
  )
$$;

revoke all on function public.can_access_section(text, text) from public;
grant execute on function public.can_access_section(text, text) to authenticated;

drop policy if exists "financial_accounts_select" on public.financial_accounts;
create policy "financial_accounts_select" on public.financial_accounts
  for select using (
    public.can_access_section(family_id, 'finances')
    or public.can_access_section(family_id, 'accounts')
  );

drop policy if exists "budget_settings_select" on public.budget_settings;
create policy "budget_settings_select" on public.budget_settings
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "budget_categories_select" on public.budget_categories;
create policy "budget_categories_select" on public.budget_categories
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "financial_transactions_select" on public.financial_transactions;
create policy "financial_transactions_select" on public.financial_transactions
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "credit_cards_select" on public.credit_cards;
create policy "credit_cards_select" on public.credit_cards
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "sinking_funds_select" on public.sinking_funds;
create policy "sinking_funds_select" on public.sinking_funds
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "bills_select" on public.bills;
create policy "bills_select" on public.bills
  for select using (public.can_access_section(family_id, 'finances'));

drop policy if exists "health_records_select" on public.health_records;
create policy "health_records_select" on public.health_records
  for select using (public.can_access_section(family_id, 'health'));

drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (public.can_access_section(family_id, 'documents'));

drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts
  for select using (public.can_access_section(family_id, 'contacts'));

drop policy if exists "communication_notes_select" on public.communication_notes;
create policy "communication_notes_select" on public.communication_notes
  for select using (public.can_access_section(family_id, 'communication'));

drop policy if exists "relationship_records_select" on public.relationship_records;
create policy "relationship_records_select" on public.relationship_records
  for select using (public.can_access_section(family_id, 'relationship'));

drop policy if exists "emergency_plan_items_select" on public.emergency_plan_items;
create policy "emergency_plan_items_select" on public.emergency_plan_items
  for select using (public.can_access_section(family_id, 'emergency'));

drop policy if exists "calendar_connections_select" on public.calendar_connections;
create policy "calendar_connections_select" on public.calendar_connections
  for select using (public.user_family_role(family_id) in ('admin', 'parent'));

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (public.can_access_family(family_id));

drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log
  for select using (public.can_access_family(family_id));

drop policy if exists "family_documents_select" on storage.objects;
create policy "family_documents_select" on storage.objects
  for select using (
    bucket_id = 'family-documents'
    and public.can_access_section(split_part(name, '/', 1), 'documents')
  );
