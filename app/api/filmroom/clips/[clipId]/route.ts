import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clipId: string }> }) {
  const { clipId } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  const { player_ids, ...rest } = body

  const { data, error } = await supabase
    .from('clips')
    .update(rest)
    .eq('id', clipId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update player links if provided
  if (player_ids !== undefined) {
    await supabase.from('clip_players').delete().eq('clip_id', clipId)
    if (player_ids.length > 0) {
      await supabase.from('clip_players').insert(
        player_ids.map((pid: string) => ({ clip_id: clipId, player_id: pid }))
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ clipId: string }> }) {
  const { clipId } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('clips').delete().eq('id', clipId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
