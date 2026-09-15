/**
 * Film Room — Video proxy route (ownership-verified, range-aware)
 *
 * Fixed issues vs original:
 * - Added ownership check: caller must own the game
 * - Key is resolved from game.video_url server-side; client cannot supply arbitrary key
 * - Range requests go directly to a single range-scoped GetObjectCommand
 *   (original fetched the full object first, then made a second range request)
 * - Fails closed on unrecognised video_url formats
 * - Used for browsers that cannot fetch presigned URLs directly (CORS edge cases)
 *   Prefer /api/filmroom/video-token for normal clients.
 */
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

type Params = { params: Promise<{ gameId: string }> }

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!

function r2() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('r2.cloudflarestorage.com')) {
      return u.hostname.startsWith('filmroom-videos.')
        ? u.pathname.replace(/^\//, '')
        : u.pathname.replace(/^\/filmroom-videos\//, '')
    }
    if (u.hostname.includes('r2.dev')) return u.pathname.replace(/^\//, '')
    return null
  } catch { return null }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { gameId } = await params
    const svc = createServiceClient()

    // Verify ownership and get video_url server-side
    const { data: game, error: gameErr } = await svc
      .from('games').select('owner_id, video_url, video_id').eq('id', gameId).single()

    if (gameErr || !game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!game.video_url) return NextResponse.json({ error: 'No video attached' }, { status: 404 })

    // Stream videos: redirect to HLS URL (Stream handles its own delivery)
    if (game.video_url.includes('videodelivery.net') || game.video_url.includes('cloudflarestream.com')) {
      return NextResponse.redirect(game.video_url)
    }

    // R2 videos: resolve key from stored URL only — never from client input
    const key = extractR2Key(game.video_url)
    if (!key) {
      // Unknown URL format — fail closed
      return NextResponse.json({ error: 'Unsupported video storage format' }, { status: 400 })
    }

    const range = request.headers.get('range')
    const cmd = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ...(range ? { Range: range } : {}),
    })

    const obj = await r2().send(cmd)
    if (!obj.Body) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const headers = new Headers()
    headers.set('Content-Type', obj.ContentType ?? 'video/mp4')
    headers.set('Cache-Control', 'private, max-age=900')
    headers.set('Accept-Ranges', 'bytes')

    if (range && obj.ContentRange) {
      headers.set('Content-Range', obj.ContentRange)
      if (obj.ContentLength) headers.set('Content-Length', String(obj.ContentLength))
      return new NextResponse(obj.Body as ReadableStream, { status: 206, headers })
    }

    if (obj.ContentLength) headers.set('Content-Length', String(obj.ContentLength))
    return new NextResponse(obj.Body as ReadableStream, { status: 200, headers })
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[video proxy]', e)
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 })
  }
}
