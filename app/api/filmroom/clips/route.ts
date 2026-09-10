import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const gameId = searchParams.get('game_id')
  const teamId = searchParams.get('team_id')

  let query = supabase.from('clips').select('*')
  if (gameId) query = query.eq('game_id', gameId)
  if (teamId) query = query.eq('team_id', teamId)
  
  const { data: clips, error } = await query.order('start_time_ms', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch player associations
  if (clips && clips.length > 0) {
    const clipIds = clips.map((c: { id: string }) => c.id)
    const { data: clipPlayers } = await supabase
      .from('clip_players')
      .select('clip_id, player_id, players(id, name, number, position)')
      .in('clip_id', clipIds)

    const playerMap: Record<string, unknown[]> = {}
    if (clipPlayers) {
      for (const cp of clipPlayers as Array<{ clip_id: string; players: unknown }>) {
        if (!playerMap[cp.clip_id]) playerMap[cp.clip_id] = []
        playerMap[cp.clip_id].push(cp.players)
      }
    }

    const enriched = clips.map((c: { id: string }) => ({ ...c, players: playerMap[c.id] || [] }))
    return NextResponse.json(enriched)
  }

  return NextResponse.json(clips)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data: clip, error } = await supabase
    .from('clips')
    .insert({
      game_id: body.game_id,
      team_id: body.team_id,
      start_time_ms: body.start_time_ms,
      end_time_ms: body.end_time_ms,
      title: body.title || 'Untitled Clip',
      tags: body.tags || [],
      category: body.category || 'offense',
      is_highlight: body.is_highlight || false,
      drawing_data: body.drawing_data || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Link players
  if (body.player_ids && body.player_ids.length > 0 && clip) {
    const links = body.player_ids.map((pid: string) => ({
      clip_id: clip.id,
      player_id: pid,
    }))
    await supabase.from('clip_players').insert(links)
  }

  return NextResponse.json({ ...clip, players: [] }, { status: 201 })
}
