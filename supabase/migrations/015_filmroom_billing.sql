-- Apply before enabling billing. Enforcement starts OFF; live access is unchanged.
begin;
create table public.filmroom_billing_settings (id boolean primary key default true check(id), enabled boolean not null default false, demo_video_url text);
insert into public.filmroom_billing_settings(id) values(true);
create table public.filmroom_subscriptions (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 customer_id text unique,
 subscription_id text unique,
 status text not null default 'none',
 paid_until timestamptz,
 complimentary boolean not null default false,
 checkout_key uuid not null default gen_random_uuid(),
 checkout_session_id text,
 checkout_lease uuid,
 checkout_locked_until timestamptz,
 synced_at timestamptz not null default '-infinity'
);
create table public.filmroom_video_assets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 game_id uuid references public.games(id) on delete set null,
 r2_key text not null unique,
 upload_id text,
 bytes bigint not null check(bytes>0),
 state text not null default 'reserved' check(state in ('reserved','stored','cleanup')),
 created_at timestamptz not null default now()
);
alter table public.games add column is_demo boolean not null default false;
alter table public.games add column video_bytes bigint check(video_bytes>=0);
create unique index filmroom_one_demo_per_owner on public.games(owner_id) where is_demo;
alter table public.filmroom_billing_settings enable row level security;
alter table public.filmroom_subscriptions enable row level security;
alter table public.filmroom_video_assets enable row level security;
revoke all on public.filmroom_billing_settings,public.filmroom_subscriptions,public.filmroom_video_assets from public,anon,authenticated;
grant all on public.filmroom_billing_settings,public.filmroom_subscriptions,public.filmroom_video_assets to service_role;
grant select on public.filmroom_subscriptions,public.filmroom_video_assets to authenticated;
create policy own_subscription on public.filmroom_subscriptions for select to authenticated using(owner_id=auth.uid());
create policy own_assets on public.filmroom_video_assets for select to authenticated using(owner_id=auth.uid());
-- Do not grant client writes to is_demo or video_bytes.
create function public.filmroom_require_paid(p_owner uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not coalesce((select enabled from filmroom_billing_settings where id),false) then return;end if;
 if not exists(select 1 from filmroom_subscriptions where owner_id=p_owner and (complimentary or (status='active' and paid_until>now()))) then raise exception 'SUBSCRIPTION_REQUIRED' using errcode='P0001';end if;
end;$$;
revoke all on function public.filmroom_require_paid(uuid) from public,anon,authenticated;
grant execute on function public.filmroom_require_paid(uuid) to service_role;
create function public.filmroom_game_limit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.is_demo then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,17));
 perform filmroom_require_paid(new.owner_id);
 if (select enabled from filmroom_billing_settings where id) and (select count(*) from games where owner_id=new.owner_id and not is_demo)>=50 then raise exception 'GAME_LIMIT_REACHED';end if;
 return new;
end;$$;
create trigger filmroom_game_limit before insert on public.games for each row execute function public.filmroom_game_limit();
create function public.filmroom_asset_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare used bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,17));
 if tg_op='INSERT' then
  perform filmroom_require_paid(new.owner_id);
  if not exists(select 1 from games where id=new.game_id and owner_id=new.owner_id and not is_demo) then raise exception 'INVALID_UPLOAD_GAME';end if;
 end if;
 select coalesce(sum(bytes),0) into used from filmroom_video_assets where owner_id=new.owner_id and id<>new.id;
 if (select enabled from filmroom_billing_settings where id) and used+new.bytes>500000000000 then raise exception 'STORAGE_LIMIT_REACHED';end if;
 return new;
end;$$;
create trigger filmroom_asset_limit before insert or update of bytes on public.filmroom_video_assets for each row execute function public.filmroom_asset_limit();
-- Keep physical storage charged until cleanup succeeds, including deleted/replaced games.
create function public.filmroom_queue_video_cleanup() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' and old.is_demo and exists(select 1 from auth.users where id=old.owner_id) then raise exception 'DEMO_CANNOT_BE_DELETED';end if;
 if tg_op='DELETE' then update filmroom_video_assets set state='cleanup' where game_id=old.id;return old;end if;
 if old.video_url is distinct from new.video_url then
  update filmroom_video_assets set state='cleanup' where game_id=new.id and state='stored' and r2_key is distinct from (select r2_key from upload_sessions where id=new.active_upload_session);
 end if;return new;
