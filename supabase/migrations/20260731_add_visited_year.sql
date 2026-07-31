-- Run in the Supabase SQL editor on existing projects.

-- User-entered year of the trip (optional).
alter table public.visited_countries
  add column if not exists visited_year integer check (
    visited_year is null
    or (
      visited_year >= 1900
      and visited_year <= extract(year from now())::integer
    )
  );

-- visited_at was never used by the app for "when you visited" — rename to created_at
-- so it clearly means when the row was first registered in the database.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'visited_countries'
      and column_name = 'visited_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'visited_countries'
      and column_name = 'created_at'
  ) then
    alter table public.visited_countries rename column visited_at to created_at;
  end if;
end $$;

alter table public.visited_countries
  add column if not exists created_at timestamptz not null default now();
