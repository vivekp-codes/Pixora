-- ============================================================
-- Pixora Print Lab — Supabase schema (paste into SQL Editor)
-- Safe to re-run: uses CREATE ... IF NOT EXISTS everywhere.
-- Enforces: per-user private images, fast history lookups,
-- and an auto-created profile row when a user signs up.
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);

-- ---------- images ----------
create table if not exists public.images (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  prompt     text not null,
  width      int  not null,
  height     int  not null,
  seed       int,
  url        text,
  favorite   boolean not null default false,
  created_at timestamptz not null default now(),
  -- informational only (helps you spot a user's work in the dashboard).
  -- NOT a lookup key — lookups stay on user_id.
  user_email text
);

-- Fastest possible "give me this user's images, newest first"
create index if not exists images_user_created_idx
  on public.images (user_id, created_at desc);

-- ---------- Row Level Security (private per-user data) ----------
alter table public.profiles enable row level security;
alter table public.images   enable row level security;

-- profiles: a user manages only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- images: a user can only read/write their own images
drop policy if exists "images_select_own" on public.images;
create policy "images_select_own" on public.images
  for select using (auth.uid() = user_id);

drop policy if exists "images_insert_own" on public.images;
create policy "images_insert_own" on public.images
  for insert with check (auth.uid() = user_id);

drop policy if exists "images_update_own" on public.images;
create policy "images_update_own" on public.images
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "images_delete_own" on public.images;
create policy "images_delete_own" on public.images
  for delete using (auth.uid() = user_id);

-- ---------- Auto-create a profile row on signup ----------
-- Never blocks signup: if the insert ever fails it is skipped
-- (the app lazy-upserts the profile and falls back to the
-- email-username, so no data/UX is lost).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, name, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
      new.email
    )
    on conflict (id) do nothing;
  exception when others then
    raise notice 'profile create skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any auth users that never got a profile row
-- (run safely anytime; errors are ignored).
do $$
declare r record;
begin
  for r in
    select u.id as uid, u.email as email,
           coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '') as uname
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    begin
      insert into public.profiles (id, name, email)
      values (r.uid, r.uname, r.email)
      on conflict (id) do nothing;
    exception when others then
      null;
    end;
  end loop;
end $$;

-- ============================================================
-- Done. After running this once:
--   1. Clear the app's saved session once
--      (or sign out in the app), then sign in fresh.
--   2. Every new account gets a profile row + private images,
--      and home-page history loads fast via the index.
-- ============================================================