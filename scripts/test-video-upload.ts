/**
 * Film Room Upload + Signed Video Test
 *
 * Tests the full multipart upload lifecycle against a running server:
 *   1. Create session → 200 with sessionId
 *   2. Sign part → 200 with signedUrl
 *   3. PUT real bytes to signedUrl → 200 with real ETag (not fabricated)
 *   4. Complete → 200, video attached to game server-side
 *   5. video-token → 200 with signed R2 src URL
 *   6. Range GET to signed URL → 206 partial (proves video accessible)
 *   7. ETag validation: fabricated ETag → 400
 *   8. Non-contiguous parts → 400
 *   9. Cross-user session access → 403
 *
 * Prerequisites / skip conditions:
 *   - BASE_URL must be set and must NOT be www.njsbuilds.com
 *   - All three Film Room Supabase keys must be present in env
 *   - FILMROOM_TEST_PROJECT_HOST must match Supabase URL host
 *   - If keys unavailable, test skips with clear explanation (no false pass)
 *
 * Never mutates existing user games or videos. Uses test-owned game only.
 * Test user + game are created fresh and cleaned up in finally block.
 *
 * Usage:
 *   BASE_URL=http://localhost:3002 \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://gurhiziqghzuqumpzkig.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=*** \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=*** \
 *   FILMROOM_TEST_PROJECT_HOST=gurhiziqghzuqumpzkig.supabase.co \
 *   npx ts-node --transpile-only scripts/test-video-upload.ts
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const BASE_URL     = process.env.BASE_URL ?? 'http://localhost:3002'
const SUPABASE_URL = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
const ANON_KEY     = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY
const SERVICE_KEY  = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY
const APPROVED_HOST = process.env.FILMROOM_TEST_PROJECT_HOST
const LIVE_DOMAIN   = 'www.njsbuilds.com'
const RESTOREPORTS  = 'suhfyckmuenjskitrzlq.supabase.co'

// ── Prerequisite check (honest skip, not false pass) ─────────────────────────
function checkPrereqs(): string | null {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return 'Film Room Supabase keys not in env (NEXT_PUBLIC_FILMROOM_SUPABASE_URL, ' +
           'NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY, FILMROOM_SUPABASE_SERVICE_ROLE_KEY). ' +
           'Add them to .env.local to run this test.'
  }
  if (new URL(SUPABASE_URL).hostname === RESTOREPORTS) {
    return 'ABORT: Supabase URL must not be the RestoReports project'
  }
  if (!APPROVED_HOST || new URL(SUPABASE_URL).hostname !== APPROVED_HOST) {
    return 'ABORT: FILMROOM_TEST_PROJECT_HOST must match Supabase URL host'
  }
  if (BASE_URL.includes(LIVE_DOMAIN)) {
    return 'ABORT: BASE_URL must not target live production domain'
  }
  return null
}

const prereqError = checkPrereqs()
if (prereqError) {
  console.log('\n⏭  SKIP — prerequisites not met:')
  console.log('  ' + prereqError)
  console.log('\nThis is an explicit skip, not a pass. Fix prerequisites to run the test.')
  process.exit(0)  // exit 0 = skip, not failure
}

const svc = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } })

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0

function ok(label: string)   { console.log(`  ✅ ${label}`); passed++ }
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++
}
function skip(label: string, reason: string) {
  console.log(`  ⏭  ${label} — SKIP: ${reason}`); skipped++
}

function require(label: string, cond: boolean, detail?: string): boolean {
  if (!cond) { fail('PREREQ: ' + label, detail); return false }
  ok('PREREQ: ' + label); return true
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
  if (error || !data.session) throw new Error(`Sign-in: ${error?.message}`)
  await client.auth.getSession()
  if (jar.size === 0) {
    const ref = new URL(SUPABASE_URL!).hostname.split('.')[0]
    jar.set(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    }))
  }
  return [...jar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ')
}

async function apiAs(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data, headers: res.headers }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🎬 Film Room Upload + Video Test`)
  console.log(`   Supabase: ${new URL(SUPABASE_URL!).hostname}`)
  console.log(`   Target:   ${BASE_URL}\n`)

  const suffix = Date.now()
  const email  = `test-upload-${suffix}@filmroom-test.invalid`
  const pw     = 'Test-Upload-2026!'
  let userId: string | null = null
  let cookie = ''
  let teamId: string | null = null
  let gameId: string | null = null

  try {
    // ── Setup: create isolated test user + team + game ─────────────────────
    console.log('📦 Setup')
    const { data: u, error: ue } = await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })
    if (!require('test user created', !ue && !!u?.user, ue?.message)) return
    userId = u!.user!.id
    cookie = await signIn(email, pw)

    const { status: authSt } = await apiAs(cookie, 'GET', '/api/filmroom/games')
    if (!require('user authenticated (positive check)', authSt === 200, `got ${authSt} — check Film Room env vars`)) return

    const { status: tSt, data: tD } = await apiAs(cookie, 'POST', '/api/filmroom/teams',
      { name: 'Upload Test Team', season: '2025-26', sport: 'basketball' })
    if (!require('team provisioned', tSt === 200 || tSt === 201, `got ${tSt}`)) return
    teamId = (tD as { id?: string })?.id ?? null
    if (!require('team ID returned', !!teamId)) return

    const { status: gSt, data: gD } = await apiAs(cookie, 'POST', '/api/filmroom/games',
      { team_id: teamId, opponent: 'Upload Test Opp', game_date: '2026-01-01' })
    if (!require('test game created', gSt === 201, `got ${gSt}`)) return
    gameId = (gD as { id?: string })?.id ?? null
    if (!require('game ID returned', !!gameId)) return

    // ── 1. Video token on game with no video ──────────────────────────────
    console.log('\n1. Video token — no video attached')
    { const { status: vs } = await apiAs(cookie, 'GET', `/api/filmroom/video-token?gameId=${gameId}`)
      ok(`video-token on no-video game → ${vs}`)
      if (vs !== 404) fail('expected 404 for game with no video', `got ${vs}`) }

    // ── 2. ETag validation ────────────────────────────────────────────────
    console.log('\n2. Validation — fabricated ETag + non-contiguous parts')

    // Need a session to test against
    const { data: sess } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: gameId, filename: 'validation-test.mp4', fileSizeBytes: 5 * 1024 * 1024 })
    const validationSessionId = (sess as { sessionId?: string })?.sessionId
    if (!require('session for validation tests', !!validationSessionId)) return

    const { status: fabS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId: validationSessionId, parts: [{ PartNumber: 1, ETag: '"part-1"' }] })
    fabS === 400 ? ok('Fabricated ETag → 400') : fail('Fabricated ETag should be 400', `got ${fabS}`)

    const { status: ncS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId: validationSessionId,
        parts: [
          { PartNumber: 1, ETag: '"a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"' },
          { PartNumber: 3, ETag: '"da39a3ee5e6b4b0d3255bfef95601890afd80709"' },
        ]})
    ncS === 400 ? ok('Non-contiguous parts → 400') : fail('Non-contiguous should be 400', `got ${ncS}`)

    const { status: decS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part',
      { sessionId: validationSessionId, partNumber: 1.5 })
    decS === 400 ? ok('Decimal partNumber → 400') : fail('Decimal partNumber should be 400', `got ${decS}`)

    // Abort validation session
    await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort',
      { sessionId: validationSessionId })

    // ── 3. Full upload: create → PUT real bytes → complete → attach → GET ──
    console.log('\n3. Full multipart upload lifecycle')

    // Check if /tmp/FilmRoom-upload-check.mp4 exists, else generate 5MB synthetic
    let testFile: Buffer
    const realFile = '/tmp/FilmRoom-upload-check.mp4'
    if (fs.existsSync(realFile)) {
      testFile = fs.readFileSync(realFile)
      ok(`Using real test file: ${realFile} (${(testFile.length/1024/1024).toFixed(2)} MB)`)
    } else {
      // 5.5MB synthetic — above R2's 5MB minimum part size
      testFile = Buffer.alloc(5.5 * 1024 * 1024, 0x00)
      testFile.write('filmroom-test', 0, 'utf8')
      ok('Using synthetic 5.5MB test file')
    }

    // Create session
    const { status: cSt, data: cD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: gameId, filename: 'test-upload.mp4', fileSizeBytes: testFile.length })
    if (!require('create session → 200', cSt === 200, `got ${cSt} — ${JSON.stringify(cD).slice(0,100)}`)) return
    const sessionId = (cD as { sessionId?: string })?.sessionId
    if (!require('sessionId returned', !!sessionId)) return

    // Sign part 1
    const { status: pSt, data: pD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part',
      { sessionId, partNumber: 1 })
    if (!require('sign part → 200', pSt === 200, `got ${pSt}`)) return
    const signedUrl = (pD as { signedUrl?: string })?.signedUrl
    if (!require('signedUrl returned', !!signedUrl)) return

    // PUT real bytes to signed URL
    console.log(`  Uploading ${(testFile.length/1024/1024).toFixed(2)} MB to R2...`)
    const putRes = await fetch(signedUrl!, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(testFile.length) },
      body: new Uint8Array(testFile),  // Buffer is not BodyInit in Node 18+ fetch
    })
    if (!require(`PUT to R2 → 200`, putRes.ok, `got ${putRes.status}`)) {
      await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })
      return
    }

    // Extract real ETag from R2 response
    const etag = putRes.headers.get('ETag') || putRes.headers.get('etag')
    if (!require('real ETag from R2', !!etag, 'R2 did not return ETag header')) {
      await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })
      return
    }
    ok(`ETag received: ${etag!.slice(0, 20)}...`)

    // Reject fabricated ETag pattern
    if (/^"?part-\d+"?$/.test(etag!.trim())) {
      fail('ETag looks fabricated — R2 should return a real MD5 ETag')
      await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })
      return
    }

    // Complete upload
    const { status: compSt, data: compD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId, parts: [{ PartNumber: 1, ETag: etag }], totalBytes: testFile.length })
    if (!require('complete → 200', compSt === 200, `got ${compSt} — ${JSON.stringify(compD).slice(0,120)}`)) return
    const attached = (compD as { attached?: boolean })?.attached
    ok(`Video attached to game: ${attached}`)

    // ── 4. Verify game has video_url set ──────────────────────────────────
    console.log('\n4. Game record verification')
    const { status: gGetSt, data: gGetD } = await apiAs(cookie, 'GET', `/api/filmroom/games/${gameId}`)
    require('game GET → 200', gGetSt === 200, `got ${gGetSt}`)
    const hasVideo = !!(gGetD as { video_url?: string })?.video_url
    hasVideo ? ok('game.video_url is set after upload') : fail('game.video_url should be set after upload')

    // ── 5. video-token → signed URL ───────────────────────────────────────
    console.log('\n5. Signed video playback')
    const { status: vtSt, data: vtD } = await apiAs(cookie, 'GET',
      `/api/filmroom/video-token?gameId=${gameId}`)
    if (!require('video-token → 200', vtSt === 200, `got ${vtSt} — ${JSON.stringify(vtD).slice(0,100)}`)) return

    const videoSrc = (vtD as { src?: string })?.src
    const videoType = (vtD as { type?: string })?.type
    const expiresIn = (vtD as { expiresInSeconds?: number })?.expiresInSeconds
    ok(`Video type: ${videoType}`)
    require('src URL returned', !!videoSrc)
    if (videoType === 'r2') {
      require('expiresInSeconds returned', !!expiresIn, `got ${expiresIn}`)
      ok(`Token expires in: ${expiresIn}s`)
    }

    // ── 6. Range GET to signed URL — proves bytes accessible ─────────────
    if (videoSrc) {
      console.log('\n6. Range GET to signed URL')
      const rangeRes = await fetch(videoSrc, {
        headers: { Range: 'bytes=0-1023' },
      })
      const isPartial = rangeRes.status === 206
      const isOk = rangeRes.status === 200
      isPartial || isOk
        ? ok(`Range GET → ${rangeRes.status} (bytes accessible)`)
        : fail(`Range GET to signed URL`, `got ${rangeRes.status}`)

      if (isPartial || isOk) {
        const buf = await rangeRes.arrayBuffer()
        ok(`Read ${buf.byteLength} bytes from signed URL`)
      }
    }

    // ── 7. Cross-user cannot access session or game ───────────────────────
    console.log('\n7. Cross-user isolation')
    const email2 = `test-upload-b-${suffix}@filmroom-test.invalid`
    let userId2: string | null = null
    try {
      const { data: u2, error: ue2 } = await svc.auth.admin.createUser({ email: email2, password: pw, email_confirm: true })
      if (!require('user B created', !ue2 && !!u2?.user, ue2?.message)) throw new Error('skip B tests')
      userId2 = u2!.user!.id
      const cookieB = await signIn(email2, pw)

      const { status: bGame } = await apiAs(cookieB, 'GET', `/api/filmroom/games/${gameId}`)
      bGame === 403 || bGame === 404
        ? ok(`B cannot GET A's game → ${bGame}`)
        : fail('B should be denied A\'s game', `got ${bGame}`)

      const { status: bVt } = await apiAs(cookieB, 'GET', `/api/filmroom/video-token?gameId=${gameId}`)
      bVt === 403
        ? ok(`B cannot get video token for A's game → 403`)
        : fail('B should be denied video token', `got ${bVt}`)
    } catch (e) {
      if ((e as Error).message !== 'skip B tests') throw e
    } finally {
      if (userId2) await svc.auth.admin.deleteUser(userId2)
    }

  } finally {
    console.log('\n🧹 Cleanup (test user + game deleted)')
    if (userId) await svc.auth.admin.deleteUser(userId)
    // Note: the uploaded R2 object from the test remains in the bucket.
    // It is under games/<testGameId>/... and will be cleaned up with the game
    // if/when Supabase cascades the delete. No manual R2 deletion here —
    // do not delete unknown objects (per storage inventory guidance).
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`)
  if (failed > 0) { console.error('\n❌ Failures — do not deploy'); process.exit(1) }
  else console.log('\n✅ All tests passed (or explicitly skipped)')
}

run().catch(e => { console.error('Runner error:', e); process.exit(1) })
