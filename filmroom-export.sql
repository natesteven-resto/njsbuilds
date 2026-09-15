-- Film Room selective export
-- Source: suhfyckmuenjskitrzlq.supabase.co  (read-only — no source writes)
-- Generated: 2026-09-15T05:38:28.968Z
-- Rows: coaches=1 teams=1 games=2 players=5 clips=1 stat_entries=19
-- R2 keys: filmroom-videos/games/e2f0285d-7767-4ee9-b4fa-5a509c25e9d3/1789091674465-2026-07-31_19_54_53.MP4, games/f18b6f3a-6472-4d01-9815-97c90b75d382/1789441470476-2026-09-13_14_38_16.MP4
-- owner_id/auth_user_id/author_id = NULL; assigned by migration 010 after owner signup
-- text[] arrays: ARRAY[...] literals  |  jsonb: ::jsonb cast  |  ON CONFLICT DO NOTHING

BEGIN;

-- coaches: 1 row
INSERT INTO public.coaches (id, email, name, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'test@filmroom.dev', 'Coach Stevens', '2026-09-10T21:41:14.296889+00:00') ON CONFLICT DO NOTHING;

-- teams: 1 row
INSERT INTO public.teams (id, coach_id, name, season, sport, created_at) VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Varsity Boys', '2025-26', 'basketball', '2026-09-10T21:41:14.296889+00:00') ON CONFLICT DO NOTHING;

