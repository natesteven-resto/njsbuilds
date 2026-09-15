-- Migration 010: Assign existing Film Room data to natesteven@gmail.com
--
-- MANUAL STEP — run in Supabase SQL Editor AFTER:
--   1. Migrations 007b, 009, 011, 012 applied
--   2. Export SQL imported (all owner_id = NULL)
--   3. natesteven@gmail.com has signed up and confirmed email in the new project
--
-- Handles BOTH ordering scenarios safely:
--   Scenario A: 010 runs before first login (owner_id assignment, then RPC finds legacy coach)
--   Scenario B: 010 runs after first login (provision_default_library already ran,
--               created a new coach row; 010 must merge/skip without violating unique constraint)
--
-- Safety guarantees (RAISE EXCEPTION = full rollback on any violation):
--   - natesteven@gmail.com must exist and be confirmed
--   - Legacy team (TEST_TEAM_ID) must exist
--   - Legacy team must NOT be owned by a DIFFERENT user
--   - Legacy coach unique auth_user_id constraint handled: if already linked, verified same user
--   - If a new auto-provisioned team exists alongside legacy team, reports count
--   - Idempotent: safe to re-run if already fully or partially assigned

begin;

do $$
declare
  v_user_id         uuid;
  v_coach_id        uuid := '00000000-0000-0000-0000-000000000001'; -- legacy TEST_COACH_ID
  v_team_id         uuid := '00000000-0000-0000-0000-000000000010'; -- legacy TEST_TEAM_ID
  v_existing_owner  uuid;
  v_coach_link      uuid;
  v_auto_coach_id   uuid;
  v_game_count      int;
  v_player_count    int;
  v_clip_count      int;
  v_comment_count   int;
  v_stat_count      int;
begin

  -- 1. Verified account must exist in this project's auth.users
  select id into v_user_id
    from auth.users
   where email = 'natesteven@gmail.com'
     and email_confirmed_at is not null
   limit 1;

  if v_user_id is null then
    raise exception 'ABORT: natesteven@gmail.com not found or not confirmed in auth.users';
  end if;

  raise notice 'Owner: %', v_user_id;

  -- 2. Legacy team must exist (it comes from the data import)
  if not exists (select 1 from public.teams where id = v_team_id) then
    raise exception 'ABORT: legacy team % not found — run data import first', v_team_id;
  end if;

  -- 3. Legacy team must not be owned by a DIFFERENT user
  select owner_id into v_existing_owner from public.teams where id = v_team_id;
  if v_existing_owner is not null and v_existing_owner <> v_user_id then
    raise exception 'ABORT: legacy team % already owned by %, not the expected user',
      v_team_id, v_existing_owner;
  end if;

  -- 4. Handle legacy coach row + auth_user_id linkage
  --    Cases:
  --      a) coach.auth_user_id IS NULL → link it (normal first-run)
  --      b) coach.auth_user_id = v_user_id → already linked (idempotent re-run)
  --      c) coach.auth_user_id = different user → abort
  --      d) legacy coach missing → abort (import not done)
  --      e) another coach row already has auth_user_id = v_user_id (signup ran first via RPC)
  --         → do NOT touch the legacy coach's auth_user_id, just link teams/games/etc to user

  if not exists (select 1 from public.coaches where id = v_coach_id) then
    raise exception 'ABORT: legacy coach % not found — run data import first', v_coach_id;
  end if;

  select auth_user_id into v_coach_link from public.coaches where id = v_coach_id;

  if v_coach_link is not null and v_coach_link <> v_user_id then
    raise exception 'ABORT: legacy coach % already linked to different user %',
      v_coach_id, v_coach_link;
  end if;

  -- Check if a different (auto-provisioned) coach row already holds this user's auth_user_id
  -- This happens when the user signed up and provision_default_library ran before migration 010
  select id into v_auto_coach_id
    from public.coaches
   where auth_user_id = v_user_id
     and id <> v_coach_id
   limit 1;

  if v_auto_coach_id is not null then
    -- Signup ran first: an auto-provisioned coach exists linked to this user.
    -- The legacy coach row cannot also get auth_user_id = v_user_id (unique constraint).
    -- Resolution: leave legacy coach.auth_user_id NULL (it is still the owning coach
    -- of the legacy team by team.coach_id FK), and proceed to assign owner_id on all rows.
    raise notice 'Auto-provisioned coach % already linked to owner; legacy coach auth_user_id left NULL', v_auto_coach_id;
  else
    -- Normal case or idempotent re-run: link legacy coach to owner
    update public.coaches
       set auth_user_id = v_user_id
     where id = v_coach_id
       and (auth_user_id is null or auth_user_id = v_user_id);
  end if;

  -- 5. Assign owner_id on teams
  update public.teams set owner_id = v_user_id
   where id = v_team_id
     and (owner_id is null or owner_id = v_user_id);

  -- 6. Assign owner_id on games (idempotent: skip already-assigned rows)
  update public.games set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_game_count = row_count;

  -- 7. Assign owner_id on players
  update public.players set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_player_count = row_count;

  -- 8. Assign owner_id on clips
  update public.clips set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_clip_count = row_count;

  -- 9. Assign owner_id on clip_comments (via clip membership)
  update public.clip_comments cc
     set owner_id = v_user_id
    from public.clips c
   where cc.clip_id = c.id
     and c.team_id = v_team_id
     and (cc.owner_id is null or cc.owner_id = v_user_id);
  get diagnostics v_comment_count = row_count;

  -- 10. Assign owner_id on stat_entries (via game membership)
  update public.stat_entries se
     set owner_id = v_user_id
    from public.games g
   where se.game_id = g.id
     and g.team_id = v_team_id
     and (se.owner_id is null or se.owner_id = v_user_id);
  get diagnostics v_stat_count = row_count;

  -- 11. Sanity: no legacy games left unassigned
  if exists (
    select 1 from public.games
     where team_id = v_team_id
       and (owner_id is null or owner_id <> v_user_id)
  ) then
    raise exception 'ABORT: some games remain unassigned after migration — rolling back';
  end if;

  raise notice 'Migration 010 complete: games=%, players=%, clips=%, comments=%, stat_entries=%',
    v_game_count, v_player_count, v_clip_count, v_comment_count, v_stat_count;

  if v_auto_coach_id is not null then
    raise notice 'NOTE: auto-provisioned coach % also exists for this user (from pre-010 signup). Both point to the same owner; library will show correctly.', v_auto_coach_id;
  end if;

end $$;

commit;

-- ── ROLLBACK (paste and run to undo before migration 011b) ────────────────────
-- begin;
-- do $$
-- declare
--   v_user_id uuid;
--   v_coach_id uuid := '00000000-0000-0000-0000-000000000001';
--   v_team_id  uuid := '00000000-0000-0000-0000-000000000010';
-- begin
--   select id into v_user_id from auth.users where email='natesteven@gmail.com' limit 1;
--   if v_user_id is null then raise exception 'owner not found'; end if;
--   update public.stat_entries se set owner_id=null
--     from public.games g where se.game_id=g.id and g.team_id=v_team_id and se.owner_id=v_user_id;
--   update public.clip_comments cc set owner_id=null
--     from public.clips c where cc.clip_id=c.id and c.team_id=v_team_id and cc.owner_id=v_user_id;
--   update public.clips  set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.players set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.games  set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.teams  set owner_id=null where id=v_team_id and owner_id=v_user_id;
--   update public.coaches set auth_user_id=null where id=v_coach_id and auth_user_id=v_user_id;
--   raise notice 'Rollback complete';
-- end $$;
-- commit;
