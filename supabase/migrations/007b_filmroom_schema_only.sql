-- Migration 007b: Film Room schema for a FRESH dedicated project.
-- No seed data. No open policies. No public exposure window.
-- Apply this INSTEAD of 007_filmroom.sql + 008_stat_entries.sql on a new project.
-- Immediately followed by 009_filmroom_auth.sql in the same SQL session
-- (both files must be pasted and run together, or in immediate sequence,
--  to avoid any window where tables exist without RLS).
--
-- Differences from original 007/008:
--   - No TEST_COACH_ID / TEST_TEAM_ID seed rows (data comes from export)
--   - No open "using (true)" policies (009 installs real policies)
--   - No "grant all to anon" (009 installs correct column-level grants)
--   - stat_entries.player_id is nullable (opponent events have null player_id)
--   - No spurious game_id_idx column in stat_entries
--   - stat_entries CHECK omitted here; 011 installs the correct full type set
--   - RLS enabled immediately with a temporary DENY-ALL state until 009 runs

begin;

-- ── Tables (FK order) ─────────────────────────────────────────────────────────

create table if not exists public.coaches (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  name       text not null,
  season     text not null default '2025-26',
  sport      text not null default 'basketball',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  name         text not null,
  number       integer,
  position     text,
  parent_email text,
  created_at   timestamptz not null default now()
);

create table if not exists public.games (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  opponent      text not null,
  game_date     date not null,
  location      text,
  video_url     text,
  video_id      text,
  thumbnail_url text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.clips (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  start_time_ms integer not null,
  end_time_ms   integer not null,
  title         text not null default 'Untitled Clip',
  tags          text[] not null default '{}',
  category      text not null default 'offense'
                  check (category in ('offense','defense','transition','set_play')),
  is_highlight  boolean not null default false,
  drawing_data  jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.clip_players (
  clip_id   uuid not null references public.clips(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (clip_id, player_id)
);

create table if not exists public.clip_comments (
  id           uuid primary key default gen_random_uuid(),
  clip_id      uuid not null references public.clips(id) on delete cascade,
  author_id    uuid,
  author_role  text not null default 'coach'
                 check (author_role in ('coach','player','parent')),
  author_name  text not null default 'Coach',
  text         text not null,
  drawing_data jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists public.player_stats (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  pts        integer not null default 0,
  reb        integer not null default 0,
  ast        integer not null default 0,
  stl        integer not null default 0,
  blk        integer not null default 0,
  turnovers  integer not null default 0,
  fg2m       integer not null default 0,
  fg2a       integer not null default 0,
  fg3m       integer not null default 0,
  fg3a       integer not null default 0,
  ftm        integer not null default 0,
  fta        integer not null default 0,
  unique (game_id, player_id)
);

create table if not exists public.stat_clips (
  stat_id   uuid not null references public.player_stats(id) on delete cascade,
  clip_id   uuid not null references public.clips(id) on delete cascade,
  stat_type text not null,
  primary key (stat_id, clip_id)
);

-- stat_entries: player_id is nullable (null = opponent/untagged event)
-- CHECK constraint intentionally omitted here; migration 011 installs the
-- correct full type set covering all current stat types.
create table if not exists public.stat_entries (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games(id) on delete cascade,
  player_id     uuid references public.players(id) on delete cascade, -- nullable
  stat_type     text not null,
  video_time_ms integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists stat_entries_game_id_idx   on public.stat_entries(game_id);
create index if not exists stat_entries_player_id_idx on public.stat_entries(player_id);

-- ── RLS enabled immediately — deny-all until 009 installs real policies ───────
-- No open policies. No grants to anon or authenticated.
-- Service role (used during data import) bypasses RLS automatically.
-- 009 must be applied in the same session immediately after this file.

alter table public.coaches       enable row level security;
alter table public.teams         enable row level security;
alter table public.players       enable row level security;
alter table public.games         enable row level security;
alter table public.clips         enable row level security;
alter table public.clip_players  enable row level security;
alter table public.clip_comments enable row level security;
alter table public.player_stats  enable row level security;
alter table public.stat_clips    enable row level security;
alter table public.stat_entries  enable row level security;

commit;

-- ── IMPORTANT ─────────────────────────────────────────────────────────────────
-- Tables now exist with RLS enabled and NO policies = deny all to non-service roles.
-- Paste and run 009_filmroom_auth.sql immediately in the next query.
-- Data import (export SQL) uses service role which bypasses RLS — safe at any point.
