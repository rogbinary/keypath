-- KeyPath / 键途 Supabase 数据表
-- 在 Supabase Dashboard → SQL Editor 里运行整段 SQL

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  best_wpm integer not null default 0,
  best_accuracy integer not null default 0,
  game_high_score integer not null default 0,
  sessions integer not null default 0,
  game_sessions integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

drop policy if exists "profiles are visible" on public.profiles;
create policy "profiles are visible"
on public.profiles for select
using (true);

drop policy if exists "players create own profile" on public.profiles;
create policy "players create own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "players update own profile" on public.profiles;
create policy "players update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "scores are visible for leaderboard" on public.scores;
create policy "scores are visible for leaderboard"
on public.scores for select
using (true);

drop policy if exists "players create own scores" on public.scores;
create policy "players create own scores"
on public.scores for insert
with check (auth.uid() = user_id);

drop policy if exists "players update own scores" on public.scores;
create policy "players update own scores"
on public.scores for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

