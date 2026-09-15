import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ gameId: string }> }

// Explicit allowlist for PATCH — team_id and video fields are immutable/server-only
const PATCH_FIELDS = ['opponent', 'game_date', 'location', 'notes', 'thumbnail_url'] as const

function pickPatchFields(raw: Record<string, unknown>) {
  const out: Partial<Record<typeof PATCH_FIELDS[number], unknown>> = {}
  for (const key of PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      (out as Record<string, unknown>)[key] = raw[key]
    }
  }
  return out
}

/** Verify game exists and belongs to user. Returns game row. Throws 404/403 NextResponse. */
async function requireOwnedGame(gameId: string, userId: string, supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (error || !data) {
    throw new NextResponse(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }
  if (data.owner_id !== userId) {
    throw new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    })
  }
  return data
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { gameId } = await params
    const svc = createServiceClient()
    const game = await requireOwnedGame(gameId, user.id, svc)
    return NextResponse.json(game)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { gameId } = await params
    const svc = createServiceClient()
    await requireOwnedGame(gameId, user.id, svc)

    const raw = await request.json()
    const patch = pickPatchFields(raw)

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 })
    }

    // Validate fields
    if (patch.opponent !== undefined) {
      if (typeof patch.opponent !== 'string' || !patch.opponent.trim()) {
        return NextResponse.json({ error: 'opponent must be a non-empty string' }, { status: 400 })
      }
      patch.opponent = patch.opponent.trim()
    }

    const { data, error } = await svc
      .from('games')
      .update(patch)
      .eq('id', gameId)
      .eq('owner_id', user.id) // double-lock
      .select()
      .single()

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
    const { gameId } = await params
    const svc = createServiceClient()
    await requireOwnedGame(gameId, user.id, svc)

    const { error } = await svc
      .from('games')
      .delete()
      .eq('id', gameId)
      .eq('owner_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
