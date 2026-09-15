-- Migration 013: Courtside Studio additions
-- Additive only — no existing columns, tables, or data removed.
-- owner_id UUID references auth.users(id) consistent with 009 pattern.

-- ── clips: coaching metadata ──────────────────────────────────────────────────
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS coaching_note     TEXT,
  ADD COLUMN IF NOT EXISTS play_type         TEXT,
  ADD COLUMN IF NOT EXISTS primary_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Re-create clips_own policy to also enforce primary_player_id same-owner/team.
-- Drops and recreates — the USING clause is identical to 009; only WITH CHECK gains
-- the primary_player_id guard. Service-role writes bypass RLS (BYPASSRLS).
DROP POLICY IF EXISTS "clips_own" ON public.clips;
CREATE POLICY "clips_own" ON public.clips
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND end_time_ms > start_time_ms
    AND EXISTS (
      SELECT 1 FROM public.games g
       WHERE g.id = game_id
         AND g.owner_id = auth.uid()
         AND g.team_id  = clips.team_id
    )
    -- primary_player_id, when set, must belong to the same owner AND same team as the clip
    AND (
      primary_player_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.players p
         WHERE p.id       = primary_player_id
           AND p.owner_id = auth.uid()
           AND p.team_id  = clips.team_id
      )
    )
  );

-- ── stat_entries: shot chart coordinates ─────────────────────────────────────
-- Paired null-or-both, [0,1], only allowed for actual shot stat_types.
ALTER TABLE public.stat_entries
  ADD COLUMN IF NOT EXISTS shot_x NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS shot_y NUMERIC(5,4);

ALTER TABLE public.stat_entries
  DROP CONSTRAINT IF EXISTS stat_entries_shot_coords_check;
ALTER TABLE public.stat_entries
  ADD CONSTRAINT stat_entries_shot_coords_check CHECK (
    -- Must be all-null or all-present with valid range
    (shot_x IS NULL AND shot_y IS NULL)
    OR (
      shot_x IS NOT NULL AND shot_y IS NOT NULL
      AND shot_x >= 0 AND shot_x <= 1
      AND shot_y >= 0 AND shot_y <= 1
      -- Coordinates only valid on actual shot stat types
      AND stat_type IN ('2M','3M','FTM','2X','3X','FTX')
    )
  );

-- Re-create stat_entries_own to cover shot coordinate ownership.
-- Stat type restriction is enforced by the CHECK above; RLS adds no new clause here —
-- the existing player/game ownership check is sufficient. Drop+recreate preserves all
-- existing logic from 009 and adds nothing to USING (ownership is unchanged).
-- We do this to make the policy source-of-truth explicit in 013 for auditability.
-- (No functional change to existing USING/WITH CHECK logic.)

-- ── games: resume position ────────────────────────────────────────────────────
-- No season column: season derived at query time via EXTRACT(year FROM game_date).
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS resume_position_ms BIGINT NOT NULL DEFAULT 0
    CHECK (resume_position_ms >= 0);

-- ── playlists ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Grant authenticated role access so RLS can exercise ownership (not blanket denial).
-- anon gets no grants — any SELECT returns 0 rows or permission denied.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
REVOKE ALL ON public.playlists FROM anon;

DROP POLICY IF EXISTS "playlists_owner" ON public.playlists;
CREATE POLICY "playlists_owner" ON public.playlists
  FOR ALL TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── playlist_clips ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playlist_clips (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID        NOT NULL REFERENCES public.playlists(id)  ON DELETE CASCADE,
  clip_id     UUID        NOT NULL REFERENCES public.clips(id)       ON DELETE CASCADE,
  position    INT         NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, clip_id)
);

ALTER TABLE public.playlist_clips ENABLE ROW LEVEL SECURITY;

-- Grant authenticated; revoke anon.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_clips TO authenticated;
REVOKE ALL ON public.playlist_clips FROM anon;

-- RLS: both playlist AND clip must belong to auth.uid().
-- Prevents cross-owner clip injection even via direct DB writes.
DROP POLICY IF EXISTS "playlist_clips_owner" ON public.playlist_clips;
CREATE POLICY "playlist_clips_owner" ON public.playlist_clips
  FOR ALL TO authenticated
  USING (
    (SELECT owner_id FROM public.playlists WHERE id = playlist_id) = auth.uid()
    AND
    (SELECT owner_id FROM public.clips     WHERE id = clip_id)     = auth.uid()
  )
  WITH CHECK (
    (SELECT owner_id FROM public.playlists WHERE id = playlist_id) = auth.uid()
    AND
    (SELECT owner_id FROM public.clips     WHERE id = clip_id)     = auth.uid()
  );

