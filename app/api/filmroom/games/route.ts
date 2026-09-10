import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { TEST_TEAM_ID } from '@/types/filmroom'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id') || TEST_TEAM_ID

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('team_id', teamId)
    .order('game_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('games')
    .insert({
      team_id: body.team_id || TEST_TEAM_ID,
      opponent: body.opponent,
      game_date: body.game_date,
      location: body.location || null,
      video_url: body.video_url || null,
      video_id: body.video_id || null,
      thumbnail_url: body.thumbnail_url || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
