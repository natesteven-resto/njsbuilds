import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const STAT_FIELDS = ['pts','reb','ast','stl','blk','turnovers','fg2m','fg2a','fg3m','fg3a','ftm','fta'] as const

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const { searchParams } = new URL(request.url)
    const gameId   = searchParams.get('game_id')
    const playerId = searchParams.get('player_id')

    if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    // Verify game ownership
    const { data: game } = await svc.from('games').select('owner_id').eq('id', gameId).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = svc
      .from('player_stats')
      .select('*, players(id, name, number, position)')
      .eq('game_id', gameId)

    if (playerId) {
      // Verify player ownership too
      const { data: player } = await svc.from('players').select('owner_id').eq('id', playerId).single()
      if (!player || player.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('player_id', playerId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const raw = await request.json()

    if (!raw.game_id) return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    if (!raw.player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

    // Verify game ownership
    const { data: game } = await svc.from('games').select('owner_id, team_id').eq('id', raw.game_id).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify player ownership and same team
    const { data: player } = await svc.from('players').select('owner_id, team_id').eq('id', raw.player_id).single()
    if (!player || player.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden: player not owned' }, { status: 403 })
    if (player.team_id !== game.team_id)
      return NextResponse.json({ error: 'Forbidden: player not on game team' }, { status: 403 })

    // Explicit stat field allowlist — no owner_id, game_id, player_id from body
    const statFields: Record<string, number> = {}
    for (const f of STAT_FIELDS) {
      statFields[f] = typeof raw[f] === 'number' ? Math.max(0, Math.floor(raw[f])) : 0
    }

    const { data, error } = await svc
      .from('player_stats')
      .upsert({
        game_id:   raw.game_id,
        player_id: raw.player_id,
        ...statFields,
      }, { onConflict: 'game_id,player_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
