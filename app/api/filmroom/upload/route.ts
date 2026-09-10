/**
 * Film Room Upload API
 *
 * POST: Get a signed upload URL
 *   Body: { filename, contentType, gameId, fileSizeBytes? }
 *   - Tries Cloudflare Stream TUS direct creator upload first
 *   - Falls back to R2 presigned PUT on failure
 *   Response: { method: 'stream'|'r2', uploadUrl, videoId?, key?, playbackUrl? }
 *
 * GET: Poll Stream transcoding status
 *   Query: ?videoId=xxx
 *   Response: { readyToStream, status, thumbnail, hlsUrl, ... }
 */
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN!
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET!
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
    forcePathStyle: false,
  })
}

async function tryStreamUpload(filename: string, gameId: string): Promise<{ uploadUrl: string; videoId: string }> {
  // Cloudflare Stream TUS direct creator upload
  // https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STREAM_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': '0',
        'Upload-Metadata': `name ${Buffer.from(filename).toString('base64')}`,
      },
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Stream API ${res.status}: ${body.slice(0, 200)}`)
  }

  const uploadUrl = res.headers.get('location') || res.headers.get('Location')
  const videoId = res.headers.get('stream-media-id') ?? ''

  if (!uploadUrl) throw new Error('Stream did not return upload URL in Location header')

  return { uploadUrl, videoId }
}

async function r2PresignedUpload(
  filename: string,
  contentType: string,
  gameId: string
): Promise<{ uploadUrl: string; key: string; playbackUrl: string }> {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `games/${gameId}/${Date.now()}-${safeFilename}`
  const client = r2Client()

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  // R2 public URL — works once bucket is set to public or via Cloudflare CDN
  const playbackUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`

  return { uploadUrl, key, playbackUrl }
}

// ─── POST: Get signed upload URL ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, contentType = 'video/mp4', gameId } = body

    if (!filename || !gameId) {
      return NextResponse.json({ error: 'filename and gameId are required' }, { status: 400 })
    }

    // Try Cloudflare Stream first
    if (ACCOUNT_ID && STREAM_TOKEN && !STREAM_TOKEN.startsWith('cfat_')) {
      // cfat_ tokens are R2-only; Stream needs a standard CF API token
      try {
        const { uploadUrl, videoId } = await tryStreamUpload(filename, gameId)
        return NextResponse.json({ method: 'stream', uploadUrl, videoId })
      } catch (streamErr) {
        console.warn('[upload] Stream failed, falling back to R2:', String(streamErr).slice(0, 200))
      }
    }

    // Fallback: R2 presigned PUT
    if (!R2_ACCESS_KEY || !R2_SECRET_KEY) {
      return NextResponse.json({ error: 'No upload credentials configured' }, { status: 500 })
    }

    const { uploadUrl, key, playbackUrl } = await r2PresignedUpload(filename, contentType, gameId)
    return NextResponse.json({ method: 'r2', uploadUrl, key, playbackUrl })
  } catch (err) {
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── GET: Poll Stream status ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 })
  }

  if (!ACCOUNT_ID || !STREAM_TOKEN || STREAM_TOKEN.startsWith('cfat_')) {
    return NextResponse.json({
      videoId,
      readyToStream: false,
      status: 'no_stream_token',
      message: 'Cloudflare Stream API token not configured',
    })
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${videoId}`,
      { headers: { 'Authorization': `Bearer ${STREAM_TOKEN}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `Stream API ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const video = data.result ?? {}

    return NextResponse.json({
      videoId,
      readyToStream: video.readyToStream ?? false,
      status: video.status?.state ?? 'unknown',
      duration: video.duration ?? 0,
      thumbnail: video.thumbnail ?? null,
      hlsUrl: `https://videodelivery.net/${videoId}/manifest/video.m3u8`,
      iframe: `https://iframe.cloudflarestream.com/${videoId}`,
      playback: {
        hls: video.playback?.hls ?? null,
        dash: video.playback?.dash ?? null,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
