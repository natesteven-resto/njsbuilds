import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const clipId = searchParams.get('clip_id')
  if (!clipId) return NextResponse.json({ error: 'clip_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clip_comments')
    .select('*')
    .eq('clip_id', clipId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('clip_comments')
    .insert({
      clip_id: body.clip_id,
      author_id: body.author_id || null,
      author_role: body.author_role || 'coach',
      author_name: body.author_name || 'Coach',
      text: body.text,
      drawing_data: body.drawing_data || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
