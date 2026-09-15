import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

// GET /api/filmroom/playlists — list caller's playlists with clip count
export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()

    const { data, error } = await svc
      .from('playlists')
      .select('id, owner_id, name, created_at, playlist_clips(count)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const playlists = (data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      owner_id: p.owner_id,
      name: p.name,
      created_at: p.created_at,
      clip_count:
        Array.isArray(p.playlist_clips)
          ? ((p.playlist_clips as Array<{ count: number }>)[0]?.count ?? 0)
          : 0,
    }))

    return NextResponse.json(playlists)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/filmroom/playlists — create playlist
export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'name required (1–120 chars)' }, { status: 400 })
    }

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('playlists')
      .insert({ owner_id: user.id, name })
      .select('id, owner_id, name, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
