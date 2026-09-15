-- Migration 010: Assign existing Film Room data to natesteven@gmail.com
-- MANUAL STEP — run only after:
--   1. natesteven@gmail.com has signed up and confirmed email in Supabase Auth
--   2. Migration 009 is applied
--   3. You have verified this is safe to run (see pre-flight assertions below)
--
-- Safety guarantees (raises EXCEPTION and rolls back on any violation):
--   - natesteven@gmail.com must exist and be confirmed
--   - Legacy coach (TEST_COACH_ID) must exist
--   - Legacy team (TEST_TEAM_ID) must exist
--   - Legacy team must NOT already have a different owner assigned
--   - Legacy coach must NOT already be linked to a different auth user
--   - Idempotent: safe to re-run if already assigned to same user

begin;

do $$
declare
  v_user_id  uuid;
  v_coach_id uuid := '00000000-0000-0000-0000-000000000001';
  v_team_id  uuid := '00000000-0000-0000-0000-000000000010';
  v_existing_team_owner  uuid;
  v_existing_coach_link  uuid;
  v_game_count   int;
  v_player_count int;
  v_clip_count   int;
  v_comment_count int;
  v_stat_count   int;
begin
  -- 1. Verified account must exist
  select id into v_user_id
    from auth.users
   where email = 'natesteven@gmail.com'
     and email_confirmed_at is not null
   limit 1;

  if v_user_id is null then
    raise exception 'ABORT: natesteven@gmail.com not found or not confirmed in auth.users';
  end if;

  -- 2. Legacy coach must exist
  if not exists (select 1 from public.coaches where id = v_coach_id) then
    raise exception 'ABORT: legacy coach % not found — cannot migrate', v_coach_id;
  end if;

  -- 3. Legacy team must exist
  if not exists (select 1 from public.teams where id = v_team_id) then
    raise exception 'ABORT: legacy team % not found — cannot migrate', v_team_id;
  end if;

  -- 4. Legacy team must not already belong to a DIFFERENT user
  select owner_id into v_existing_team_owner
    from public.teams where id = v_team_id;

  if v_existing_team_owner is not null and v_existing_team_owner <> v_user_id then
    raise exception 'ABORT: legacy team % already owned by different user % — aborting to prevent overwrite',
      v_team_id, v_existing_team_owner;
  end if;

  -- 5. Legacy coach must not already be linked to a DIFFERENT auth user
  select auth_user_id into v_existing_coach_link
    from public.coaches where id = v_coach_id;

  if v_existing_coach_link is not null and v_existing_coach_link <> v_user_id then
    raise exception 'ABORT: legacy coach % already linked to different user % — aborting',
      v_coach_id, v_existing_coach_link;
  end if;

  raise notice 'Pre-flight passed. Assigning to user_id: %', v_user_id;

  -- 6. Link coach record (idempotent)
  update public.coaches
     set auth_user_id = v_user_id
   where id = v_coach_id
     and (auth_user_id is null or auth_user_id = v_user_id);

  -- 7. Assign teams (idempotent)
  update public.teams
     set owner_id = v_user_id
   where id = v_team_id
     and (owner_id is null or owner_id = v_user_id);

  -- 8. Assign games — preserve video_url/video_id exactly as-is
  update public.games
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_game_count = row_count;

  -- 9. Assign players (jersey 0 preserved — no coercion here)
  update public.players
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_player_count = row_count;

  -- 10. Assign clips
  update public.clips
     set owner_id = v_user_id
   where team_id = v_team_id
     and (owner_id is null or owner_id = v_user_id);
  get diagnostics v_clip_count = row_count;

  -- 11. Assign clip comments via clip membership
  update public.clip_comments cc
     set owner_id = v_user_id
    from public.clips c
   where cc.clip_id = c.id
     and c.team_id = v_team_id
     and (cc.owner_id is null or cc.owner_id = v_user_id);
  get diagnostics v_comment_count = row_count;

  -- 12. Assign stat entries via game membership
  update public.stat_entries se
     set owner_id = v_user_id
    from public.games g
   where se.game_id = g.id
     and g.team_id = v_team_id
     and (se.owner_id is null or se.owner_id = v_user_id);
  get diagnostics v_stat_count = row_count;

  -- 13. Verify no games were left unassigned (sanity check)
  if exists (
    select 1 from public.games
     where team_id = v_team_id and (owner_id is null or owner_id <> v_user_id)
  ) then
    raise exception 'ABORT: some games remain unassigned after migration — rolling back';
  end if;

  raise notice 'Migration complete: games=%, players=%, clips=%, comments=%, stat_entries=%',
    v_game_count, v_player_count, v_clip_count, v_comment_count, v_stat_count;
end $$;

commit;

-- ============================================================
-- ROLLBACK SCRIPT (paste and run to undo before migration 011)
-- Only safe before 011 is applied.
-- ============================================================
-- begin;
-- do $$
-- declare
--   v_user_id uuid;
--   v_coach_id uuid := '00000000-0000-0000-0000-000000000001';
--   v_team_id  uuid := '00000000-0000-0000-0000-000000000010';
-- begin
--   select id into v_user_id from auth.users where email='natesteven@gmail.com' limit 1;
--   if v_user_id is null then raise exception 'user not found'; end if;
--   update public.stat_entries se set owner_id=null from public.games g
--     where se.game_id=g.id and g.team_id=v_team_id and se.owner_id=v_user_id;
--   update public.clip_comments cc set owner_id=null from public.clips c
--     where cc.clip_id=c.id and c.team_id=v_team_id and cc.owner_id=v_user_id;
--   update public.clips  set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.players set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.games  set owner_id=null where team_id=v_team_id and owner_id=v_user_id;
--   update public.teams  set owner_id=null where id=v_team_id and owner_id=v_user_id;
--   update public.coaches set auth_user_id=null where id=v_coach_id and auth_user_id=v_user_id;
--   raise notice 'Rollback complete — all rows returned to null ownership';
-- end $$;
-- commit;
