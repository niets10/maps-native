-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- It sets up:
--   1. profiles table, kept in sync with auth.users via a trigger
--   2. visited_countries table, the core data for this app
--   3. Row Level Security policies so every user can only see/edit their own rows

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are editable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- visited_countries
-- ─────────────────────────────────────────────────────────────
create table if not exists public.visited_countries (
  user_id uuid not null references auth.users (id) on delete cascade,
  country_code text not null check (char_length(country_code) = 2),
  visited_at timestamptz not null default now(),
  notes text,
  primary key (user_id, country_code)
);

alter table public.visited_countries enable row level security;

create policy "Users can view their own visited countries"
  on public.visited_countries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own visited countries"
  on public.visited_countries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own visited countries"
  on public.visited_countries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own visited countries"
  on public.visited_countries for delete
  using (auth.uid() = user_id);

-- Enable Realtime updates (used to keep the app in sync across devices/tabs).
alter publication supabase_realtime add table public.visited_countries;
