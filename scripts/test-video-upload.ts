/**
 * Film Room Upload + Signed Video Test
 *
 * Full lifecycle:
 *   create session → sign part → PUT real bytes → complete → attach
 *   → video-token → range GET → cross-user denial
 *   + ETag / non-contiguous / decimal-partNumber validation
 *
 * Cleanup:
 *   - Test auth users deleted via admin API
 *   - Test game deleted via API (removes DB rows)
 *   - Test R2 object deleted via S3 API (DB cascade does NOT delete R2 objects)
 *   - All cleanup errors reported; none silently ignored
 *
 * Explicit skip (exit 0, not pass) if Film Room keys absent.
 * Summary and exit code always set in finally block regardless of early failures.
 *
 * Usage:
 *   BASE_URL=http://localhost:3004 \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://gurhiziqghzuqumpzkig.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=<anon key> \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=<service key> \
 *   FILMROOM_TEST_PROJECT_HOST=gurhiziqghzuqumpzkig.supabase.co \
 *   npx ts-node --transpile-only scripts/test-video-upload.ts
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local without overriding keys already in shell env.
// Provides R2 credentials when coordinator only injected Film Room Supabase keys.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv') as { config: (o: object) => void }
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false })
} catch { /* dotenv optional */ }

const BASE_URL      = process.env.BASE_URL ?? 'http://localhost:3004'
const SUPABASE_URL  = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
const ANON_KEY      = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY
const SERVICE_KEY   = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY
const APPROVED_HOST = process.env.FILMROOM_TEST_PROJECT_HOST
const R2_KEY_ID     = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const R2_SECRET     = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const R2_ENDPOINT   = process.env.CLOUDFLARE_R2_ENDPOINT
const R2_BUCKET     = process.env.CLOUDFLARE_R2_BUCKET
const LIVE_DOMAIN   = 'www.njsbuilds.com'
const RESTOREPORTS  = 'suhfyckmuenjskitrzlq.supabase.co'

// ── Prerequisite check ────────────────────────────────────────────────────────
function checkPrereqs(): string | null {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY)
    return 'Film Room Supabase keys not in env. Add NEXT_PUBLIC_FILMROOM_SUPABASE_URL, ' +
           'NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY, FILMROOM_SUPABASE_SERVICE_ROLE_KEY.'
  if (new URL(SUPABASE_URL).hostname === RESTOREPORTS)
    return 'ABORT: Supabase URL must not be the RestoReports project'
  if (!APPROVED_HOST || new URL(SUPABASE_URL).hostname !== APPROVED_HOST)
    return 'ABORT: FILMROOM_TEST_PROJECT_HOST must match Supabase URL host'
  if (BASE_URL.includes(LIVE_DOMAIN))
    return 'ABORT: BASE_URL must not target live production domain'
  return null
}

const prereqError = checkPrereqs()
if (prereqError) {
  console.log('\n⏭  SKIP — prerequisites not met:')
  console.log('  ' + prereqError)
  console.log('\nThis is an explicit skip, not a pass.')
  process.exit(0)
}

const svc = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } })

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT!,
    credentials: { accessKeyId: R2_KEY_ID!, secretAccessKey: R2_SECRET! },
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    responseChecksumValidation: 'WHEN_REQUIRED' as const,
  })
}

// ── Assertions ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0

function ok(label: string) { console.log(`  ✅ ${label}`); passed++ }
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++
}

// Renamed from `require` to avoid shadowing CommonJS require
class PrereqError extends Error { constructor(msg: string) { super(msg) } }

function assertPrereq(label: string, cond: boolean, detail?: string): void {
  if (!cond) {
    fail('PREREQ FAILED: ' + label, detail)
    throw new PrereqError(`Prerequisite failed: ${label}${detail ? ' — ' + detail : ''}`)
  }
  ok('PREREQ: ' + label)
}

