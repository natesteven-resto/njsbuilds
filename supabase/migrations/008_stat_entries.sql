-- Stat Entries
-- Individual, timestamped stat events tagged to video timestamps.
-- Replaces the aggregate-only approach for the Film Room stat entry system.

create table if not exists public.stat_entries (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  stat_type text not null check (stat_type in ('PTS','REB','AST','STL','BLK','TO','2M','3M','FT')),
  video_time_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stat_entries_game_id_idx on public.stat_entries(game_id);
create index if not exists stat_entries_player_id_idx on public.stat_entries(player_id);

alter table public.stat_entries enable row level security;
create policy "stat_entries_open" on public.stat_entries for all using (true) with check (true);
grant all on public.stat_entries to anon, authenticated;
