-- Migration 022: Soft-archive players instead of hard delete
-- Adds archived_at timestamp. FK references from stat_entries and clip_players
-- remain intact. Archived players are excluded from active roster queries by
-- the server but their historical stats and clip associations stay valid.
-- NEVER apply to production without a coordinated deploy + server update.

BEGIN;

ALTER TABLE players ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_players_archived_at ON players (archived_at) WHERE archived_at IS NULL;

COMMIT;
