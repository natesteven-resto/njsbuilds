-- Supabase projects can grant EXECUTE to authenticated through default privileges.
-- This helper is called only inside the owner-executed Viewer RPCs.
BEGIN;
REVOKE ALL ON FUNCTION public.filmroom_viewer_context(uuid) FROM authenticated;
COMMIT;
