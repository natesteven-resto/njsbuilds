-- Migration 012: active_upload_session column + transactional library provisioning RPC

-- Add active_upload_session to games (after upload_sessions table exists in 009)
alter table public.games
  add column if not exists active_upload_session uuid
  references public.upload_sessions(id) on delete set null;

-- Migration 012: Transactional library provisioning RPC
-- Creates or returns a coach+team pair for the calling auth user.
-- Uses advisory lock keyed on auth.uid() to prevent duplicate creation
-- under concurrent requests (e.g. rapid page reloads on first login).
-- Idempotent: safe to call multiple times; always returns existing data.
-- SECURITY DEFINER runs as the migration owner (superuser), bypasses RLS
-- for the insert-if-not-exists logic only; returns only the calling user's data.

create or replace function public.provision_default_library(
  p_team_name text default 'My Team',
  p_season    text default '2025-26',
  p_sport     text default 'basketball'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_coach_id uuid;
  v_team_id  uuid;
  v_lock_key bigint;
begin
  -- 1. Get verified caller identity
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Advisory lock: prevents concurrent duplicate creation for same user
  --    Key is derived from the user UUID (low 64 bits) — sufficient for session-level uniqueness
  v_lock_key := ('x' || substr(replace(v_user_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- 3. Find or create coach row for this user
  select id into v_coach_id
    from public.coaches
   where auth_user_id = v_user_id
   limit 1;

  if v_coach_id is null then
    insert into public.coaches (email, name, auth_user_id, plan)
    select u.email, coalesce(split_part(u.email, '@', 1), 'Coach'), v_user_id, 'free'
      from auth.users u
     where u.id = v_user_id
    returning id into v_coach_id;

    if v_coach_id is null then
      raise exception 'Could not find auth user for id %', v_user_id;
    end if;
  end if;

  -- 4. Find or create default team for this user (match on owner_id + name)
  select id into v_team_id
    from public.teams
   where owner_id = v_user_id
     and name = p_team_name
   limit 1;

  if v_team_id is null then
    insert into public.teams (coach_id, name, season, sport, owner_id)
    values (v_coach_id, p_team_name, p_season, p_sport, v_user_id)
    returning id into v_team_id;
  end if;

  return jsonb_build_object(
    'coach_id', v_coach_id,
    'team_id',  v_team_id,
    'team_name', p_team_name
  );
end;
$$;

-- Grant execute to authenticated users only (no anon)
revoke all on function public.provision_default_library(text, text, text) from public, anon;
grant execute on function public.provision_default_library(text, text, text) to authenticated;
