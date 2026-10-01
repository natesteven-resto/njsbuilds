-- Migration 023: Revoke authenticated hard-delete on players.
-- After migration 022 (soft-archive via archived_at), direct DELETE by authenticated
-- users is no longer needed. The server archive route (DELETE /api/filmroom/players/[id])
-- sets archived_at via the service role, not the authenticated role.
-- Restore is also service-role only (PATCH { restore: true }).
--
-- Direct DELETE remains available to the service_role (BYPASSRLS) for admin operations.
-- Historical stat_entries and clip_players FKs are ON DELETE RESTRICT/ON DELETE CASCADE
-- as defined in earlier migrations; this grant change does not affect those constraints.
--
-- NEVER apply to production without a coordinated server deploy confirming all
-- archive/restore operations go through the service-role API.

BEGIN;

REVOKE DELETE ON public.players FROM authenticated;

COMMIT;
