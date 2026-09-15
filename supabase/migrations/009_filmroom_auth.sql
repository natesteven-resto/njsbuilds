-- Migration 009: Film Room Auth — Additive, atomic, deny-by-default
-- v3: fixes stat_entries player cross-ownership, team consistency on clips,
--     stat_clips same-game check, teams coach linkage, video_url/video_id
--     server-only column grants.
--
-- No open policies. No legacy windows. No anon access to any Film Room table.
-- upload_sessions: service_role-only mutation; owner may only SELECT own rows.
-- All WITH CHECK clauses verify full ownership chain.

begin;

-- ============================================================
-- 1. Extend coaches
-- ============================================================
alter table public.coaches
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- plan is server-only billing placeholder; column grant excluded below
alter table public.coaches
  add column if not exists plan text not null default 'free';

-- ============================================================
-- 2. owner_id on all Film Room tables
-- ============================================================
alter table public.teams
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.games
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.players
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.clips
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.clip_comments
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.stat_entries
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists teams_owner_id_idx        on public.teams(owner_id);
create index if not exists games_owner_id_idx        on public.games(owner_id);
create index if not exists players_owner_id_idx      on public.players(owner_id);
create index if not exists clips_owner_id_idx        on public.clips(owner_id);
create index if not exists stat_entries_owner_id_idx on public.stat_entries(owner_id);

-- ============================================================
-- 3. upload_sessions — service_role-only mutation
-- ============================================================
create table if not exists public.upload_sessions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  game_id     uuid not null references public.games(id) on delete cascade,
  r2_key      text not null,
  upload_id   text not null,
  status      text not null default 'in_progress'
                check (status in ('in_progress','complete','aborted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists upload_sessions_owner_idx on public.upload_sessions(owner_id);
create index if not exists upload_sessions_game_idx  on public.upload_sessions(game_id);

-- ============================================================
-- 4. Drop ALL existing open test policies (idempotent)
-- ============================================================
drop policy if exists "filmroom_coaches_open"       on public.coaches;
drop policy if exists "filmroom_teams_open"         on public.teams;
drop policy if exists "filmroom_players_open"       on public.players;
drop policy if exists "filmroom_games_open"         on public.games;
drop policy if exists "filmroom_clips_open"         on public.clips;
drop policy if exists "filmroom_clip_players_open"  on public.clip_players;
drop policy if exists "filmroom_clip_comments_open" on public.clip_comments;
drop policy if exists "filmroom_player_stats_open"  on public.player_stats;
drop policy if exists "filmroom_stat_clips_open"    on public.stat_clips;
drop policy if exists "stat_entries_open"           on public.stat_entries;

-- ============================================================
-- 5. Enable RLS on all tables (idempotent)
-- ============================================================
alter table public.coaches         enable row level security;
alter table public.teams           enable row level security;
alter table public.players         enable row level security;
alter table public.games           enable row level security;
alter table public.clips           enable row level security;
alter table public.clip_players    enable row level security;
alter table public.clip_comments   enable row level security;
alter table public.stat_entries    enable row level security;
alter table public.player_stats    enable row level security;
alter table public.stat_clips      enable row level security;
alter table public.upload_sessions enable row level security;

-- ============================================================
-- 6. Deny-by-default: revoke ALL, then grant minimally
-- ============================================================
revoke all on public.coaches         from anon, authenticated;
revoke all on public.teams           from anon, authenticated;
revoke all on public.games           from anon, authenticated;
revoke all on public.players         from anon, authenticated;
revoke all on public.clips           from anon, authenticated;
revoke all on public.clip_players    from anon, authenticated;
revoke all on public.clip_comments   from anon, authenticated;
revoke all on public.stat_entries    from anon, authenticated;
revoke all on public.player_stats    from anon, authenticated;
revoke all on public.stat_clips      from anon, authenticated;
revoke all on public.upload_sessions from anon, authenticated;

-- authenticated: DML on owned tables; RLS enforces row scope.
-- video_url, video_id excluded from games grant — server-only writes.
-- plan, auth_user_id excluded from coaches grant — server-only writes.
grant select, insert, delete on public.teams         to authenticated;
grant update (name, season, sport)         on public.teams         to authenticated;

grant select, insert, delete on public.games         to authenticated;
grant update (opponent, game_date, location, notes, thumbnail_url)
                                           on public.games         to authenticated;
-- video_url and video_id are intentionally omitted: only service_role can write them.
-- Signed URL generation verifies ownership before reading these fields.

grant select, insert, delete on public.players       to authenticated;
grant update (name, number, position, parent_email)  on public.players to authenticated;

grant select, insert, delete on public.clips         to authenticated;
grant update (title, tags, category, is_highlight, drawing_data, start_time_ms, end_time_ms)
                                           on public.clips         to authenticated;

grant select, insert, delete on public.clip_players  to authenticated;

grant select, insert, delete on public.clip_comments to authenticated;
grant update (text, drawing_data)          on public.clip_comments to authenticated;

grant select, insert, delete on public.stat_entries  to authenticated;
-- stat_entries has no user-updatable fields after insert

grant select, insert, delete on public.player_stats  to authenticated;
grant update (pts, reb, ast, stl, blk, turnovers, fg2m, fg2a, fg3m, fg3a, ftm, fta)
                                           on public.player_stats  to authenticated;

grant select, insert, delete on public.stat_clips    to authenticated;

-- coaches: SELECT own row; UPDATE name only; plan/auth_user_id server-only
grant select on public.coaches        to authenticated;
grant update (name) on public.coaches to authenticated;

-- upload_sessions: authenticated may only SELECT their own rows
grant select on public.upload_sessions to authenticated;

-- ============================================================
-- 7. RLS policies — full ownership chain verification
-- ============================================================

-- coaches: own row via auth_user_id
create policy "coaches_select_own" on public.coaches
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy "coaches_update_own" on public.coaches
  for update to authenticated
  using  (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- teams: owner_id = caller
-- WITH CHECK also verifies the team being written belongs to a coach whose
-- auth_user_id matches the caller (prevents orphan team creation).
create policy "teams_own" on public.teams
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.coaches c
       where c.auth_user_id = auth.uid()
    )
  );

-- games: owner_id = caller; team must also belong to caller
create policy "games_own" on public.games
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.teams t
       where t.id = team_id and t.owner_id = auth.uid()
    )
  );