end;$$;
create trigger filmroom_queue_video_cleanup before delete or update of video_url on public.games for each row execute function public.filmroom_queue_video_cleanup();
-- Webhook updates may arrive out of order; only the newest reconciliation wins.
create function public.filmroom_sync_subscription(p_owner uuid,p_customer text,p_subscription text,p_status text,p_until timestamptz,p_observed timestamptz) returns void language sql security definer set search_path=public as $$
 update filmroom_subscriptions set subscription_id=p_subscription,status=p_status,paid_until=p_until,synced_at=p_observed where owner_id=p_owner and customer_id=p_customer and synced_at<p_observed;
$$;
revoke all on function public.filmroom_sync_subscription(uuid,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.filmroom_sync_subscription(uuid,text,text,text,timestamptz,timestamptz) to service_role;
-- Final attachment and storage accounting are one transaction. Cleanup cannot be reattached.
create function public.filmroom_attach_upload(p_owner uuid,p_session uuid,p_bytes bigint,p_url text) returns void language plpgsql security definer set search_path=public as $$
declare s upload_sessions; a filmroom_video_assets;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,17));
 select * into s from upload_sessions where id=p_session and owner_id=p_owner for update;
 if s.id is null or s.status not in ('in_progress','complete_pending_attach','complete') then raise exception 'INVALID_UPLOAD_SESSION';end if;
 select * into a from filmroom_video_assets where r2_key=s.r2_key and owner_id=p_owner for update;
 if a.id is null or a.state='cleanup' then raise exception 'INVALID_UPLOAD_ASSET';end if;
 if p_bytes<>s.expected_size or p_bytes<>a.bytes then raise exception 'UPLOAD_SIZE_MISMATCH';end if;
 update games set video_url=p_url,video_id=null,video_bytes=p_bytes where id=s.game_id and owner_id=p_owner and active_upload_session=p_session and not is_demo;
 if not found then raise exception 'UPLOAD_SUPERSEDED';end if;
 update filmroom_video_assets set state='stored' where id=a.id;
 update upload_sessions set status='complete',updated_at=now() where id=p_session;
end;$$;
revoke all on function public.filmroom_attach_upload(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.filmroom_attach_upload(uuid,uuid,bigint,text) to service_role;
revoke all on function public.filmroom_game_limit(),public.filmroom_asset_limit(),public.filmroom_queue_video_cleanup() from public,anon,authenticated;
-- The source is configured by the operator only after distribution rights are confirmed.
create function public.filmroom_provision_demo() returns uuid language plpgsql security definer set search_path=public as $$
declare who uuid:=auth.uid(); team uuid; game uuid; source text; provisioned jsonb;
begin
 if who is null then raise exception 'Not authenticated';end if;
 if not (select enabled from filmroom_billing_settings where id) then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,17));
 select id into game from games where owner_id=who and is_demo;
 if game is not null then return game;end if;
 select demo_video_url into source from filmroom_billing_settings where id;
 if source is null then raise exception 'DEMO_NOT_CONFIGURED';end if;
 select id into team from teams where owner_id=who order by created_at limit 1;
 if team is null then
  provisioned:=provision_default_library('My Team',extract(year from now())::text,'basketball');
  team:=(provisioned->>'team_id')::uuid;
 end if;
 insert into games(team_id,owner_id,opponent,game_date,is_demo,video_url,video_bytes,notes)
 values(team,who,'Demo — Try Film Room',current_date,true,source,0,'Practice drawing, tagging stats, and making clips. Your changes are private to your account.') returning id into game;
 return game;
end;$$;
revoke all on function public.filmroom_provision_demo() from public,anon;
grant execute on function public.filmroom_provision_demo() to authenticated;
create function public.filmroom_claim_checkout(p_owner uuid,p_lease uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare result filmroom_subscriptions;
begin
 update filmroom_subscriptions set checkout_lease=p_lease,checkout_locked_until=now()+interval '2 minutes'
 where owner_id=p_owner and customer_id is not null and (checkout_locked_until is null or checkout_locked_until<now()) returning * into result;
 if result.owner_id is null then raise exception 'CHECKOUT_BUSY';end if;
 return jsonb_build_object('checkout_key',result.checkout_key,'checkout_session_id',result.checkout_session_id);
end;$$;
revoke all on function public.filmroom_claim_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.filmroom_claim_checkout(uuid,uuid) to service_role;
commit;
