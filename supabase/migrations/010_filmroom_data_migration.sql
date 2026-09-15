-- Migration 010: Assign existing Film Room data to natesteven@gmail.com
-- MANUAL STEP — run only after:
--   1. natesteven@gmail.com has signed up and confirmed email
--   2. You have verified auth.users match independently
--   3. Migration 009 is already applied
--
-- This script is TRANSACTIONAL and IDEMPOTENT.
-- It will RAISE EXCEPTION if the account is not found or unconfirmed.
-- It will NOT assign data to any other user.

do $$
declare
  v_user_id uuid;
  v_coach_id uuid := '00000000-0000-0000-0000-000000000001';
  v_team_id  uuid := '00000000-0000-0000-0000-000000000010';
  v_games_updated int;
  v_players_updated int;
  v_clips_updated int;
  v_comments_updated int;
  v_stats_updated int;
begin
  -- 1. Find verified natesteven@gmail.com — hard fail if not found
  select id into v_user_id
    from auth.users
   where email = 'natesteven@gmail.com'
     and email_confirmed_at is not null
   limit 1;

  if v_user_id is null then
    raise exception 'natesteven@gmail.com not found or email not confirmed in auth.users — aborting migration';
  end if;

  raise notice 'Assigning data to user_id: %', v_user_id;

  -- 2. Link coach record
  update public.coaches
     set auth_user_id = v_user_id
   where id = v_coach_id
     and (auth_user_id is null or auth_user_id = v_user_id);

  -- 3. Assign teams
  update public.teams
     set owner_id = v_user_id
   where id = v_team_id
     and (owner_id is null or owner_id = v_user_id);

  -- 4. Assign games
  update public.games
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_games_updated = row_count;

  -- 5. Assign players
  update public.players
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_players_updated = row_count;

  -- 6. Assign clips
  update public.clips
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_clips_updated = row_count;

  -- 7. Assign clip comments (via clip ownership)
  update public.clip_comments cc
     set owner_id = v_user_id
    from public.clips c
   where cc.clip_id = c.id
     and c.team_id = v_team_id
     and (cc.owner_id is null or cc.owner_id = v_user_id);
  get diagnostics v_comments_updated = row_count;

  -- 8. Assign stat entries (via game ownership)
  update public.stat_entries se
     set owner_id = v_user_id
    from public.games g
   where se.game_id = g.id
     and g.team_id = v_team_id
     and (se.owner_id is null or se.owner_id = v_user_id);
  get diagnostics v_stats_updated = row_count;

  raise notice 'Migration complete: games=%, players=%, clips=%, comments=%, stat_entries=%',
    v_games_updated, v_players_updated, v_clips_updated, v_comments_updated, v_stats_updated;
end $$;

-- ============================================================
-- ROLLBACK (run this block to undo, before migration 011)
-- ============================================================
-- do $$
-- declare
--   v_user_id uuid;
--   v_coach_id uuid := '00000000-0000-0000-0000-000000000001';
--   v_team_id  uuid := '00000000-0000-0000-0000-000000000010';
-- begin
--   select id into v_user_id from auth.users where email = 'natesteven@gmail.com' limit 1;
--   update public.coaches set auth_user_id = null where id = v_coach_id and auth_user_id = v_user_id;
--   update public.games set owner_id = null where team_id = v_team_id and owner_id = v_user_id;
--   update public.teams set owner_id = null where id = v_team_id and owner_id = v_user_id;
--   update public.players set owner_id = null where team_id = v_team_id and owner_id = v_user_id;
--   update public.clips set owner_id = null where team_id = v_team_id and owner_id = v_user_id;
--   update public.clip_comments set owner_id = null where owner_id = v_user_id;
--   update public.stat_entries set owner_id = null where owner_id = v_user_id;
--   raise notice 'Rollback complete';
-- end $$;
