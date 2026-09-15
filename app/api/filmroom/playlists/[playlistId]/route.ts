import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Ctx = { params: Promise<{ playlistId: string }> }

// GET /api/filmroom/playlists/[id] — playlist + ordered clips (with game info)
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const svc = createServiceClient()

    const { data: pl, error: plErr } = await svc
      .from('playlists')
      .select('id, owner_id, name, created_at')
      .eq('id', playlistId)
      .single()

    if (plErr || !pl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(pl.owner_id, user.id)

    const { data: pclips, error: pcErr } = await svc
      .from('playlist_clips')
      .select(`
        id, playlist_id, clip_id, position, created_at,
        clips (
          id, game_id, team_id, start_time_ms, end_time_ms,
          title, tags, category, is_highlight, drawing_data,
          coaching_note, play_type, primary_player_id, created_at,
          games ( id, opponent, game_date, video_url, video_id )
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true })

    if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 })
    return NextResponse.json({ ...pl, clips: pclips ?? [] })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/filmroom/playlists/[id] — rename
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'name required (1–120 chars)' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Verify ownership before update
    const { data: existing } = await svc
      .from('playlists')
      .select('owner_id')
      .eq('id', playlistId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(existing.owner_id, user.id)

    const { data, error } = await svc
      .from('playlists')
      .update({ name })
      .eq('id', playlistId)
      .select('id, owner_id, name, created_at')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/filmroom/playlists/[id] — delete (cascades to playlist_clips)
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const svc = createServiceClient()

    const { data: existing } = await svc
      .from('playlists')
      .select('owner_id')
      .eq('id', playlistId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(existing.owner_id, user.id)

    const { error } = await svc
      .from('playlists')
      .delete()
      .eq('id', playlistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
