import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Ctx = { params: Promise<{ playlistId: string }> }

// POST /api/filmroom/playlists/[id]/clips — add a clip, appended after current max position
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const body = await request.json().catch(() => ({}))
    const clipId = typeof body.clip_id === 'string' ? body.clip_id.trim() : ''
    if (!clipId) return NextResponse.json({ error: 'clip_id required' }, { status: 400 })

    const svc = createServiceClient()

    // Verify playlist ownership
    const { data: pl } = await svc.from('playlists').select('owner_id').eq('id', playlistId).single()
    if (!pl) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    assertOwner(pl.owner_id, user.id)

    // Verify clip ownership
    const { data: cl } = await svc.from('clips').select('owner_id').eq('id', clipId).single()
    if (!cl) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    assertOwner(cl.owner_id, user.id)

    // Deterministic append: position = MAX(position) + 1, or 0 if empty
    const { data: maxRow } = await svc
      .from('playlist_clips')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextPosition = maxRow ? (maxRow.position as number) + 1 : 0

    const { data, error } = await svc
      .from('playlist_clips')
      .insert({ playlist_id: playlistId, clip_id: clipId, position: nextPosition })
      .select('id, playlist_id, clip_id, position, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Clip already in playlist' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/filmroom/playlists/[id]/clips — atomically reorder via DB RPC
// Body: { ordered_ids: string[] }  — full membership in desired order
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    // Use the cookie-session client (supabase) for the RPC so auth.uid() is set
    // in the DB session. svc (service role) has no JWT — auth.uid() would be null
    // and the SECURITY DEFINER guard would correctly reject it.
    const { user, supabase } = await getVerifiedUser(request)
    const { playlistId } = await params
    const body = await request.json().catch(() => ({}))

    // Validate input
    const orderedIds: unknown[] = Array.isArray(body.ordered_ids) ? body.ordered_ids : []
    if (orderedIds.length === 0) {
      return NextResponse.json({ error: 'ordered_ids array required' }, { status: 400 })
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!orderedIds.every(id => typeof id === 'string' && UUID_RE.test(id))) {
      return NextResponse.json({ error: 'ordered_ids must be valid UUIDs' }, { status: 400 })
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ error: 'ordered_ids contains duplicates' }, { status: 400 })
    }

    // Pre-flight ownership check via service client (fast, no RLS scan needed)
    const svc = createServiceClient()
    const { data: pl } = await svc.from('playlists').select('owner_id').eq('id', playlistId).single()
    if (!pl) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    assertOwner(pl.owner_id, user.id)

    // Call RPC through the authenticated session client so auth.uid() resolves
    // correctly inside the SECURITY DEFINER function.
    const { error: rpcErr } = await supabase.rpc('reorder_playlist_clips', {
      p_playlist_id: playlistId,
      p_ordered_ids: orderedIds as string[],
    })

    if (rpcErr) {
      const msg = rpcErr.message ?? ''
      // Map RPC validation errors (membership, unknown IDs, duplicates) to 400
      const is400 = /not found|mismatch|does not belong|length|duplicate|authenticated/i.test(msg)
      return NextResponse.json({ error: msg }, { status: is400 ? 400 : 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/filmroom/playlists/[id]/clips?entry_id= — remove a clip entry
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const entryId = new URL(request.url).searchParams.get('entry_id') ?? ''
    if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

    const svc = createServiceClient()
    const { data: pl } = await svc.from('playlists').select('owner_id').eq('id', playlistId).single()
    if (!pl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(pl.owner_id, user.id)

    const { error } = await svc
      .from('playlist_clips')
      .delete()
      .eq('id', entryId)
      .eq('playlist_id', playlistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
