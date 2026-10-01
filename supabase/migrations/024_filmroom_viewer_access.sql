-- Migration 024: Coach-invited Viewers (team-wide, free). Additive only.
--
-- Replaces the per-game film/stats sharing model (migrations 017/019/020/021)
-- with a team-wide membership model:
--   * An accepted, verified-email invitation grants FILM access to ALL games of
--     that team (existing AND future) automatically.
--   * Stats visibility is governed by teams.viewer_stats_mode:
--       'team'    -> every invited member sees all team stats.
--       'private' -> coach sees all; each viewer sees ONLY the stats of the
--                    player(s) the coach has explicitly linked to that viewer.
--   * Self-claim (a viewer requesting a connection) NEVER grants stats. It only
--     records a pending request the coach may approve into a link.
--
-- Preservation: no drops, no deletes, no arbitrary backfill. filmroom_parent_shares
-- rows are retained for history/compatibility but are no longer consulted for access.
-- Existing accepted invitations therefore become all-team FILM members immediately,
-- as explicitly approved in scope. Default private stats remain gated on approved links.
--
-- NEVER apply to production without a coordinated server deploy.

BEGIN;

-- ── Team-wide stats policy ────────────────────────────────────────────────────
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS viewer_stats_mode text NOT NULL DEFAULT 'private'
    CHECK (viewer_stats_mode IN ('private','team'));

-- ── Coach-approved viewer→player links (keyed invite + player) ────────────────
CREATE TABLE IF NOT EXISTS public.filmroom_viewer_player_links (
  invite_id uuid NOT NULL REFERENCES public.filmroom_parent_invites(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  relationship text CHECK (relationship IS NULL OR length(relationship) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, player_id)
);

-- ── Pending viewer connection requests (self-claim; never a grant) ────────────
CREATE TABLE IF NOT EXISTS public.filmroom_viewer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.filmroom_parent_invites(id) ON DELETE CASCADE,
  requested_player_name text NOT NULL CHECK (length(requested_player_name) BETWEEN 1 AND 120),
  relationship text CHECK (relationship IS NULL OR length(relationship) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, requested_player_name)
);

ALTER TABLE public.filmroom_viewer_player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filmroom_viewer_requests ENABLE ROW LEVEL SECURITY;
-- No direct browser access. All reads/writes go through service role or definer RPCs.
REVOKE ALL ON public.filmroom_viewer_player_links, public.filmroom_viewer_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filmroom_viewer_player_links, public.filmroom_viewer_requests TO service_role;

