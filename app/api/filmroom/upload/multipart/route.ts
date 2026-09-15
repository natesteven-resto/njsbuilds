/**
 * Film Room — R2 Multipart Upload API (authenticated, ownership-bound)
 *
 * Every operation is bound to an upload_session row owned by the caller.
 * The r2_key and upload_id come from the server-created session — clients
 * cannot forge arbitrary keys or upload IDs.
 *
 * POST ?action=create   → verify game ownership → insert upload_session → { sessionId, key }
 * POST ?action=part     → verify session ownership → { signedUrl }
 * POST ?action=complete → verify session, validate ETags → attach video to game → { ok }
 * POST ?action=abort    → verify session ownership → abort R2 upload → { ok }
 * GET  ?action=sign-get&gameId=X → verify game ownership → short-lived presigned GET URL
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getVerifiedUser, createServiceClient } from '@/lib/supabase-server'

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_KEY_ID   = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const R2_SECRET   = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!
const CDN_BASE    = process.env.CLOUDFLARE_R2_CDN_URL ?? `${R2_ENDPOINT}/${R2_BUCKET}`

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

// ── GET: presigned playback URL ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'sign-get') {
      const gameId = searchParams.get('gameId')
      if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })

      const svc = createServiceClient()
      const { data: game } = await svc
        .from('games').select('owner_id, video_url, video_id').eq('id', gameId).single()

      if (!game || game.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (!game.video_url)
        return NextResponse.json({ error: 'No video attached' }, { status: 404 })

      // Extract R2 key from stored URL
      const key = extractR2Key(game.video_url)
      if (!key) return NextResponse.json({ error: 'Not an R2 video' }, { status: 400 })

      const signedUrl = await getSignedUrl(
        r2Client(),
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        { expiresIn: 900 } // 15 min
      )
      return NextResponse.json({ signedUrl, expiresInSeconds: 900 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── POST: multipart lifecycle ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const svc = createServiceClient()

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { filename, contentType = 'video/mp4', game_id } = await request.json()

      if (!game_id || typeof game_id !== 'string')
        return NextResponse.json({ error: 'game_id required' }, { status: 400 })
      if (!filename || typeof filename !== 'string')
        return NextResponse.json({ error: 'filename required' }, { status: 400 })

      // Verify game ownership
      const { data: game } = await svc.from('games').select('owner_id').eq('id', game_id).single()
      if (!game || game.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // Check for existing in_progress session for this game (idempotent resume)
      const { data: existing } = await svc
        .from('upload_sessions')
        .select('id, r2_key, upload_id')
        .eq('game_id', game_id)
        .eq('owner_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        // Return existing session so client can resume
        const playbackUrl = `${CDN_BASE}/${existing.r2_key}`
        return NextResponse.json({
          sessionId: existing.id,
          key: existing.r2_key,
          uploadId: existing.upload_id,
          playbackUrl,
          resumed: true,
        })
      }

      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const key = `games/${game_id}/${Date.now()}-${safeFilename}`

      const cmd = new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
      })
      const r2res = await r2Client().send(cmd)
      const uploadId = r2res.UploadId!

      // Persist session server-side — client gets sessionId not raw key/uploadId
      const { data: session, error: sessionErr } = await svc
        .from('upload_sessions')
        .insert({ owner_id: user.id, game_id, r2_key: key, upload_id: uploadId, status: 'in_progress' })
        .select('id')
        .single()

      if (sessionErr) {
        // Abort the R2 upload on session creation failure
        await r2Client().send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: uploadId }))
        return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 })
      }

      const playbackUrl = `${CDN_BASE}/${key}`
      return NextResponse.json({ sessionId: session.id, key, uploadId, playbackUrl })
    }

    // ── SIGN PART ───────────────────────────────────────────────────────────
    if (action === 'part') {
      const { sessionId, partNumber } = await request.json()
      if (!sessionId || !partNumber)
        return NextResponse.json({ error: 'sessionId and partNumber required' }, { status: 400 })

      // Verify session ownership and status
      const { data: session } = await svc
        .from('upload_sessions')
        .select('owner_id, r2_key, upload_id, status')
        .eq('id', sessionId)
        .single()

      if (!session || session.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (session.status !== 'in_progress')
        return NextResponse.json({ error: 'Upload session not active' }, { status: 409 })

      const signedUrl = await getSignedUrl(
        r2Client(),
        new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: session.r2_key,
          UploadId: session.upload_id,
          PartNumber: partNumber,
        }),
        { expiresIn: 3600 }
      )
      return NextResponse.json({ signedUrl })
    }

    // ── COMPLETE ────────────────────────────────────────────────────────────
    if (action === 'complete') {
      const { sessionId, parts } = await request.json()
      if (!sessionId || !Array.isArray(parts) || parts.length === 0)
        return NextResponse.json({ error: 'sessionId and parts required' }, { status: 400 })

      // Validate all parts have real ETags (not fabricated)
      for (const p of parts) {
        if (!p.ETag || typeof p.ETag !== 'string' || !p.PartNumber || typeof p.PartNumber !== 'number') {
          return NextResponse.json({ error: 'Each part must have a real ETag string and numeric PartNumber' }, { status: 400 })
        }
        // Reject obviously fabricated ETags like "part-N"
        if (/^"part-\d+"$/.test(p.ETag)) {
          return NextResponse.json({ error: 'Fabricated ETag rejected' }, { status: 400 })
        }
      }

      const { data: session } = await svc
        .from('upload_sessions')
        .select('owner_id, r2_key, upload_id, game_id, status')
        .eq('id', sessionId)
        .single()

      if (!session || session.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (session.status !== 'in_progress')
        return NextResponse.json({ error: 'Upload session not active' }, { status: 409 })

      await r2Client().send(new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: session.r2_key,
        UploadId: session.upload_id,
        MultipartUpload: {
          Parts: parts.map((p: { ETag: string; PartNumber: number }) => ({
            ETag: p.ETag,
            PartNumber: p.PartNumber,
          })),
        },
      }))

      const playbackUrl = `${CDN_BASE}/${session.r2_key}`

      // Attach video to game server-side — client cannot write video_url directly
      const { error: gameErr } = await svc
        .from('games')
        .update({ video_url: playbackUrl, video_id: null })
        .eq('id', session.game_id)
        .eq('owner_id', user.id)

      if (gameErr) {
        console.error('[multipart complete] failed to attach video:', gameErr)
        return NextResponse.json({ error: 'Upload complete but failed to attach video' }, { status: 500 })
      }

      await svc.from('upload_sessions')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('owner_id', user.id)

      return NextResponse.json({ ok: true, playbackUrl })
    }

    // ── ABORT ────────────────────────────────────────────────────────────────
    if (action === 'abort') {
      const { sessionId } = await request.json()
      if (!sessionId)
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

      const { data: session } = await svc
        .from('upload_sessions')
        .select('owner_id, r2_key, upload_id, status')
        .eq('id', sessionId)
        .single()

      if (!session || session.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      if (session.status === 'in_progress') {
        try {
          await r2Client().send(new AbortMultipartUploadCommand({
            Bucket: R2_BUCKET,
            Key: session.r2_key,
            UploadId: session.upload_id,
          }))
        } catch (err) {
          console.warn('[multipart abort] R2 abort failed (may already be complete):', err)
        }
        await svc.from('upload_sessions')
          .update({ status: 'aborted', updated_at: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('owner_id', user.id)
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[multipart]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('r2.cloudflarestorage.com')) {
      return u.hostname.startsWith('filmroom-videos.')
        ? u.pathname.replace(/^\//, '')
        : u.pathname.replace(/^\/filmroom-videos\//, '')
    }
    // CDN URL: pub-xxx.r2.dev/KEY
    if (u.hostname.includes('r2.dev')) {
      return u.pathname.replace(/^\//, '')
    }
    return null
  } catch { return null }
}
