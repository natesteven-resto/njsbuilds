import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const VALID_STAT_TYPES = new Set([
  '2M','2X','3M','3X','FTM','FTX','OREB','DREB','AST','STL','BLK','DEF','TO','FOUL',
  'PTS','REB','FT', // legacy
])
const SHOT_STAT_TYPES = new Set(['2M','2X','3M','3X','FTM','FTX'])

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game_id')
    if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    // Verify game via RLS client
    const { data: game, error: gameErr } = await supabase
      .from('games').select('id, owner_id').eq('id', gameId).single()
    if (gameErr || !game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('stat_entries')
      .select('*, players(id, name, number)')
      .eq('game_id', gameId).eq('owner_id', user.id)
      .order('video_time_ms', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const raw = await request.json()

    // Explicit allowlist
    const gameId      = typeof raw.game_id    === 'string' ? raw.game_id    : null
    const playerId    = typeof raw.player_id  === 'string' ? raw.player_id  : null
    const statType    = typeof raw.stat_type  === 'string' ? raw.stat_type  : null
    const videoTimeMs = typeof raw.video_time_ms === 'number' ? Math.max(0, Math.floor(raw.video_time_ms)) : 0

    if (!gameId)   return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    if (!statType) return NextResponse.json({ error: 'stat_type required' }, { status: 400 })
    if (!VALID_STAT_TYPES.has(statType))
      return NextResponse.json({ error: `Invalid stat_type: ${statType}` }, { status: 400 })

    // Verify game via RLS client
    const { data: game, error: gameErr } = await supabase
      .from('games').select('id, owner_id, team_id').eq('id', gameId).single()
    if (gameErr || !game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify player: owned + same team as game
    if (playerId) {
      const { data: player } = await supabase
        .from('players').select('id, owner_id, team_id').eq('id', playerId).single()
      if (!player || player.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden: player not owned' }, { status: 403 })
      if (player.team_id !== game.team_id)
        return NextResponse.json({ error: 'Forbidden: player not on game team' }, { status: 403 })
    }

    // Shot coordinates: only for shot stat types; both or neither
    const rawX = raw.shot_x !== undefined && raw.shot_x !== null ? Number(raw.shot_x) : null
    const rawY = raw.shot_y !== undefined && raw.shot_y !== null ? Number(raw.shot_y) : null
    let shotX: number | null = null
    let shotY: number | null = null
    if (rawX !== null || rawY !== null) {
      if (rawX === null || rawY === null) {
        return NextResponse.json({ error: 'shot_x and shot_y must both be provided or both omitted' }, { status: 400 })
      }
      if (!SHOT_STAT_TYPES.has(statType)) {
        return NextResponse.json({ error: `shot coordinates not allowed for stat_type ${statType}` }, { status: 400 })
      }
      if (!Number.isFinite(rawX) || rawX < 0 || rawX > 1 || !Number.isFinite(rawY) || rawY < 0 || rawY > 1) {
        return NextResponse.json({ error: 'shot_x and shot_y must be in [0, 1]' }, { status: 400 })
      }
      shotX = rawX
      shotY = rawY
    }

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('stat_entries')
      .insert({ game_id: gameId, player_id: playerId, stat_type: statType, video_time_ms: videoTimeMs, owner_id: user.id, shot_x: shotX, shot_y: shotY })
      .select('*, players(id, name, number)').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Verify via RLS client — will return null if not owned
    const { data: entry } = await supabase
      .from('stat_entries').select('id, owner_id').eq('id', id).single()
    if (!entry || entry.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const svc = createServiceClient()
    const { error } = await svc.from('stat_entries').delete().eq('id', id).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
