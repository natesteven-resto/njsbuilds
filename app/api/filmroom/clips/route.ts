import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game_id')
    if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    // RLS-scoped client — game must pass games_own policy
    const { data: game, error: gameErr } = await supabase
      .from('games').select('id, owner_id, team_id').eq('id', gameId).single()
    if (gameErr || !game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: clips, error } = await supabase
      .from('clips')
      .select('*')
      .eq('game_id', gameId)
      .eq('owner_id', user.id)
      .order('start_time_ms', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Attach players for each clip via service client (join table)
    const svc = createServiceClient()
    const clipIds = (clips ?? []).map((c: { id: string }) => c.id)
    const playerMap: Record<string, unknown[]> = {}
    if (clipIds.length > 0) {
      const { data: cpRows } = await svc
        .from('clip_players').select('clip_id, players(*)').in('clip_id', clipIds)
      for (const cp of cpRows ?? []) {
        if (!playerMap[cp.clip_id]) playerMap[cp.clip_id] = []
        if (cp.players) playerMap[cp.clip_id].push(cp.players)
      }
    }
    return NextResponse.json((clips ?? []).map((c: { id: string }) => ({ ...c, players: playerMap[c.id] ?? [] })))
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const raw = await request.json()

    // Explicit allowlist — team_id comes from game, not body
    const gameId       = typeof raw.game_id === 'string' ? raw.game_id : null
    const startMs      = typeof raw.start_time_ms === 'number' ? Math.floor(raw.start_time_ms) : null
    const endMs        = typeof raw.end_time_ms   === 'number' ? Math.floor(raw.end_time_ms)   : null
    const title        = typeof raw.title    === 'string' ? raw.title.trim()    : 'Untitled Clip'
    const category     = ['offense','defense','transition','set_play'].includes(raw.category) ? raw.category : 'offense'
    const tags         = Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === 'string') : []
    const isHighlight     = !!raw.is_highlight
    const drawingData     = raw.drawing_data ?? null
    const playerIds       = Array.isArray(raw.player_ids) ? raw.player_ids.filter((p: unknown) => typeof p === 'string') : []
    const coachingNote    = typeof raw.coaching_note    === 'string' ? raw.coaching_note.trim()    || null : null
    const playType        = typeof raw.play_type        === 'string' ? raw.play_type.trim()        || null : null
    const primaryPlayerId = typeof raw.primary_player_id === 'string' ? raw.primary_player_id      : null

    if (!gameId)           return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    if (startMs === null)  return NextResponse.json({ error: 'start_time_ms required' }, { status: 400 })
    if (endMs === null)    return NextResponse.json({ error: 'end_time_ms required' }, { status: 400 })
    if (endMs <= startMs)  return NextResponse.json({ error: 'end_time_ms must be > start_time_ms' }, { status: 400 })

    // Verify game via RLS client — also gets authoritative team_id
    const { data: game, error: gameErr } = await supabase
      .from('games').select('id, owner_id, team_id').eq('id', gameId).single()
    if (gameErr || !game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Use service client for atomic insert + player links
    const svc = createServiceClient()

    // Verify each player: owned by caller AND on game's team
    if (playerIds.length > 0) {
      const { data: validPlayers } = await svc
        .from('players').select('id, owner_id, team_id')
        .in('id', playerIds).eq('owner_id', user.id).eq('team_id', game.team_id)
      const validIds = new Set((validPlayers ?? []).map((p: { id: string }) => p.id))
      const invalid = playerIds.filter((id: string) => !validIds.has(id))
      if (invalid.length > 0)
        return NextResponse.json({ error: `Player(s) not owned or not on team: ${invalid.join(', ')}` }, { status: 403 })
    }

    const { data: clip, error: clipErr } = await svc
      .from('clips')
      .insert({
        game_id: gameId,
        team_id: game.team_id,
        start_time_ms: startMs,
        end_time_ms: endMs,
        title,
        category,
        tags,
        is_highlight: isHighlight,
        drawing_data: drawingData,
        coaching_note: coachingNote,
        play_type: playType,
        ...(primaryPlayerId ? { primary_player_id: primaryPlayerId } : {}),
        owner_id: user.id,
      })
      .select().single()

    if (clipErr) return NextResponse.json({ error: clipErr.message }, { status: 500 })

    // Link players atomically
    if (playerIds.length > 0) {
      const { error: linkErr } = await svc
        .from('clip_players')
        .insert(playerIds.map((pid: string) => ({ clip_id: clip.id, player_id: pid })))
      if (linkErr) {
        // Roll back the clip on link failure
        await svc.from('clips').delete().eq('id', clip.id)
        return NextResponse.json({ error: 'Failed to link players: ' + linkErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ...clip, players: [] }, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
