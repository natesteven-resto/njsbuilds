import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, stripServerFields } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game_id')
    if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    const { data: game } = await supabase
      .from('games').select('owner_id').eq('id', gameId).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('stat_entries')
      .select('*, players(id, name, number)')
      .eq('game_id', gameId)
      .eq('owner_id', user.id)
      .order('video_time_ms', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
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

    if (!body.game_id) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

    // Verify game ownership — get team_id too for player cross-check
    const { data: game } = await supabase
      .from('games').select('owner_id, team_id').eq('id', body.game_id).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify player ownership AND same team as game
    if (body.player_id) {
      const { data: player } = await supabase
        .from('players')
        .select('owner_id, team_id')
        .eq('id', body.player_id)
        .single()
      if (!player || player.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden: player not owned' }, { status: 403 })
      if (player.team_id !== game.team_id)
        return NextResponse.json({ error: 'Forbidden: player not on game team' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('stat_entries')
      .insert({ ...body, owner_id: user.id })
      .select('*, players(id, name, number)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: entry } = await supabase
      .from('stat_entries').select('owner_id').eq('id', id).single()
    if (!entry || entry.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('stat_entries').delete().eq('id', id).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