-- ── Shared viewer context resolver (verified email + accepted + team/owner) ────
-- Returns exactly one row when the current user is a verified, accepted member of
-- the game's team; no rows otherwise. SECURITY DEFINER with locked search_path.
CREATE OR REPLACE FUNCTION public.filmroom_viewer_context(p_game uuid)
RETURNS TABLE (invite_id uuid, team_id uuid, owner_id uuid, mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.team_id, i.owner_id, coalesce(t.viewer_stats_mode, 'private')
  FROM filmroom_parent_invites i
  JOIN teams t ON t.id = i.team_id AND t.owner_id = i.owner_id
  JOIN games g ON g.team_id = i.team_id AND g.owner_id = i.owner_id
  JOIN auth.users u ON u.id = auth.uid()
  WHERE i.accepted_by = u.id
    AND lower(u.email) = i.email
    AND u.email_confirmed_at IS NOT NULL
    AND g.id = p_game
  LIMIT 1
$$;

-- ── Access policy (replaces per-game shares) ──────────────────────────────────
-- film  -> any accepted verified member of the game's team.
-- stats -> mode='team', OR at least one approved same-team link for this viewer.
-- Unknown kinds fail loudly.
CREATE OR REPLACE FUNCTION public.filmroom_parent_access(p_game uuid, p_kind text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite uuid;
  v_team uuid;
  v_owner uuid;
  v_mode text;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('film', 'stats') THEN
    RAISE EXCEPTION 'Unknown access kind: %', p_kind;
  END IF;

  SELECT invite_id, team_id, owner_id, mode INTO v_invite, v_team, v_owner, v_mode
  FROM filmroom_viewer_context(p_game);

  IF v_invite IS NULL THEN
    RETURN false;
  END IF;

  IF p_kind = 'film' THEN
    RETURN true;
  END IF;

  -- p_kind = 'stats'
  IF v_mode = 'team' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM filmroom_viewer_player_links l
    JOIN players p ON p.id = l.player_id AND p.team_id = v_team AND p.owner_id = v_owner
    WHERE l.invite_id = v_invite
  );
END $$;

-- ── Library: all team games (existing + future), with scope labels ────────────
CREATE OR REPLACE FUNCTION public.filmroom_parent_library()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'invitations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'team', t.name,
        'team_id', i.team_id,
        'stats_mode', coalesce(t.viewer_stats_mode, 'private'),
        'accepted', coalesce(i.accepted_by = u.id, false),
        'expires_at', i.expires_at,
        'links', CASE WHEN i.accepted_by = u.id THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object('player_id',p.id,'name',p.name,'number',p.number,
            'relationship',l.relationship,'archived',p.archived_at IS NOT NULL) ORDER BY p.name)
          FROM filmroom_viewer_player_links l
          JOIN players p ON p.id=l.player_id AND p.team_id=i.team_id AND p.owner_id=i.owner_id
          WHERE l.invite_id=i.id
        ), '[]'::jsonb) ELSE '[]'::jsonb END,
        'requests', CASE WHEN i.accepted_by = u.id THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object('id',r.id,'requested_player_name',r.requested_player_name,
            'relationship',r.relationship) ORDER BY r.created_at)
          FROM filmroom_viewer_requests r WHERE r.invite_id=i.id
        ), '[]'::jsonb) ELSE '[]'::jsonb END))
      FROM filmroom_parent_invites i
      JOIN teams t ON t.id = i.team_id AND t.owner_id = i.owner_id
      JOIN auth.users u ON u.id = auth.uid()
        AND lower(u.email) = i.email AND u.email_confirmed_at IS NOT NULL
      WHERE i.accepted_by = u.id
         OR (i.accepted_by IS NULL AND i.expires_at > now())
    ), '[]'::jsonb),
    'games', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'opponent', g.opponent,
        'game_date', g.game_date,
        'team', t.name,
        'team_id', g.team_id,
        'stats_mode', coalesce(t.viewer_stats_mode, 'private'),
        'film', true,
        'stats', (coalesce(t.viewer_stats_mode, 'private') = 'team'
          OR EXISTS (SELECT 1 FROM filmroom_viewer_player_links l JOIN players p ON p.id=l.player_id AND p.team_id=i.team_id AND p.owner_id=i.owner_id WHERE l.invite_id = i.id)),
        'has_video', g.video_url IS NOT NULL)
        ORDER BY g.game_date DESC)
      FROM filmroom_parent_invites i
      JOIN teams t ON t.id = i.team_id AND t.owner_id = i.owner_id
      JOIN games g ON g.team_id = i.team_id AND g.owner_id = i.owner_id
      JOIN auth.users u ON u.id = auth.uid()
        AND lower(u.email) = i.email AND u.email_confirmed_at IS NOT NULL
      WHERE i.accepted_by = u.id
        AND coalesce(g.is_demo, false) = false
    ), '[]'::jsonb))
$$;

-- ── Stats: team mode = all; private mode = linked players only (no leakage) ────
-- Private mode filters to approved linked player_ids, which inherently excludes
-- NULL/opponent entries and other-roster totals. Archived (historical) players
-- are still included because filtering is by player_id, not roster status.
CREATE OR REPLACE FUNCTION public.filmroom_parent_stats(p_game uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite uuid;
  v_team uuid;
  v_owner uuid;
  v_mode text;
BEGIN
  IF NOT filmroom_parent_access(p_game, 'stats') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT invite_id, team_id, owner_id, mode INTO v_invite, v_team, v_owner, v_mode
  FROM filmroom_viewer_context(p_game);

  RETURN jsonb_build_object(
    'team_id', v_team,
    'stats_mode', v_mode,
    'scope', CASE WHEN v_mode = 'team' THEN 'team' ELSE 'linked' END,
    'entries', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'player_id', s.player_id,
        'player_name', coalesce(p.name, 'Opponent'),
        'player_number', p.number,
        'stat_type', s.stat_type,
        'video_time_ms', s.video_time_ms,
        'shot_x', s.shot_x,
        'shot_y', s.shot_y)
        ORDER BY s.video_time_ms)
      FROM stat_entries s
      JOIN games g ON g.id = s.game_id AND s.owner_id = g.owner_id
      LEFT JOIN players p ON p.id = s.player_id AND p.team_id = g.team_id AND p.owner_id = g.owner_id
      WHERE s.game_id = p_game
        AND (
          v_mode = 'team'
          OR s.player_id IN (
            SELECT l.player_id FROM filmroom_viewer_player_links l
            JOIN players lp ON lp.id=l.player_id AND lp.team_id=v_team AND lp.owner_id=v_owner
            WHERE l.invite_id = v_invite
          )
        )
    ), '[]'::jsonb));