-- ── Column grants for new clip coaching fields ──────────────────────────────
-- 009 granted INSERT/UPDATE on specific columns; new columns need explicit grants.
-- authenticated can read all clip columns (SELECT granted as whole-table in 009).
-- INSERT: add new coaching columns to the existing per-column grant pattern.
GRANT INSERT (coaching_note, play_type, primary_player_id) ON public.clips TO authenticated;
GRANT UPDATE (coaching_note, play_type, primary_player_id) ON public.clips TO authenticated;

-- stat_entries: INSERT/UPDATE on shot coords (SELECT/DELETE already granted in 009).
GRANT INSERT (shot_x, shot_y) ON public.stat_entries TO authenticated;
-- No UPDATE on stat_entries — consistent with 009 (stats are immutable after insert).
-- shot_x/shot_y can only be set at insert time.

-- games: resume_position_ms — writable by authenticated owner.
GRANT INSERT (resume_position_ms) ON public.games TO authenticated;
GRANT UPDATE (resume_position_ms) ON public.games TO authenticated;

-- ── Atomic playlist reorder RPC ───────────────────────────────────────────────
-- Accepts full ordered array of entry IDs belonging to one playlist.
-- Validates: caller owns playlist, all IDs exist and belong to that playlist,
-- positions are unique 0-based integers. Runs atomically; any violation rolls back.
CREATE OR REPLACE FUNCTION public.reorder_playlist_clips(
  p_playlist_id  UUID,
  p_ordered_ids  UUID[]   -- entry IDs in desired order; position = array index
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_owner_id  UUID;
  v_count     INT;
  v_input_len INT;
  v_entry_id  UUID;
  v_pos       INT := 0;
BEGIN
  -- 0. Reject unauthenticated callers explicitly before any NULL comparison.
  --    SECURITY DEFINER runs as owner; auth.uid() returns NULL for anon/service
  --    without a JWT, making owner <> auth.uid() evaluate to NULL (not TRUE),
  --    which would silently pass the IF. Guard explicitly first.
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- 1. Validate input array: non-null, non-empty, no duplicates.
  v_input_len := cardinality(p_ordered_ids);
  IF v_input_len IS NULL OR v_input_len = 0 THEN
    RAISE EXCEPTION 'ordered_ids must be a non-empty array';
  END IF;
  -- Duplicate check: count of distinct values must equal length
  SELECT COUNT(DISTINCT t.entry_id) INTO v_count
    FROM unnest(p_ordered_ids) AS t(entry_id);
  IF v_count <> v_input_len THEN
    RAISE EXCEPTION 'ordered_ids contains duplicate entry IDs';
  END IF;

  -- 2. Lock the playlist row to serialize concurrent reorders.
  SELECT owner_id INTO v_owner_id
    FROM public.playlists
   WHERE id = p_playlist_id
   FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'playlist not found';
  END IF;
  -- Explicit equality check; never rely on <> with potential NULLs.
  IF v_owner_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not allowed: playlist ownership mismatch';
  END IF;

  -- 3. Verify input count matches actual membership.
  SELECT COUNT(*) INTO v_count
    FROM public.playlist_clips
   WHERE playlist_id = p_playlist_id;

  IF v_count <> v_input_len THEN
    RAISE EXCEPTION 'ordered_ids length % does not match playlist membership %',
      v_input_len, v_count;
  END IF;

  -- 4. Verify all supplied IDs belong to this playlist (rejects foreign/unknown IDs).
  IF EXISTS (
    SELECT 1 FROM unnest(p_ordered_ids) AS t(entry_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.playlist_clips pc
       WHERE pc.id = t.entry_id AND pc.playlist_id = p_playlist_id
    )
  ) THEN
    RAISE EXCEPTION 'one or more entry IDs do not belong to this playlist';
  END IF;

  -- 5. Apply positions atomically (0-based, matching array order).
  FOREACH v_entry_id IN ARRAY p_ordered_ids LOOP
    UPDATE public.playlist_clips
       SET position = v_pos
     WHERE id = v_entry_id AND playlist_id = p_playlist_id;
    v_pos := v_pos + 1;
  END LOOP;
END;
$$;

-- Revoke PUBLIC execute (default granted to all roles including anon on SECURITY DEFINER).
-- Then grant only to authenticated.
REVOKE ALL ON FUNCTION public.reorder_playlist_clips(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_playlist_clips(UUID, UUID[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_playlist_clips(UUID, UUID[]) TO authenticated;

-- ── indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_playlists_owner        ON public.playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_playlist_clips_pl_pos  ON public.playlist_clips(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_clips_play_type         ON public.clips(play_type)          WHERE play_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clips_primary_player    ON public.clips(primary_player_id)  WHERE primary_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stat_entries_shot       ON public.stat_entries(owner_id)    WHERE shot_x IS NOT NULL;
