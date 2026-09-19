BEGIN;
-- Existing clips remain private until their owner explicitly shares them.
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS parent_shared boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.filmroom_parent_clips(p_game uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT filmroom_parent_access(p_game,'film') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,
 'start_time_ms',c.start_time_ms,'end_time_ms',c.end_time_ms,'category',c.category)
 ORDER BY c.start_time_ms)
 FROM clips c JOIN games g ON g.id=c.game_id AND c.owner_id=g.owner_id AND c.team_id=g.team_id
 WHERE c.game_id=p_game AND c.parent_shared),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.filmroom_parent_clips(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.filmroom_parent_clips(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.filmroom_parent_stats(p_game uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT filmroom_parent_access(p_game,'stats') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'player_id',s.player_id,
 'player_name',coalesce(p.name,'Opponent'),'player_number',p.number,'stat_type',s.stat_type,
 'video_time_ms',s.video_time_ms,'shot_x',s.shot_x,'shot_y',s.shot_y) ORDER BY s.video_time_ms)
 FROM stat_entries s JOIN games g ON g.id=s.game_id AND s.owner_id=g.owner_id
 LEFT JOIN players p ON p.id=s.player_id AND p.team_id=g.team_id AND p.owner_id=g.owner_id
 WHERE s.game_id=p_game),'[]'::jsonb);
END $$;
COMMIT;
