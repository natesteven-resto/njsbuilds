-- Film Room Schema
-- Basketball film study platform for njsbuilds

-- ============================================================
-- COACHES
-- ============================================================
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- Seed a test coach for development
insert into public.coaches (id, email, name)
values ('00000000-0000-0000-0000-000000000001', 'test@filmroom.dev', 'Coach Stevens')
on conflict (id) do nothing;

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  season text not null default '2025-26',
  sport text not null default 'basketball',
  created_at timestamptz not null default now()
);

-- Seed a test team
insert into public.teams (id, coach_id, name, season)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Varsity Boys', '2025-26')
on conflict (id) do nothing;

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  number integer,
  position text,
  parent_email text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- GAMES
-- ============================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent text not null,
  game_date date not null,
  location text,
  video_url text,
  video_id text,
  thumbnail_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIPS
-- ============================================================
create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  start_time_ms integer not null,
  end_time_ms integer not null,
  title text not null default 'Untitled Clip',
  tags text[] not null default '{}',
  category text not null default 'offense' check (category in ('offense', 'defense', 'transition', 'set_play')),
  is_highlight boolean not null default false,
  drawing_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIP <-> PLAYER (many-to-many)
-- ============================================================
create table if not exists public.clip_players (
  clip_id uuid not null references public.clips(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (clip_id, player_id)
);

-- ============================================================
-- CLIP COMMENTS
-- ============================================================
create table if not exists public.clip_comments (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.clips(id) on delete cascade,
  author_id uuid,
  author_role text not null default 'coach' check (author_role in ('coach', 'player', 'parent')),
  author_name text not null default 'Coach',
  text text not null,
  drawing_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PLAYER STATS
-- ============================================================
create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  pts integer not null default 0,
  reb integer not null default 0,
  ast integer not null default 0,
  stl integer not null default 0,
  blk integer not null default 0,
  turnovers integer not null default 0,
  fg2m integer not null default 0,
  fg2a integer not null default 0,
  fg3m integer not null default 0,
  fg3a integer not null default 0,
  ftm integer not null default 0,
  fta integer not null default 0,
  unique (game_id, player_id)
);

-- ============================================================
-- STAT <-> CLIP links
-- ============================================================
create table if not exists public.stat_clips (
  stat_id uuid not null references public.player_stats(id) on delete cascade,
  clip_id uuid not null references public.clips(id) on delete cascade,
  stat_type text not null,
  primary key (stat_id, clip_id)
);

-- ============================================================
-- RLS (open during testing — no auth required)
-- ============================================================
alter table public.coaches enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.clips enable row level security;
alter table public.clip_players enable row level security;
alter table public.clip_comments enable row level security;
alter table public.player_stats enable row level security;
alter table public.stat_clips enable row level security;

-- Open policies for testing (auth will be added later)
create policy "filmroom_coaches_open" on public.coaches for all using (true) with check (true);
create policy "filmroom_teams_open" on public.teams for all using (true) with check (true);
create policy "filmroom_players_open" on public.players for all using (true) with check (true);
create policy "filmroom_games_open" on public.games for all using (true) with check (true);
create policy "filmroom_clips_open" on public.clips for all using (true) with check (true);
create policy "filmroom_clip_players_open" on public.clip_players for all using (true) with check (true);
create policy "filmroom_clip_comments_open" on public.clip_comments for all using (true) with check (true);
create policy "filmroom_player_stats_open" on public.player_stats for all using (true) with check (true);
create policy "filmroom_stat_clips_open" on public.stat_clips for all using (true) with check (true);

-- Grants for anon + authenticated
grant all on public.coaches to anon, authenticated;
grant all on public.teams to anon, authenticated;
grant all on public.players to anon, authenticated;
grant all on public.games to anon, authenticated;
grant all on public.clips to anon, authenticated;
grant all on public.clip_players to anon, authenticated;
grant all on public.clip_comments to anon, authenticated;
grant all on public.player_stats to anon, authenticated;
grant all on public.stat_clips to anon, authenticated;
