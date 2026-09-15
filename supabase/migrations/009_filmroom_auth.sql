-- Migration 009: Film Room Auth — Additive, atomic, deny-by-default
-- v4: fixes harness failures:
--   - teams_own WITH CHECK now requires coach_id = caller's own coach (correlated)
--   - games INSERT grant excludes video_url, video_id (server-only columns)
--   - teams INSERT grant excludes coach_id (set from auth_user_id lookup only)
--   - upload_sessions: no authenticated INSERT grant (service_role only)
--   - middleware fix: video_url/video_id excluded at column-grant level
--   - All WITH CHECK clauses verified against PGlite harness

begin;

-- ============================================================
-- 1. Extend coaches
-- ============================================================
alter table public.coaches
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- plan: server-only billing placeholder; no authenticated write grant below
alter table public.coaches
  add column if not exists plan text not null default 'free';

-- ============================================================
-- 2. owner_id on all Film Room tables
-- ============================================================
alter table public.teams
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.games
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- active_upload_session added in 012 after upload_sessions table exists (circular FK)

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
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  game_id          uuid not null references public.games(id) on delete cascade,
  r2_key           text not null,
  upload_id        text not null,
  file_fingerprint text,     -- "safeFilename:sizeBytes" — detects file switching on resume
  expected_size    bigint,   -- client-reported file size for completion validation
  status           text not null default 'in_progress'
                     check (status in (
                       'in_progress',
                       'complete',
                       'complete_pending_attach',  -- R2 done, DB attachment needs retry
                       'aborted'
                     )),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
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
-- 6. Deny-by-default: revoke ALL, then grant column-level minimums
--
-- Key server-only columns withheld from authenticated grants:
--   games:  video_url, video_id (upload completion only)
--   teams:  coach_id (set from auth_user_id lookup at provisioning)
--   coaches: plan, auth_user_id (billing + identity — service_role only)
--   upload_sessions: ALL mutations (service_role only)
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

-- coaches: read own row; update display name only
grant select on public.coaches to authenticated;
grant update (name) on public.coaches to authenticated;

-- teams: select + delete; INSERT excludes coach_id (server resolves from auth_user_id)
--        UPDATE excludes coach_id (immutable after creation)
grant select, delete on public.teams to authenticated;
grant insert (id, owner_id, name, season, sport) on public.teams to authenticated;
grant update (name, season, sport) on public.teams to authenticated;

-- games: INSERT excludes video_url, video_id (server-only via upload completion)
--        UPDATE excludes video_url, video_id, team_id (immutable), owner_id
grant select, delete on public.games to authenticated;
grant insert (id, team_id, opponent, game_date, location, notes, thumbnail_url, owner_id)
  on public.games to authenticated;
grant update (opponent, game_date, location, notes, thumbnail_url)
  on public.games to authenticated;

-- players: full safe columns
grant select, delete on public.players to authenticated;
grant insert (id, team_id, name, number, position, parent_email, owner_id) on public.players to authenticated;
grant update (name, number, position, parent_email) on public.players to authenticated;

-- clips: team_id immutable after creation
grant select, delete on public.clips to authenticated;
grant insert (id, game_id, team_id, start_time_ms, end_time_ms, title, tags, category, is_highlight, drawing_data, owner_id)
  on public.clips to authenticated;
grant update (title, tags, category, is_highlight, drawing_data, start_time_ms, end_time_ms)
  on public.clips to authenticated;

-- clip_players: join table
grant select, insert, delete on public.clip_players to authenticated;

-- clip_comments: author_id, owner_id, author_role server-set; author_name is display-only
grant select, delete on public.clip_comments to authenticated;
-- author_id, author_role, owner_id are server-set only (service_role via API)
-- authenticated may only provide: clip_id, text, drawing_data, author_name (display only)
grant insert (id, clip_id, text, drawing_data, author_name)
  on public.clip_comments to authenticated;
grant update (text, drawing_data) on public.clip_comments to authenticated;

-- stat_entries: no update after insert
grant select, delete on public.stat_entries to authenticated;
grant insert (id, game_id, player_id, stat_type, video_time_ms, owner_id)
  on public.stat_entries to authenticated;

-- player_stats + stat_clips
grant select, delete on public.player_stats to authenticated;
grant insert (id, game_id, player_id, pts, reb, ast, stl, blk, turnovers, fg2m, fg2a, fg3m, fg3a, ftm, fta)
  on public.player_stats to authenticated;
grant update (pts, reb, ast, stl, blk, turnovers, fg2m, fg2a, fg3m, fg3a, ftm, fta)
  on public.player_stats to authenticated;

grant select, delete on public.stat_clips to authenticated;
grant insert (stat_id, clip_id, stat_type) on public.stat_clips to authenticated;

-- upload_sessions: authenticated may SELECT own rows only
-- INSERT/UPDATE/DELETE is service_role only (API uses createServiceClient)
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

-- teams: owner = caller; coach_id must reference the caller's own coach row
-- This prevents inserting a team with another user's coach_id.
-- coach_id column is excluded from INSERT grant; service_role sets it at provisioning.
-- For the RLS WITH CHECK we still verify it matches caller's coach if present.
create policy "teams_own" on public.teams
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    -- If coach_id is provided, it must be the coach row linked to the caller
    and (
      coach_id is null
      or exists (
        select 1 from public.coaches c
         where c.id = coach_id
           and c.auth_user_id = auth.uid()
      )
    )
  );

-- games: owner = caller; team must belong to caller.
-- video_url/video_id protection is enforced purely by column-level grants:
--   INSERT grant excludes video_url, video_id.
--   UPDATE grant excludes video_url, video_id, team_id.
-- No self-referencing subquery here to avoid infinite policy recursion.
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

-- players: owner = caller; team must belong to caller
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

-- clips: owner = caller; game belongs to caller; clip.team_id = game.team_id
create policy "clips_own" on public.clips
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and end_time_ms > start_time_ms
    and exists (
      select 1 from public.games g
       where g.id = game_id
         and g.owner_id = auth.uid()
         and g.team_id = clips.team_id
    )
  );

-- clip_players: clip AND player belong to caller AND share same team
create policy "clip_players_own" on public.clip_players
  for all to authenticated
  using (
    exists (select 1 from public.clips   c where c.id = clip_id   and c.owner_id = auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.clips c where c.id = clip_id and c.owner_id = auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.owner_id = auth.uid())
    and exists (
      select 1
        from public.clips   c
        join public.players p on p.id = player_id
       where c.id = clip_id and c.team_id = p.team_id
    )
  );

-- clip_comments: owner = caller; clip belongs to caller
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

-- stat_entries: owner = caller; game belongs to caller;
-- player (if non-null) belongs to caller AND is on game's team
create policy "stat_entries_own" on public.stat_entries
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.games g
       where g.id = game_id and g.owner_id = auth.uid()
    )
    and (
      player_id is null
      or exists (
        select 1
          from public.players p
          join public.games   g on g.id = game_id
         where p.id = player_id
           and p.owner_id = auth.uid()
           and p.team_id  = g.team_id
      )
    )
  );

-- player_stats: game + player both owned, player on game's team
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

-- stat_clips: clip owned by caller; stat references same game as clip
create policy "stat_clips_own" on public.stat_clips
  for all to authenticated
  using (
    exists (select 1 from public.clips c where c.id = clip_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.clips c where c.id = clip_id and c.owner_id = auth.uid())
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

-- upload_sessions: authenticated SELECT own rows only; INSERT/UPDATE/DELETE = service_role
create policy "upload_sessions_select_own" on public.upload_sessions
  for select to authenticated
  using (owner_id = auth.uid());

commit;
