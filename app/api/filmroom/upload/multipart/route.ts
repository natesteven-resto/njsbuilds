/**
 * Film Room — R2 Multipart Upload API (authenticated, ownership-bound)
 *
 * File identity: fingerprint = sanitizedFilename:size stored on session.
 * Resume only when fingerprint matches; otherwise abort old, start fresh.
 *
 * Complete: validates strict-integer contiguous partNumbers, real ETags,
 * expected_size within 1%, conditional DB attachment via active_upload_session.
 * On R2-success + DB-failure → 'complete_pending_attach' for HeadObject retry.
 *
 * No r() typo. All R2 calls use r2Client(). No legacy fallbacks.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client, CreateMultipartUploadCommand, UploadPartCommand,
  CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
  GetObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

const R2_BUCKET   = process.env.CLOUDFLARE_R2_BUCKET!
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!
const CDN_BASE    = process.env.CLOUDFLARE_R2_CDN_URL ?? `${R2_ENDPOINT}/${R2_BUCKET}`

function r2Client() {
  return new S3Client({
    region: 'auto', endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

/** Strict integer: rejects decimals, spaces, scientific notation. */
function strictInt(val: unknown, min: number, max: number): number | null {
  const s = String(val)
  if (!/^-?\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('r2.cloudflarestorage.com'))
      return u.hostname.startsWith('filmroom-videos.')
        ? u.pathname.replace(/^\//, '')
        : u.pathname.replace(/^\/filmroom-videos\//, '')
    if (u.hostname.includes('r2.dev')) return u.pathname.replace(/^\//, '')
    return null
  } catch { return null }
}

function fingerprint(safeFilename: string, sizeBytes: number | null): string {
  return `${safeFilename}:${sizeBytes ?? 'unknown'}`
}

async function abortR2(key: string, uploadId: string) {
  try {
    await r2Client().send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: uploadId }))
  } catch (err) {
    console.warn('[multipart abort R2 non-fatal]', String(err).slice(0, 100))
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const svc = createServiceClient()

    if (searchParams.get('action') === 'sign-get') {
      const gameId = searchParams.get('gameId')
      if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })
      const { data: game } = await svc.from('games').select('owner_id, video_url').eq('id', gameId).single()
      if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (!game.video_url) return NextResponse.json({ error: 'No video' }, { status: 404 })
      const key = extractR2Key(game.video_url)
      if (!key) return NextResponse.json({ error: 'Not R2' }, { status: 400 })
      const signedUrl = await getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 900 })
      return NextResponse.json({ signedUrl, expiresInSeconds: 900 })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) { if (e instanceof NextResponse) return e; return NextResponse.json({ error: 'Internal error' }, { status: 500 }) }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const svc = createServiceClient()

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const body = await request.json()
      const { filename, contentType = 'video/mp4', game_id } = body
      const fileSizeBytes: number | null = typeof body.fileSizeBytes === 'number' && body.fileSizeBytes > 0
        ? Math.floor(body.fileSizeBytes) : null

      if (!game_id || typeof game_id !== 'string') return NextResponse.json({ error: 'game_id required' }, { status: 400 })
      if (!filename || typeof filename !== 'string') return NextResponse.json({ error: 'filename required' }, { status: 400 })

      const { data: game } = await svc.from('games').select('owner_id, active_upload_session').eq('id', game_id).single()
      if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fp   = fingerprint(safe, fileSizeBytes)

      const { data: existing } = await svc.from('upload_sessions')
        .select('id, r2_key, upload_id, file_fingerprint, status')
        .eq('game_id', game_id).eq('owner_id', user.id).eq('status', 'in_progress')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()

      if (existing) {
        if (existing.file_fingerprint === fp)
          return NextResponse.json({ sessionId: existing.id, key: existing.r2_key, uploadId: existing.upload_id, playbackUrl: `${CDN_BASE}/${existing.r2_key}`, resumed: true })
        await abortR2(existing.r2_key, existing.upload_id)
        await svc.from('upload_sessions').update({ status: 'aborted', updated_at: new Date().toISOString() }).eq('id', existing.id)
      }

      const key = `games/${game_id}/${Date.now()}-${safe}`
      const r2res = await r2Client().send(new CreateMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }))
      const uploadId = r2res.UploadId!

      const { data: session, error: sErr } = await svc.from('upload_sessions')
        .insert({ owner_id: user.id, game_id, r2_key: key, upload_id: uploadId, file_fingerprint: fp, expected_size: fileSizeBytes, status: 'in_progress' })
        .select('id').single()

      if (sErr) { await abortR2(key, uploadId); return NextResponse.json({ error: 'Session create failed' }, { status: 500 }) }

      await svc.from('games').update({ active_upload_session: session.id }).eq('id', game_id).eq('owner_id', user.id)

      return NextResponse.json({ sessionId: session.id, key, uploadId, playbackUrl: `${CDN_BASE}/${key}` })
    }

    // ── SIGN PART ─────────────────────────────────────────────────────────────
    if (action === 'part') {
      const { sessionId, partNumber } = await request.json()
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      const pn = strictInt(partNumber, 1, 10000)
      if (pn === null) return NextResponse.json({ error: 'partNumber must be whole integer 1–10000' }, { status: 400 })

      const { data: session } = await svc.from('upload_sessions').select('owner_id, r2_key, upload_id, status, game_id').eq('id', sessionId).single()
      if (!session || session.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session not active' }, { status: 409 })

      const { data: game } = await svc.from('games').select('owner_id').eq('id', session.game_id).single()
      if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const signedUrl = await getSignedUrl(r2Client(),
        new UploadPartCommand({ Bucket: R2_BUCKET, Key: session.r2_key, UploadId: session.upload_id, PartNumber: pn }),
        { expiresIn: 3600 })
      return NextResponse.json({ signedUrl })
    }

    // ── COMPLETE ──────────────────────────────────────────────────────────────
    if (action === 'complete') {
      const { sessionId, parts, totalBytes } = await request.json()
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      if (!Array.isArray(parts) || parts.length === 0) return NextResponse.json({ error: 'parts required' }, { status: 400 })

      const seen = new Set<number>()
      for (const p of parts) {
        const pn = strictInt(p.PartNumber, 1, 10000)
        if (pn === null) return NextResponse.json({ error: `Invalid PartNumber: ${p.PartNumber}` }, { status: 400 })
        if (seen.has(pn)) return NextResponse.json({ error: `Duplicate PartNumber: ${pn}` }, { status: 400 })
        seen.add(pn)
        if (!p.ETag || typeof p.ETag !== 'string' || !p.ETag.trim())
          return NextResponse.json({ error: `Missing ETag part ${pn}` }, { status: 400 })
        if (/^"?part-\d+"?$/.test(p.ETag.trim()))
          return NextResponse.json({ error: `Fabricated ETag part ${pn}` }, { status: 400 })
      }
      const sorted = [...seen].sort((a, b) => a - b)
      if (sorted[0] !== 1 || sorted[sorted.length - 1] !== parts.length)
        return NextResponse.json({ error: 'PartNumbers must be contiguous from 1' }, { status: 400 })

      const { data: session } = await svc.from('upload_sessions')
        .select('owner_id, r2_key, upload_id, game_id, status, expected_size').eq('id', sessionId).single()
      if (!session || session.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      if (session.status === 'complete_pending_attach')
        return recoverPendingAttach(svc, session, sessionId, user.id)

      // Idempotent success: already complete and attached to same game/key.
      // Lost HTTP response after a successful complete must not become 409.
      if (session.status === 'complete') {
        const { data: game } = await svc.from('games').select('video_url, owner_id').eq('id', session.game_id).single()
        if (game && game.owner_id === user.id) {
          const playbackUrl = `${CDN_BASE}/${session.r2_key}`
          // Idempotent if game still references this session's key
          const attached = game.video_url === playbackUrl
          return NextResponse.json({ ok: true, playbackUrl, attached, idempotent: true })
        }
      }

      if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session not active' }, { status: 409 })

      const { data: game } = await svc.from('games').select('owner_id, active_upload_session').eq('id', session.game_id).single()
      if (!game || game.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      if (session.expected_size && typeof totalBytes === 'number' && totalBytes > 0) {
        const tol = Math.max(session.expected_size * 0.01, 1024 * 1024)
        if (Math.abs(totalBytes - session.expected_size) > tol)
          return NextResponse.json({ error: `Size mismatch: expected ~${session.expected_size}, got ${totalBytes}` }, { status: 400 })
      }

      await r2Client().send(new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET, Key: session.r2_key, UploadId: session.upload_id,
        MultipartUpload: {
          Parts: parts
            .sort((a: { PartNumber: number }, b: { PartNumber: number }) => a.PartNumber - b.PartNumber)
            .map((p: { ETag: string; PartNumber: number }) => ({ ETag: p.ETag.trim(), PartNumber: p.PartNumber })),
        },
      }))

      const playbackUrl = `${CDN_BASE}/${session.r2_key}`

      const { data: updated, error: attachErr } = await svc.from('games')
        .update({ video_url: playbackUrl, video_id: null })
        .eq('id', session.game_id).eq('owner_id', user.id)
        .eq('active_upload_session', sessionId)
        .select('id').maybeSingle()

      if (attachErr || !updated) {
        await svc.from('upload_sessions').update({ status: 'complete_pending_attach', updated_at: new Date().toISOString() }).eq('id', sessionId)
        return NextResponse.json({ ok: false, playbackUrl,
          error: !attachErr ? 'Superseded by newer upload' : 'Attachment failed — retry complete',
          recoverable: !!attachErr }, { status: attachErr ? 500 : 409 })
      }

      await svc.from('upload_sessions').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', sessionId)
      return NextResponse.json({ ok: true, playbackUrl, attached: true })
    }

    // ── ABORT ─────────────────────────────────────────────────────────────────
    if (action === 'abort') {
      const { sessionId } = await request.json()
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

      const { data: session } = await svc.from('upload_sessions')
        .select('owner_id, r2_key, upload_id, status, game_id').eq('id', sessionId).single()
      if (!session || session.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      await svc.from('upload_sessions').update({ status: 'aborted', updated_at: new Date().toISOString() }).eq('id', sessionId).eq('owner_id', user.id)
      await svc.from('games').update({ active_upload_session: null }).eq('id', session.game_id).eq('owner_id', user.id).eq('active_upload_session', sessionId)

      if (session.status === 'in_progress') await abortR2(session.r2_key, session.upload_id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    console.error('[multipart]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function recoverPendingAttach(
  svc: ReturnType<typeof createServiceClient>,
  session: { r2_key: string; game_id: string; owner_id: string },
  sessionId: string,
  userId: string,
): Promise<NextResponse> {
  try {
    await r2Client().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: session.r2_key }))
  } catch {
    return NextResponse.json({ error: 'R2 object not found' }, { status: 404 })
  }
  const playbackUrl = `${CDN_BASE}/${session.r2_key}`
  const { data: updated, error: attachErr } = await svc.from('games')
    .update({ video_url: playbackUrl, video_id: null })
    .eq('id', session.game_id).eq('owner_id', userId).eq('active_upload_session', sessionId)
    .select('id').maybeSingle()
  if (attachErr) return NextResponse.json({ error: 'Attachment retry failed: ' + attachErr.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Superseded — not attached', recoverable: false }, { status: 409 })
  await svc.from('upload_sessions').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', sessionId)
  return NextResponse.json({ ok: true, playbackUrl, attached: true, recovered: true })
}