-- players: owner_id = caller; team must belong to caller
create policy "players_own" on public.players
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.teams t
       where t.id = team_id and t.owner_id = auth.uid()
    )
  );

-- clips: owner_id = caller; game must belong to caller;
--        clip.team_id must equal game.team_id (prevents cross-game team mismatch)
create policy "clips_own" on public.clips
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.games g
       where g.id = game_id
         and g.owner_id = auth.uid()
         and g.team_id = clips.team_id   -- team_id must match game's team
    )
  );

-- clip_players: clip AND player must both belong to caller AND share same team_id
create policy "clip_players_own" on public.clip_players
  for all to authenticated
  using (
    exists (select 1 from public.clips   c where c.id = clip_id   and c.owner_id = auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.clips c where c.id = clip_id and c.owner_id = auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.owner_id = auth.uid())
    -- clip and player must share the same team
    and exists (
      select 1
        from public.clips   c
        join public.players p on p.id = player_id
       where c.id = clip_id
         and c.team_id = p.team_id
    )
  );

-- clip_comments: owner_id = caller; clip must belong to caller
create policy "clip_comments_own" on public.clip_comments
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.clips c
       where c.id = clip_id and c.owner_id = auth.uid()
    )
  );

-- stat_entries: owner_id = caller; game must belong to caller;
--               player (if provided) must belong to caller AND same team as game
create policy "stat_entries_own" on public.stat_entries
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    -- game must belong to caller
    and exists (
      select 1 from public.games g
       where g.id = game_id and g.owner_id = auth.uid()
    )
    -- player (if non-null) must belong to caller AND be on the same team as the game
    and (
      player_id is null
      or exists (
        select 1
          from public.players p
          join public.games   g on g.id = game_id
         where p.id = player_id
           and p.owner_id = auth.uid()
           and p.team_id  = g.team_id   -- same team as the game
      )
    )
  );

-- player_stats: game must belong to caller; player must belong to caller
--               and be on same team as the game
create policy "player_stats_own" on public.player_stats
  for all to authenticated
  using (
    exists (
      select 1 from public.games g
       where g.id = game_id and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.games g
       where g.id = game_id and g.owner_id = auth.uid()
    )
    and exists (
      select 1
        from public.players p
        join public.games   g on g.id = game_id
       where p.id = player_id
         and p.owner_id = auth.uid()
         and p.team_id  = g.team_id
    )
  );

-- stat_clips: clip must belong to caller; stat must belong to caller
--             AND stat and clip must reference the same game
create policy "stat_clips_own" on public.stat_clips
  for all to authenticated
  using (
    exists (
      select 1 from public.clips c
       where c.id = clip_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clips c
       where c.id = clip_id and c.owner_id = auth.uid()
    )
    -- stat must belong to caller and share same game as clip
    and exists (
      select 1
        from public.player_stats ps
        join public.clips        c  on c.id = clip_id
       where ps.id      = stat_id
         and ps.game_id = c.game_id
         and exists (
           select 1 from public.games g
            where g.id = ps.game_id and g.owner_id = auth.uid()
         )
    )
  );

-- upload_sessions: authenticated may only SELECT their own rows
-- All INSERT/UPDATE/DELETE is service_role only (API layer)
create policy "upload_sessions_select_own" on public.upload_sessions
  for select to authenticated
  using (owner_id = auth.uid());

commit;
