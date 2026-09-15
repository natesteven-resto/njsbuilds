/**
 * Film Room Upload API — authenticated, ownership-verified
 *
 * POST: Initiate upload. Verifies game ownership, creates upload_session record.
 *       Returns Stream TUS URL (preferred) or signals R2 multipart.
 *       Never accepts video_url/video_id from client.
 *
 * GET ?videoId=xxx: Poll Stream transcoding status (ownership verified).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/supabase-server'

const ACCOUNT_ID    = process.env.CLOUDFLARE_ACCOUNT_ID!
const STREAM_TOKEN  = process.env.CLOUDFLARE_STREAM_TOKEN!

async function tryStreamUpload(
  filename: string,
  fileSizeBytes: number,
): Promise<{ uploadUrl: string; videoId: string }> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STREAM_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSizeBytes),
        'Upload-Metadata': `name ${Buffer.from(filename).toString('base64')}`,
      },
    }
  )
  if (!res.ok) throw new Error(`Stream API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const uploadUrl = res.headers.get('location') ?? res.headers.get('Location')
  const videoId   = res.headers.get('stream-media-id') ?? ''
  if (!uploadUrl) throw new Error('Stream did not return upload URL')
  return { uploadUrl, videoId }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()

    const raw = await request.json()
    const { game_id, filename, contentType = 'video/mp4', fileSizeBytes } = raw

    if (!game_id || typeof game_id !== 'string') {
      return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    }
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename required' }, { status: 400 })
    }

    // Verify game ownership
    const { data: game } = await svc.from('games').select('owner_id').eq('id', game_id).single()
    if (!game || game.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Try Cloudflare Stream first
    if (ACCOUNT_ID && STREAM_TOKEN) {
      try {
        const { uploadUrl, videoId } = await tryStreamUpload(filename, fileSizeBytes ?? 0)
        // Record upload session for Stream (no r2_key)
        await svc.from('upload_sessions').insert({
          owner_id:  user.id,
          game_id,
          r2_key:    '', // Stream uses videoId
          upload_id: videoId,
          status:    'in_progress',
        })
        return NextResponse.json({ method: 'stream', uploadUrl, videoId })
      } catch (err) {
        console.warn('[upload] Stream failed, falling back to R2:', String(err).slice(0, 200))
      }
    }

    // Fallback: signal client to use multipart route
    return NextResponse.json({ method: 'r2' })
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[upload]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    // Verify ownership via upload_sessions
    const { data: session } = await svc
      .from('upload_sessions')
      .select('owner_id, game_id')
      .eq('upload_id', videoId)
      .eq('owner_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!ACCOUNT_ID || !STREAM_TOKEN) {
      return NextResponse.json({ videoId, readyToStream: false, status: 'no_stream_token' })
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${videoId}`,
      { headers: { 'Authorization': `Bearer ${STREAM_TOKEN}` } }
    )
    if (!res.ok) return NextResponse.json({ error: `Stream API ${res.status}` }, { status: res.status })

    const { result: video = {} } = await res.json()
    const ready = video.readyToStream ?? false

    // On ready: attach video to game server-side, mark session complete
    if (ready) {
      const hlsUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`
      await svc.from('games')
        .update({ video_url: hlsUrl, video_id: videoId })
        .eq('id', session.game_id)
        .eq('owner_id', user.id)

      await svc.from('upload_sessions')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('upload_id', videoId)
        .eq('owner_id', user.id)
    }

    return NextResponse.json({
      videoId,
      readyToStream: ready,
      status: video.status?.state ?? 'unknown',
      duration: video.duration ?? 0,
      thumbnail: video.thumbnail ?? null,
      hlsUrl: `https://videodelivery.net/${videoId}/manifest/video.m3u8`,
    })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
