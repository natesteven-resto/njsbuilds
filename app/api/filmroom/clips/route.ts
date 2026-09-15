import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, stripServerFields } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game_id')

    if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    // Verify game ownership before returning clips
    const { data: game } = await supabase.from('games').select('owner_id').eq('id', gameId).single()
    if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: clips, error } = await supabase
      .from('clips')
      .select('*')
      .eq('game_id', gameId)
      .eq('owner_id', user.id)
      .order('start_time_ms', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Attach players for each clip
    const clipIds = clips?.map(c => c.id) ?? []
    const { data: clipPlayers } = clipIds.length
      ? await supabase.from('clip_players').select('clip_id, players(*)').in('clip_id', clipIds)
      : { data: [] }

    const playerMap: Record<string, unknown[]> = {}
    for (const cp of clipPlayers ?? []) {
      if (!playerMap[cp.clip_id]) playerMap[cp.clip_id] = []
      if (cp.players) playerMap[cp.clip_id].push(cp.players)
    }

    const enriched = (clips ?? []).map(c => ({ ...c, players: playerMap[c.id] ?? [] }))
    return NextResponse.json(enriched)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const raw = await request.json()
    const body = stripServerFields(raw)

    // Verify game and team ownership
    if (!body.game_id) return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    const { data: game } = await supabase.from('games').select('owner_id, team_id').eq('id', body.game_id).single()
    if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { player_ids, drawing_data, ...clipFields } = body

    const { data: clip, error } = await supabase
      .from('clips')
      .insert({
        ...clipFields,
        team_id: body.team_id ?? game.team_id,
        game_id: body.game_id,
        drawing_data: drawing_data ?? null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Link players — verify each belongs to this owner
    if (Array.isArray(player_ids) && player_ids.length > 0) {
      const { data: validPlayers } = await supabase
        .from('players')
        .select('id')
        .in('id', player_ids)
        .eq('owner_id', user.id)

      const validIds = validPlayers?.map(p => p.id) ?? []
      if (validIds.length > 0) {
        await supabase.from('clip_players').insert(
          validIds.map(pid => ({ clip_id: clip.id, player_id: pid }))
        )
      }
    }

    return NextResponse.json(clip, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
