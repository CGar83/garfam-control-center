alter table public.calendar_connections
  add column if not exists embed_url text,
  add column if not exists embed_enabled boolean not null default false,
  add column if not exists embed_height integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_connections_embed_url_google_check'
  ) then
    alter table public.calendar_connections
      add constraint calendar_connections_embed_url_google_check
      check (
        embed_url is null
        or embed_url = ''
        or embed_url like 'https://calendar.google.com/calendar/embed%'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_connections_embed_height_check'
  ) then
    alter table public.calendar_connections
      add constraint calendar_connections_embed_height_check
      check (embed_height is null or embed_height between 420 and 1200);
  end if;
end $$;
