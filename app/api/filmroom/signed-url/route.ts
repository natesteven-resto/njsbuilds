/**
 * Legacy signed-url route — now ownership-verified.
 * Prefer /api/filmroom/video-token for new clients.
 */
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_KEY_ID   = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const R2_SECRET   = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!

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

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const { gameId, key } = await request.json()

    if (!gameId || typeof gameId !== 'string')
      return NextResponse.json({ error: 'gameId required' }, { status: 400 })
    if (!key || typeof key !== 'string')
      return NextResponse.json({ error: 'key required' }, { status: 400 })

    // Verify game ownership
    const { data: game } = await svc
      .from('games').select('owner_id, video_url').eq('id', gameId).single()
    if (!game || game.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify the key matches what's stored on the game
    // (prevents signing arbitrary keys for owned games)
    const storedKey = extractR2Key(game.video_url ?? '')
    if (!storedKey || storedKey !== key)
      return NextResponse.json({ error: 'Key does not match game video' }, { status: 403 })

    const url = await getSignedUrl(
      r2Client(),
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: 900 }
    )
    return NextResponse.json({ url })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
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
