import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const VALID_STAT_TYPES = ['2M', '3M', 'FTM', '2X', '3X', 'FTX', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'DEF', 'TO', 'FOUL'] as const
type StatType = typeof VALID_STAT_TYPES[number]

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const gameId = searchParams.get('game_id')
  const playerId = searchParams.get('player_id')

  if (!gameId) return NextResponse.json({ error: 'game_id required' }, { status: 400 })

  let query = supabase
    .from('stat_entries')
    .select('*, players(id, name, number)')
    .eq('game_id', gameId)
    .order('video_time_ms', { ascending: true })

  if (playerId) query = query.eq('player_id', playerId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { game_id, player_id, stat_type, video_time_ms } = body

  if (!game_id || !stat_type) {
    return NextResponse.json({ error: 'game_id and stat_type required' }, { status: 400 })
  }

  if (!VALID_STAT_TYPES.includes(stat_type as StatType)) {
    return NextResponse.json({ error: `stat_type must be one of: ${VALID_STAT_TYPES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stat_entries')
    .insert({
      game_id,
      player_id,
      stat_type,
      video_time_ms: video_time_ms ?? 0,
    })
    .select('*, players(id, name, number)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('stat_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