async function signIn(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>()
  const client = createServerClient(SUPABASE_URL!, ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (list) => { for (const { name, value } of list) jar.set(name, value) },
    },
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message}`)
  await client.auth.getSession()
  if (jar.size === 0) {
    const ref = new URL(SUPABASE_URL!).hostname.split('.')[0]
    jar.set(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    }))
  }

  const cookieStr = [...jar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ')

  // Verify cookie authenticates against the API — no content sniffing.
  const verifyRes = await fetch(`${BASE_URL}/api/filmroom/games`, {
    headers: { Cookie: cookieStr },
  })
  if (verifyRes.status !== 200) {
    throw new Error(
      `Cookie for ${email} does not authenticate: GET /api/filmroom/games → ${verifyRes.status}. ` +
      `Cookie keys: ${[...jar.keys()].join(', ')}`
    )
  }

  return cookieStr
}

async function apiAs(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🎬 Film Room Upload + Video Test`)
  console.log(`   Supabase: ${new URL(SUPABASE_URL!).hostname}`)
  console.log(`   Target:   ${BASE_URL}\n`)

  const suffix  = Date.now()
  const email   = `test-upload-${suffix}@filmroom-test.invalid`
  const pw      = 'Test-Upload-2026!'

  // Track all resources created so finally can clean them up
  let userId: string | null = null
  let userId2: string | null = null
  let cookie = ''
  let gameId: string | null = null
  let uploadedR2Key: string | null = null        // exact R2 key for cleanup
  let cleanupErrors: string[] = []

  try {
    // ── Setup ──────────────────────────────────────────────────────────────
    console.log('📦 Setup')
    const { data: u, error: ue } = await svc.auth.admin.createUser({
      email, password: pw, email_confirm: true,
    })
    assertPrereq('test user created', !ue && !!u?.user, ue?.message)
    userId = u!.user!.id

    cookie = await signIn(email, pw)
    const { status: authSt } = await apiAs(cookie, 'GET', '/api/filmroom/games')
    assertPrereq('user authenticated', authSt === 200,
      `got ${authSt} — are Film Room env vars loaded in the server?`)

    const { status: tSt, data: tD } = await apiAs(cookie, 'POST', '/api/filmroom/teams',
      { name: 'Upload Test Team', season: '2025-26', sport: 'basketball' })
    assertPrereq('team provisioned', tSt === 200 || tSt === 201, `got ${tSt}`)
    const teamId = (tD as { id?: string })?.id
    assertPrereq('team ID returned', !!teamId)

    const { status: gSt, data: gD } = await apiAs(cookie, 'POST', '/api/filmroom/games',
      { team_id: teamId, opponent: 'Upload Test Opp', game_date: '2026-01-01' })
    assertPrereq('test game created', gSt === 201, `got ${gSt}`)
    gameId = (gD as { id?: string })?.id ?? null
    assertPrereq('game ID returned', !!gameId)

    // ── 1. Video token — no video yet ─────────────────────────────────────
    console.log('\n1. Video token — no video')
    const { status: vs } = await apiAs(cookie, 'GET', `/api/filmroom/video-token?gameId=${gameId}`)
    vs === 404 ? ok(`video-token no-video → 404`) : fail('expected 404', `got ${vs}`)

    // ── 2. Validation ─────────────────────────────────────────────────────
    console.log('\n2. Payload validation')
    const { data: vSess } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: gameId, filename: 'val.mp4', fileSizeBytes: 5 * 1024 * 1024 })
    const vSessionId = (vSess as { sessionId?: string })?.sessionId
    assertPrereq('validation session', !!vSessionId)

    const { status: fabS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId: vSessionId, parts: [{ PartNumber: 1, ETag: '"part-1"' }] })
    fabS === 400 ? ok('Fabricated ETag → 400') : fail('Fabricated ETag should 400', `got ${fabS}`)

    const { status: ncS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId: vSessionId, parts: [
        { PartNumber: 1, ETag: '"a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"' },
        { PartNumber: 3, ETag: '"da39a3ee5e6b4b0d3255bfef95601890afd80709"' },
      ]})
    ncS === 400 ? ok('Non-contiguous parts → 400') : fail('Non-contiguous should 400', `got ${ncS}`)

    const { status: decS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part',
      { sessionId: vSessionId, partNumber: 1.5 })
    decS === 400 ? ok('Decimal partNumber → 400') : fail('Decimal partNumber should 400', `got ${decS}`)

    await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId: vSessionId })

    // ── 3. Full upload lifecycle ──────────────────────────────────────────
    console.log('\n3. Full upload: create → PUT → complete → attach')

    let testFile: Buffer
    const realFile = '/tmp/FilmRoom-upload-check.mp4'
    if (fs.existsSync(realFile)) {
      testFile = fs.readFileSync(realFile)
      ok(`Real test file: ${realFile} (${(testFile.length / 1024 / 1024).toFixed(2)} MB)`)
    } else {
      testFile = Buffer.alloc(5.5 * 1024 * 1024, 0x00)
      testFile.write('filmroom-test-synthetic', 0, 'utf8')
      ok(`Synthetic 5.5 MB test file`)
    }

    // Create session — capture r2_key from response for later cleanup
    const { status: cSt, data: cD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: gameId, filename: 'test-upload.mp4', fileSizeBytes: testFile.length })
    assertPrereq('create session → 200', cSt === 200, `got ${cSt} — ${JSON.stringify(cD).slice(0, 100)}`)
    const sessionId = (cD as { sessionId?: string })?.sessionId
    const r2Key     = (cD as { key?: string })?.key          // server returns key; capture for R2 cleanup
    assertPrereq('sessionId returned', !!sessionId)
    if (r2Key) {
      uploadedR2Key = r2Key
      ok(`R2 key captured for cleanup: ${r2Key.slice(0, 40)}…`)
    }

    // Sign part
    const { status: pSt, data: pD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part', { sessionId, partNumber: 1 })
    assertPrereq('sign part → 200', pSt === 200, `got ${pSt}`)
    const signedUrl = (pD as { signedUrl?: string })?.signedUrl
    assertPrereq('signedUrl returned', !!signedUrl)

    // PUT real bytes
    console.log(`  Uploading ${(testFile.length / 1024 / 1024).toFixed(2)} MB to R2…`)
    const putRes = await fetch(signedUrl!, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(testFile.length) },
      body: new Uint8Array(testFile),
    })
    if (!putRes.ok) {
      fail(`PUT to R2 → expected 200`, `got ${putRes.status}`)
      await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })
      throw new PrereqError('R2 PUT failed')
    }
    ok(`PUT to R2 → ${putRes.status}`)

    const etag = putRes.headers.get('ETag') ?? putRes.headers.get('etag')
    if (!etag) {
      fail('Real ETag from R2', 'R2 did not return ETag — cannot complete')
      await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })
      throw new PrereqError('No ETag from R2')
    }
    if (/^"?part-\d+"?$/.test(etag.trim())) {
      fail('ETag must not be fabricated', etag)
      throw new PrereqError('Fabricated ETag from R2')
    }
    ok(`Real ETag: ${etag.slice(0, 24)}…`)

    // Complete
    const { status: compSt, data: compD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId, parts: [{ PartNumber: 1, ETag: etag }], totalBytes: testFile.length })
    assertPrereq('complete → 200', compSt === 200,
      `got ${compSt} — ${JSON.stringify(compD).slice(0, 120)}`)
    ok(`attached: ${(compD as { attached?: boolean })?.attached}`)

    // ── 4. Game has video_url ─────────────────────────────────────────────
    console.log('\n4. Game record')
    const { status: gGetSt, data: gGetD } = await apiAs(cookie, 'GET', `/api/filmroom/games/${gameId}`)
    gGetSt === 200 ? ok('game GET → 200') : fail('game GET', `got ${gGetSt}`)
    const videoUrl = (gGetD as { video_url?: string })?.video_url
    videoUrl ? ok('game.video_url set') : fail('game.video_url should be set after upload')

    // ── 5. video-token ────────────────────────────────────────────────────
    console.log('\n5. Signed video token')
    const { status: vtSt, data: vtD } = await apiAs(cookie, 'GET',
      `/api/filmroom/video-token?gameId=${gameId}`)
    assertPrereq('video-token → 200', vtSt === 200,
      `got ${vtSt} — ${JSON.stringify(vtD).slice(0, 100)}`)
    const videoSrc    = (vtD as { src?: string })?.src
    const videoType   = (vtD as { type?: string })?.type
    const expiresIn   = (vtD as { expiresInSeconds?: number })?.expiresInSeconds
    ok(`type=${videoType} expiresIn=${expiresIn}s`)
    videoSrc  ? ok('src URL returned') : fail('src URL missing')
    if (videoType === 'r2' && !expiresIn) fail('R2 token should have expiresInSeconds')

    // ── 6. Range GET ─────────────────────────────────────────────────────
    if (videoSrc) {
      console.log('\n6. Range GET')
      const rangeRes = await fetch(videoSrc, { headers: { Range: 'bytes=0-1023' } })
      rangeRes.status === 206 || rangeRes.status === 200
        ? ok(`Range GET → ${rangeRes.status}`)
        : fail('Range GET', `got ${rangeRes.status}`)
      if (rangeRes.ok || rangeRes.status === 206) {
        const buf = await rangeRes.arrayBuffer()
        ok(`Read ${buf.byteLength} bytes from signed URL`)
      }
    }

    // ── 7. Cross-user isolation ───────────────────────────────────────────
    console.log('\n7. Cross-user isolation')
    const email2 = `test-upload-b-${suffix}@filmroom-test.invalid`
    try {
      const { data: u2, error: ue2 } = await svc.auth.admin.createUser({
        email: email2, password: pw, email_confirm: true,
      })
      assertPrereq('user B created', !ue2 && !!u2?.user, ue2?.message)
      userId2 = u2!.user!.id
      const cookieB = await signIn(email2, pw)

      const { status: bGame } = await apiAs(cookieB, 'GET', `/api/filmroom/games/${gameId}`)
      bGame === 403 || bGame === 404
        ? ok(`B cannot GET A's game → ${bGame}`)
        : fail("B denied A's game", `got ${bGame}`)

      const { status: bVt } = await apiAs(cookieB, 'GET', `/api/filmroom/video-token?gameId=${gameId}`)
      bVt === 403
        ? ok(`B cannot get video token → 403`)
        : fail('B should be denied video token', `got ${bVt}`)
    } catch (e) {
      if (!(e instanceof PrereqError)) throw e
    }

  } catch (e) {
    if (!(e instanceof PrereqError)) {
      // Unexpected error — count as failure
      fail('Unexpected error', (e as Error).message)
    }
    // PrereqErrors already counted via fail() in assertPrereq — just fall through to finally
  } finally {
    // ── Cleanup — always runs; all errors captured ────────────────────────
    console.log('\n🧹 Cleanup')

    // 1. Delete test R2 object — DB cascade does NOT delete R2 objects
    if (uploadedR2Key && R2_KEY_ID && R2_SECRET && R2_ENDPOINT && R2_BUCKET) {
      try {
        await r2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: uploadedR2Key }))
        console.log(`  ✅ R2 object deleted: ${uploadedR2Key.slice(0, 50)}…`)
      } catch (e) {
        const msg = `R2 delete failed for ${uploadedR2Key}: ${(e as Error).message}`
        cleanupErrors.push(msg)
        console.error(`  ⚠ ${msg}`)
      }
    } else if (uploadedR2Key) {
      cleanupErrors.push('R2 credentials not in env — R2 object NOT deleted: ' + uploadedR2Key)
      console.error(`  ⚠ R2 credentials missing — object NOT deleted: ${uploadedR2Key.slice(0, 50)}…`)
      console.error('    Add CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY / CLOUDFLARE_R2_ENDPOINT / CLOUDFLARE_R2_BUCKET to env')
    }

    // 2. Delete test game (removes DB rows; R2 already handled above)
    if (gameId && cookie) {
      try {
        const { status } = await apiAs(cookie, 'DELETE', `/api/filmroom/games/${gameId}`)
        status === 200
          ? console.log(`  ✅ Test game deleted`)
          : cleanupErrors.push(`Game delete returned ${status} for ${gameId}`)
      } catch (e) {
        cleanupErrors.push(`Game delete threw: ${(e as Error).message}`)
      }
    }

    // 3. Delete test users via admin API
    for (const [uid, label] of [[userId, 'user A'], [userId2, 'user B']] as const) {
      if (!uid) continue
      try {
        const { error } = await svc.auth.admin.deleteUser(uid)
        error
          ? cleanupErrors.push(`${label} delete error: ${error.message}`)
          : console.log(`  ✅ ${label} deleted`)
      } catch (e) {
        cleanupErrors.push(`${label} delete threw: ${(e as Error).message}`)
      }
    }

    if (cleanupErrors.length > 0) {
      console.error('\n  ⚠ Cleanup errors (manual action may be needed):')
      cleanupErrors.forEach(e => console.error('    ' + e))
    }

    // ── Summary — always printed, exit code always set ────────────────────
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`${passed} passed, ${failed} failed`)
    if (cleanupErrors.length > 0) console.log(`${cleanupErrors.length} cleanup warning(s)`)
    if (failed > 0) {
      console.error('❌ Test failures — do not deploy')
      process.exitCode = 1
    } else {
      console.log('✅ All tests passed')
      process.exitCode = 0
    }
  }
}

run().catch(e => {
  console.error('Runner error:', e)
  process.exitCode = 1
})
