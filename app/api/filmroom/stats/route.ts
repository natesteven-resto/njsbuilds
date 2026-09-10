import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const gameId = searchParams.get('game_id')
  const playerId = searchParams.get('player_id')

  let query = supabase.from('player_stats').select('*, players(id, name, number, position)')
  if (gameId) query = query.eq('game_id', gameId)
  if (playerId) query = query.eq('player_id', playerId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('player_stats')
    .upsert({
      game_id: body.game_id,
      player_id: body.player_id,
      pts: body.pts ?? 0,
      reb: body.reb ?? 0,
      ast: body.ast ?? 0,
      stl: body.stl ?? 0,
      blk: body.blk ?? 0,
      turnovers: body.turnovers ?? 0,
      fg2m: body.fg2m ?? 0,
      fg2a: body.fg2a ?? 0,
      fg3m: body.fg3m ?? 0,
      fg3a: body.fg3a ?? 0,
      ftm: body.ftm ?? 0,
      fta: body.fta ?? 0,
    }, { onConflict: 'game_id,player_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
