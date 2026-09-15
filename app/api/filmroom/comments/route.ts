import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const { searchParams } = new URL(request.url)
    const clipId = searchParams.get('clip_id')
    if (!clipId) return NextResponse.json({ error: 'clip_id required' }, { status: 400 })

    const { data: clip } = await svc.from('clips').select('owner_id').eq('id', clipId).single()
    if (!clip || clip.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await svc
      .from('clip_comments')
      .select('*')
      .eq('clip_id', clipId)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })

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

    // Explicit field allowlist — author fields are server-set, not client-provided
    const clipId      = raw.clip_id
    const text        = raw.text
    const drawingData = raw.drawing_data ?? null

    if (!clipId || typeof clipId !== 'string')
      return NextResponse.json({ error: 'clip_id required' }, { status: 400 })
    if (!text || typeof text !== 'string' || !text.trim())
      return NextResponse.json({ error: 'text required' }, { status: 400 })

    const { data: clip } = await svc.from('clips').select('owner_id').eq('id', clipId).single()
    if (!clip || clip.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await svc
      .from('clip_comments')
      .insert({
        clip_id:      clipId,
        text:         text.trim(),
        drawing_data: drawingData,
        author_id:    user.id,       // server-set from verified identity
        author_role:  'coach',       // server-set, not from body
        author_name:  raw.author_name?.trim() || 'Coach', // display name only
        owner_id:     user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
