/**
 * Film Room — Private Video Playback Token
 *
 * GET ?gameId=X
 *   - Verifies game ownership
 *   - Returns a 15-minute presigned GET URL for the game's R2 video
 *   - Client refreshes at 12-minute intervals while video is active
 *   - For Stream (HLS) videos: returns the HLS manifest URL directly
 *     (Stream handles its own auth via signed tokens if configured)
 */
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_KEY_ID   = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const R2_SECRET   = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!

const SIGNED_URL_TTL = 900 // 15 minutes

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_KEY_ID, secretAccessKey: R2_SECRET },
    forcePathStyle: false,
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

function isStreamUrl(url: string): boolean {
  return url.includes('videodelivery.net') || url.includes('cloudflarestream.com')
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })

    const svc = createServiceClient()
    const { data: game, error } = await svc
      .from('games')
      .select('owner_id, video_url, video_id')
      .eq('id', gameId)
      .single()

    if (error || !game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!game.video_url) return NextResponse.json({ error: 'No video attached to this game' }, { status: 404 })

    // Cloudflare Stream — return HLS URL directly (Stream CDN handles delivery)
    if (isStreamUrl(game.video_url)) {
      return NextResponse.json({
        type: 'stream',
        src: game.video_url,
        expiresInSeconds: null, // Stream manifests don't expire
      })
    }

    // R2 — generate short-lived presigned GET URL
    const key = extractR2Key(game.video_url)
    if (!key) {
      // Unrecognized URL format — fail closed; never return raw URL
      return NextResponse.json({ error: 'Unsupported video storage format' }, { status: 400 })
    }

    const signedUrl = await getSignedUrl(
      r2Client(),
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: SIGNED_URL_TTL }
    )

    return NextResponse.json({
      type: 'r2',
      src: signedUrl,
      expiresInSeconds: SIGNED_URL_TTL,
      refreshAfterSeconds: 720, // refresh at 12 min
    })
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[video-token]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
