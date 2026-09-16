-- Additive coaching workspace metadata; existing ownership policies remain in force.
begin;
alter table public.games add column if not exists season_label text;
alter table public.games add column if not exists session_type text not null default 'game' check (session_type in ('game','practice','scouting'));
alter table public.games add column if not exists last_watched_at timestamptz;
alter table public.games add column if not exists review_meta jsonb not null default '{"bookmarks":[]}'::jsonb;
alter table public.playlists add column if not exists session_plan jsonb not null default '{"objective":"","sections":[]}'::jsonb;
create or replace function public.filmroom_clip_counts()
returns table(game_id uuid, clip_count bigint, highlight_count bigint)
language sql stable security invoker set search_path = public as $$
 select c.game_id, count(*), count(*) filter (where c.is_highlight)
 from public.clips c where c.owner_id = auth.uid() group by c.game_id;
$$;
revoke all on function public.filmroom_clip_counts() from public, anon;
grant execute on function public.filmroom_clip_counts() to authenticated;
commit;