END $$;

-- ── Box score: players list obeys the same scope ──────────────────────────────
-- Private mode exposes ONLY the viewer's linked players (including archived
-- historical players). Team mode exposes the full roster incl. archived history.
CREATE OR REPLACE FUNCTION public.filmroom_parent_box_score(p_game uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite uuid;
  v_team uuid;
  v_owner uuid;
  v_mode text;
BEGIN
  IF NOT filmroom_parent_access(p_game, 'stats') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT invite_id, team_id, owner_id, mode INTO v_invite, v_team, v_owner, v_mode
  FROM filmroom_viewer_context(p_game);

  RETURN jsonb_build_object(
    'team_id', v_team,
    'stats_mode', v_mode,
    'scope', CASE WHEN v_mode = 'team' THEN 'team' ELSE 'linked' END,
    'entries', (filmroom_parent_stats(p_game) -> 'entries'),
    'players', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'number', p.number,
        'archived', p.archived_at IS NOT NULL)
        ORDER BY p.number, p.name)
      FROM players p
      JOIN games g ON g.team_id = p.team_id AND g.owner_id = p.owner_id
      WHERE g.id = p_game
        AND (
          v_mode = 'team'
          OR p.id IN (
            SELECT l.player_id FROM filmroom_viewer_player_links l
            JOIN players lp ON lp.id=l.player_id AND lp.team_id=v_team AND lp.owner_id=v_owner
            WHERE l.invite_id = v_invite
          )
        )
    ), '[]'::jsonb));
END $$;

-- ── Clips: unchanged policy — parent_shared AND film membership ───────────────
CREATE OR REPLACE FUNCTION public.filmroom_parent_clips(p_game uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT filmroom_parent_access(p_game, 'film') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'title', c.title,
      'start_time_ms', c.start_time_ms, 'end_time_ms', c.end_time_ms, 'category', c.category)
      ORDER BY c.start_time_ms)
    FROM clips c
    JOIN games g ON g.id = c.game_id AND c.owner_id = g.owner_id AND c.team_id = g.team_id
    WHERE c.game_id = p_game AND c.parent_shared), '[]'::jsonb);
END $$;

-- ── Viewer self-claim request (records a request ONLY; never grants) ──────────
CREATE OR REPLACE FUNCTION public.filmroom_request_connection(
  p_invite uuid, p_name text, p_relationship text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'Player name is required';
  END IF;
  IF p_relationship IS NOT NULL AND length(p_relationship) > 40 THEN
    RAISE EXCEPTION 'Invalid relationship';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM filmroom_parent_invites i
    JOIN teams t ON t.id=i.team_id AND t.owner_id=i.owner_id
    JOIN auth.users u ON u.id = auth.uid()
    WHERE i.id = p_invite
      AND i.accepted_by = u.id
      AND lower(u.email) = i.email
      AND u.email_confirmed_at IS NOT NULL
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Invitation not accepted for this account';
  END IF;

  -- Idempotent: duplicate name requests for the same invite are no-ops.
  INSERT INTO filmroom_viewer_requests (invite_id, requested_player_name, relationship)
  VALUES (p_invite, trim(p_name), nullif(trim(p_relationship), ''))
  ON CONFLICT (invite_id, requested_player_name) DO NOTHING;
END $$;

-- ── Grants ────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION
  public.filmroom_viewer_context(uuid),
  public.filmroom_parent_access(uuid, text),
  public.filmroom_parent_library(),
  public.filmroom_parent_stats(uuid),
  public.filmroom_parent_box_score(uuid),
  public.filmroom_parent_clips(uuid),
  public.filmroom_request_connection(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.filmroom_parent_access(uuid, text),
  public.filmroom_parent_library(),
  public.filmroom_parent_stats(uuid),
  public.filmroom_parent_box_score(uuid),
  public.filmroom_parent_clips(uuid),
  public.filmroom_request_connection(uuid, text, text)
  TO authenticated;
-- filmroom_viewer_context is an internal helper: definer-only, no authenticated grant.

COMMIT;