-- players: 5 rows
INSERT INTO public.players (id, team_id, name, number, position, parent_email, created_at) VALUES ('31274e25-5b91-4c83-ab63-e363ead6d483', '00000000-0000-0000-0000-000000000010', 'Brett Steven', 22, 'PG', NULL, '2026-09-11T00:53:48.702559+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.players (id, team_id, name, number, position, parent_email, created_at) VALUES ('48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', '00000000-0000-0000-0000-000000000010', 'Noah Steven', 24, 'SG', NULL, '2026-09-11T00:53:37.949753+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.players (id, team_id, name, number, position, parent_email, created_at) VALUES ('6b27a336-9e98-405d-8b82-94d5d1789738', '00000000-0000-0000-0000-000000000010', 'Jaax Pauly', 31, 'C', NULL, '2026-09-11T00:55:24.257217+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.players (id, team_id, name, number, position, parent_email, created_at) VALUES ('75788f4a-8e23-4c0a-998b-e1be760f1929', '00000000-0000-0000-0000-000000000010', 'Joe Husband', 3, 'SG', NULL, '2026-09-11T00:56:02.993065+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.players (id, team_id, name, number, position, parent_email, created_at) VALUES ('8d5a30d3-2c81-458a-a59d-6e351874326e', '00000000-0000-0000-0000-000000000010', 'Cash Fitzmier', 2, 'SG', NULL, '2026-09-11T00:55:39.280456+00:00') ON CONFLICT DO NOTHING;

-- games: 2 rows
INSERT INTO public.games (id, team_id, opponent, game_date, location, video_url, video_id, thumbnail_url, notes, created_at) VALUES ('e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '00000000-0000-0000-0000-000000000010', 'SBA 2033 vs Colorado', '2026-06-27', NULL, 'https://108ae2b237d537d16e57f93a1a13444f.r2.cloudflarestorage.com/filmroom-videos/games/e2f0285d-7767-4ee9-b4fa-5a509c25e9d3/1789091674465-2026-07-31_19_54_53.MP4', NULL, NULL, NULL, '2026-09-11T00:23:39.713242+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.games (id, team_id, opponent, game_date, location, video_url, video_id, thumbnail_url, notes, created_at) VALUES ('f18b6f3a-6472-4d01-9815-97c90b75d382', '00000000-0000-0000-0000-000000000010', 'Tryouts', '2026-09-13', NULL, 'https://pub-9fa275ba678642e488776c297174f037.r2.dev/games/f18b6f3a-6472-4d01-9815-97c90b75d382/1789441470476-2026-09-13_14_38_16.MP4', NULL, NULL, NULL, '2026-09-14T01:19:15.434565+00:00') ON CONFLICT DO NOTHING;

-- clips: 1 row
INSERT INTO public.clips (id, game_id, team_id, start_time_ms, end_time_ms, title, tags, category, is_highlight, drawing_data, created_at) VALUES ('23cc7b42-727a-45e4-82bd-43d7715b60df', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '00000000-0000-0000-0000-000000000010', 28305, 30983, 'Need to screen correctly and jaax get to short corner.', ARRAY[]::text[], 'offense', FALSE, NULL, '2026-09-11T02:56:24.378502+00:00') ON CONFLICT DO NOTHING;

-- clip_players: 1 row
INSERT INTO public.clip_players (clip_id, player_id) VALUES ('23cc7b42-727a-45e4-82bd-43d7715b60df', '6b27a336-9e98-405d-8b82-94d5d1789738') ON CONFLICT DO NOTHING;

-- clip_comments: 0 rows

-- stat_entries: 19 rows
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('0f2df58b-0aaf-488d-b1e1-a933a0b81197', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', 'DREB', 5000, '2026-09-11T03:17:18.350395+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('2dacc19a-22aa-4810-bcfa-ef95aab5926a', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', NULL, 'DREB', 39578, '2026-09-11T14:59:25.556087+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('3099e3a0-6d76-4849-9a6a-3eaf44ad471a', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', '2M', 28413, '2026-09-11T02:17:28.030666+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('3c787fb8-4ab2-4115-8ce6-45c81af08a43', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', '2X', 6178, '2026-09-11T03:28:29.532862+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('3f5c2779-970d-4c9b-8f7d-243110b7fa76', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '8d5a30d3-2c81-458a-a59d-6e351874326e', '2M', 607481, '2026-09-11T04:37:15.525562+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('458b610a-7817-4673-bd3c-63025c737c31', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '75788f4a-8e23-4c0a-998b-e1be760f1929', '3X', 1215135, '2026-09-11T04:30:46.507505+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('86af2151-4f8b-488a-a914-65f936030dcc', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', 'PTS', 40391, '2026-09-11T03:02:04.260417+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('8a24f548-d4d9-44d2-a4d5-0d792ed957d0', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '31274e25-5b91-4c83-ab63-e363ead6d483', '2M', 40391, '2026-09-11T03:02:48.599723+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('8e5d1d02-ab07-4498-aced-6b3b1fdda87a', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', '3M', 918700, '2026-09-11T03:55:17.114612+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('9123defd-49dd-44d0-8483-602560fa6cdc', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '31274e25-5b91-4c83-ab63-e363ead6d483', '2M', 691955, '2026-09-11T04:06:33.676475+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('a110ac7d-1f88-4dce-becd-9a4f07cde88a', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '8d5a30d3-2c81-458a-a59d-6e351874326e', 'FTM', 0, '2026-09-11T04:19:02.952471+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('b3f5988d-19c4-44ed-9836-6445e8bf0910', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '75788f4a-8e23-4c0a-998b-e1be760f1929', 'STL', 43928, '2026-09-11T03:24:30.472443+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('b5aa80d3-c8dc-45b9-9f7a-d2a73ab3a286', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '31274e25-5b91-4c83-ab63-e363ead6d483', '3X', 628010, '2026-09-11T03:29:03.598907+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('c4981922-e902-4632-8a2e-0e0f3925ba0a', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '6b27a336-9e98-405d-8b82-94d5d1789738', 'STL', 490405, '2026-09-11T05:50:20.527151+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('cdd93b2e-e8eb-4994-b944-d91075831aa4', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', NULL, '2M', 13690, '2026-09-11T04:43:00.556242+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('d89cffb5-103f-42f6-871f-b8c272d33f57', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', 'STL', 594044, '2026-09-11T03:40:36.934225+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('eb92dbf1-c35f-4087-a633-bb2958bacf9e', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', NULL, '2M', 1000, '2026-09-11T04:39:12.122028+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('fbcecc7e-5af5-4c40-8a07-3447597c91ec', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '31274e25-5b91-4c83-ab63-e363ead6d483', 'PTS', 40391, '2026-09-11T03:02:31.951855+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.stat_entries (id, game_id, player_id, stat_type, video_time_ms, created_at) VALUES ('ffd388a2-fae5-4d02-bae3-1cc9e5a956cc', 'e2f0285d-7767-4ee9-b4fa-5a509c25e9d3', '48ffed15-b6fc-44c8-a99e-0fa3d13e0eaf', '2X', 37914, '2026-09-11T14:59:17.447899+00:00') ON CONFLICT DO NOTHING;

-- player_stats: 0 rows

-- stat_clips: 0 rows


COMMIT;