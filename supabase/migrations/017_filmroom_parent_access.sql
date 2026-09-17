-- Parent access is opt-in per invitation and per game. Existing owner RLS stays intact.
BEGIN;
CREATE TABLE public.filmroom_parent_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
 email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 254),
 accepted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
 UNIQUE(team_id,email)
);
CREATE TABLE public.filmroom_parent_shares (
 invite_id uuid NOT NULL REFERENCES public.filmroom_parent_invites(id) ON DELETE CASCADE,
 game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
 film boolean NOT NULL DEFAULT false,
 stats boolean NOT NULL DEFAULT false,
 PRIMARY KEY(invite_id,game_id), CHECK (film OR stats)
);
ALTER TABLE public.filmroom_parent_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filmroom_parent_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.filmroom_parent_invites, public.filmroom_parent_shares FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.filmroom_parent_invites, public.filmroom_parent_shares TO service_role;
-- No direct browser grants. These RPCs use verified auth.users email, never user-editable metadata.
CREATE FUNCTION public.filmroom_parent_access(p_game uuid, p_kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM filmroom_parent_invites i
 JOIN filmroom_parent_shares s ON s.invite_id=i.id
 JOIN games g ON g.id=s.game_id AND g.team_id=i.team_id AND g.owner_id=i.owner_id
 JOIN teams t ON t.id=i.team_id AND t.owner_id=i.owner_id
 JOIN auth.users u ON u.id=auth.uid()
 WHERE i.accepted_by=u.id AND lower(u.email)=i.email AND u.email_confirmed_at IS NOT NULL
 AND s.game_id=p_game AND ((p_kind='film' AND s.film) OR (p_kind='stats' AND s.stats)))
$$;
CREATE FUNCTION public.filmroom_accept_parent_invite(p_invite uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE filmroom_parent_invites i SET accepted_by=auth.uid(),accepted_at=now()
 FROM auth.users u, teams t
 WHERE i.id=p_invite AND u.id=auth.uid() AND lower(u.email)=i.email
 AND u.email_confirmed_at IS NOT NULL AND t.id=i.team_id AND t.owner_id=i.owner_id
 AND ((i.accepted_by IS NULL AND i.expires_at>now()) OR i.accepted_by=u.id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable or email does not match'; END IF;
END $$;
CREATE FUNCTION public.filmroom_parent_library() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('invitations',coalesce((
 SELECT jsonb_agg(jsonb_build_object('id',i.id,'team',t.name,'accepted',i.accepted_by=u.id,'expires_at',i.expires_at))
 FROM filmroom_parent_invites i JOIN teams t ON t.id=i.team_id AND t.owner_id=i.owner_id
 JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=i.email AND u.email_confirmed_at IS NOT NULL
 WHERE i.accepted_by=u.id OR (i.accepted_by IS NULL AND i.expires_at>now())
 ),'[]'::jsonb),'games',coalesce((
 SELECT jsonb_agg(jsonb_build_object('id',g.id,'opponent',g.opponent,'game_date',g.game_date,'team',t.name,
 'film',s.film,'stats',s.stats,'has_video',g.video_url IS NOT NULL))
 FROM filmroom_parent_invites i JOIN filmroom_parent_shares s ON s.invite_id=i.id
 JOIN games g ON g.id=s.game_id AND g.team_id=i.team_id AND g.owner_id=i.owner_id
 JOIN teams t ON t.id=i.team_id AND t.owner_id=i.owner_id
 JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=i.email AND u.email_confirmed_at IS NOT NULL
 WHERE i.accepted_by=u.id
 ),'[]'::jsonb))
$$;
CREATE FUNCTION public.filmroom_parent_stats(p_game uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT filmroom_parent_access(p_game,'stats') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'player_id',s.player_id,
 'player_name',coalesce(p.name,'Opponent'),'player_number',p.number,'stat_type',s.stat_type,'video_time_ms',s.video_time_ms)
 ORDER BY s.video_time_ms)
 FROM stat_entries s JOIN games g ON g.id=s.game_id AND s.owner_id=g.owner_id
 LEFT JOIN players p ON p.id=s.player_id AND p.team_id=g.team_id AND p.owner_id=g.owner_id
 WHERE s.game_id=p_game),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.filmroom_parent_access(uuid,text),public.filmroom_accept_parent_invite(uuid),public.filmroom_parent_library(),public.filmroom_parent_stats(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.filmroom_parent_access(uuid,text),public.filmroom_accept_parent_invite(uuid),public.filmroom_parent_library(),public.filmroom_parent_stats(uuid) TO authenticated;
COMMIT;
