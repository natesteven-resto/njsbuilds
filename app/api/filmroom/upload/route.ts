/**
 * Film Room Upload API — authenticated, R2-only for this release.
 *
 * Stream is disabled: R2 + CDN delivers original-quality footage with no
 * transcoding loss. Stream can be re-enabled once signed Stream tokens are
 * implemented end-to-end.
 *
 * POST: Verify game ownership → signal client to use multipart route.
 * GET ?videoId=xxx: Stub — returns not-configured (Stream disabled).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const raw = await request.json()
    const { game_id, filename } = raw

    if (!game_id || typeof game_id !== 'string')
      return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    if (!filename || typeof filename !== 'string')
      return NextResponse.json({ error: 'filename required' }, { status: 400 })

    // Verify game ownership
    const { data: game } = await svc.from('games').select('owner_id').eq('id', game_id).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // R2 multipart only for this release — client calls /upload/multipart?action=create
    return NextResponse.json({ method: 'r2' })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Stream disabled for this release
  return NextResponse.json({
    readyToStream: false,
    status: 'stream_disabled',
    message: 'Cloudflare Stream not used in this release. Use R2 multipart upload.',
  })
}
