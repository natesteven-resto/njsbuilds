-- Optimized renditions are separate from the original game video. No client grants.
create table public.filmroom_playback_assets (
 id uuid primary key default gen_random_uuid(),
 game_id uuid references public.games(id) on delete set null,
 owner_id uuid not null,
 source_url text not null,
 stream_id text unique,
 state text not null default 'submitting' check(state in ('submitting','processing','ready','failed','cleanup')),
 progress integer not null default 0 check(progress between 0 and 100),
 created_at timestamptz not null default now(),
 checked_at timestamptz not null default now(),
 unique(game_id,source_url)
);
alter table public.filmroom_playback_assets enable row level security;
revoke all on public.filmroom_playback_assets from anon,authenticated;
grant all on public.filmroom_playback_assets to service_role;
create index filmroom_playback_cleanup on public.filmroom_playback_assets(state,checked_at);

-- Also handles direct RLS deletes, team cascades, and a replacement racing the encoder.
create function public.filmroom_playback_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.game_id is null or not exists(select 1 from games where id=new.game_id and owner_id=new.owner_id and video_url=new.source_url) then new.state='cleanup'; end if;
 return new;
end $$;
create trigger filmroom_playback_guard before insert or update on public.filmroom_playback_assets for each row execute function public.filmroom_playback_guard();
create function public.filmroom_detach_playback() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.video_url is distinct from old.video_url then
  update filmroom_playback_assets set state='cleanup' where game_id=new.id and source_url is distinct from new.video_url;
 end if;
 return new;
end $$;
create trigger filmroom_detach_playback after update of video_url on public.games for each row execute function public.filmroom_detach_playback();

-- Exactly one requester may submit this source. Unknown upstream outcomes are reconciled,
-- never resubmitted blindly. Failed copies must be explicitly removed before retrying.
create function public.filmroom_claim_playback(p_game uuid,p_owner uuid,p_source text) returns setof public.filmroom_playback_assets language plpgsql security definer set search_path=public as $$
begin
 perform 1 from games where id=p_game and owner_id=p_owner and video_url=p_source for update;
 if not found then raise exception 'Video changed'; end if;
 return query insert into filmroom_playback_assets(game_id,owner_id,source_url) values(p_game,p_owner,p_source) on conflict(game_id,source_url) do nothing returning *;
end $$;
revoke all on function public.filmroom_claim_playback(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.filmroom_claim_playback(uuid,uuid,text) to service_role;
revoke all on function public.filmroom_playback_guard(),public.filmroom_detach_playback() from public,anon,authenticated;
