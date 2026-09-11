/**
 * Film Room — R2 Multipart Upload API
 *
 * POST  ?action=create   → { uploadId, key, playbackUrl }
 * POST  ?action=part     → { signedUrl }   body: { uploadId, key, partNumber }
 * POST  ?action=complete → {}              body: { uploadId, key, parts: [{ETag,PartNumber}] }
 * POST  ?action=abort    → {}              body: { uploadId, key }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const client = r2Client()

  try {
    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { filename, contentType = 'video/mp4', gameId } = await req.json()
      if (!filename || !gameId) {
        return NextResponse.json({ error: 'filename and gameId required' }, { status: 400 })
      }
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const key = `games/${gameId}/${Date.now()}-${safeFilename}`

      const cmd = new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
      })
      const res = await client.send(cmd)
      const playbackUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`
      return NextResponse.json({ uploadId: res.UploadId, key, playbackUrl })
    }

    // ── SIGN PART ─────────────────────────────────────────────────────────────
    if (action === 'part') {
      const { uploadId, key, partNumber } = await req.json()
      if (!uploadId || !key || !partNumber) {
        return NextResponse.json({ error: 'uploadId, key, partNumber required' }, { status: 400 })
      }
      const cmd = new UploadPartCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      })
      const signedUrl = await getSignedUrl(client, cmd, { expiresIn: 3600 })
      return NextResponse.json({ signedUrl })
    }

    // ── COMPLETE ──────────────────────────────────────────────────────────────
    if (action === 'complete') {
      const { uploadId, key, parts } = await req.json()
      if (!uploadId || !key || !parts?.length) {
        return NextResponse.json({ error: 'uploadId, key, parts required' }, { status: 400 })
      }
      const cmd = new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((p: { ETag: string; PartNumber: number }) => ({
            ETag: p.ETag,
            PartNumber: p.PartNumber,
          })),
        },
      })
      await client.send(cmd)
      return NextResponse.json({ ok: true })
    }

    // ── ABORT ─────────────────────────────────────────────────────────────────
    if (action === 'abort') {
      const { uploadId, key } = await req.json()
      if (!uploadId || !key) {
        return NextResponse.json({ error: 'uploadId and key required' }, { status: 400 })
      }
      const cmd = new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
      })
      await client.send(cmd)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[multipart]', action, err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
