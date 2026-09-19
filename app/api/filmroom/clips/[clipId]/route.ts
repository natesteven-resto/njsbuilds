import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Params = { params: Promise<{ clipId: string }> }

const PATCH_ALLOWED = ['parent_shared', 'title', 'tags', 'category', 'is_highlight', 'drawing_data',
  'coaching_note', 'play_type', 'primary_player_id', 'start_time_ms', 'end_time_ms'] as const

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { clipId } = await params
    const svc = createServiceClient()

    const { data: clip } = await svc.from('clips').select('owner_id, team_id, start_time_ms, end_time_ms').eq('id', clipId).single()
    if (!clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(clip.owner_id, user.id)

    const raw = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    for (const key of PATCH_ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) patch[key] = raw[key]
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No patchable fields' }, { status: 400 })
    }

    if (patch.parent_shared !== undefined && typeof patch.parent_shared !== 'boolean') return NextResponse.json({error:'Invalid clip sharing selection.'},{status:400})

    // Validate time bounds before use — must be finite non-negative integers
    if (patch.start_time_ms !== undefined) {
      const v = Number(patch.start_time_ms)
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
        return NextResponse.json({ error: 'start_time_ms must be a non-negative integer' }, { status: 400 })
      }
      patch.start_time_ms = v
    }
    if (patch.end_time_ms !== undefined) {
      const v = Number(patch.end_time_ms)
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
        return NextResponse.json({ error: 'end_time_ms must be a non-negative integer' }, { status: 400 })
      }
      patch.end_time_ms = v
    }
    const startMs = typeof patch.start_time_ms === 'number' ? patch.start_time_ms : (clip.start_time_ms as number)
    const endMs   = typeof patch.end_time_ms   === 'number' ? patch.end_time_ms   : (clip.end_time_ms   as number)
    if (endMs <= startMs) {
      return NextResponse.json({ error: 'end_time_ms must be > start_time_ms' }, { status: 400 })
    }

    // Validate primary_player_id belongs to same team
    if (patch.primary_player_id && typeof patch.primary_player_id === 'string') {
      const { data: pl } = await svc.from('players')
        .select('owner_id, team_id').eq('id', patch.primary_player_id).single()
      if (!pl || pl.owner_id !== user.id || pl.team_id !== clip.team_id) {
        return NextResponse.json({ error: 'primary_player_id not valid for this clip' }, { status: 403 })
      }
    }

    const { data, error } = await svc
      .from('clips').update(patch).eq('id', clipId).eq('owner_id', user.id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { clipId } = await params
    const svc = createServiceClient()

    const { data: clip } = await svc.from('clips').select('owner_id').eq('id', clipId).single()
    assertOwner(clip?.owner_id ?? null, user.id)

    const { error } = await svc.from('clips').delete().eq('id', clipId).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
