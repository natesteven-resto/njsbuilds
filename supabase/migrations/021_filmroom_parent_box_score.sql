BEGIN;
CREATE OR REPLACE FUNCTION public.filmroom_parent_box_score(p_game uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT filmroom_parent_access(p_game,'stats') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN jsonb_build_object('entries',filmroom_parent_stats(p_game),'players',coalesce((
  SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'number',p.number) ORDER BY p.number,p.name)
  FROM players p JOIN games g ON g.team_id=p.team_id AND g.owner_id=p.owner_id WHERE g.id=p_game
 ),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.filmroom_parent_box_score(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.filmroom_parent_box_score(uuid) TO authenticated;
COMMIT;
