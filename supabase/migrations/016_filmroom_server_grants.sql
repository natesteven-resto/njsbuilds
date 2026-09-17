-- Server routes verify identity and ownership before using service_role.
-- BYPASSRLS does not grant table access; fresh databases need explicit DML grants.
-- Keep browser roles and their column-level permissions unchanged.
begin;
grant select, insert, update, delete on table
 public.coaches, public.teams, public.players, public.games,
 public.clips, public.clip_players, public.clip_comments,
 public.player_stats, public.stat_clips, public.stat_entries,
 public.upload_sessions, public.playlists, public.playlist_clips
 to service_role;
commit;
