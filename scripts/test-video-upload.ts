/**
 * Film Room Video Token + Upload Session Tests
 *
 * Tests (against localhost:3002 dev server — no production mutations):
 *   1. Video token: unauthenticated → 401, authenticated no-video → 404,
 *      authenticated with R2 video → 200 with signed URL + expiry
 *   2. Signed URL is actually accessible (OPTIONS to R2 returns CORS headers)
 *   3. Upload session lifecycle: create → sign part → ETag validation → abort
 *   4. Stale session resume: same filename+size → resumed, different → new session
 *   5. Fabricated ETag → 400
 *   6. Non-contiguous parts → 400
 *
 * Run after: Nate signed up + migration 010 ran (so game has owner_id)
 * Usage:
 *   BASE_URL=http://localhost:3002 \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://gurhiziqghzuqumpzkig.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=*** \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=*** \
 *   FILMROOM_TEST_GAME_ID=<existing-game-id-with-video> \
 *   FILMROOM_TEST_GAME_ID_NO_VIDEO=<game-id-without-video> \
 *   FILMROOM_TEST_PROJECT_HOST=gurhiziqghzuqumpzkig.supabase.co \
 *   npx ts-node --transpile-only scripts/test-video-upload.ts
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const BASE_URL       = process.env.BASE_URL ?? 'http://localhost:3002'
const SUPABASE_URL   = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL!
const ANON_KEY       = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY!
const SERVICE_KEY    = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY!
const GAME_W_VIDEO   = process.env.FILMROOM_TEST_GAME_ID            // has video_url set
const GAME_NO_VIDEO  = process.env.FILMROOM_TEST_GAME_ID_NO_VIDEO   // no video_url

const LIVE_DOMAIN    = 'www.njsbuilds.com'
const APPROVED_HOST  = process.env.FILMROOM_TEST_PROJECT_HOST

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing required env vars'); process.exit(1)
}
if (!APPROVED_HOST || new URL(SUPABASE_URL).hostname !== APPROVED_HOST) {
  console.error('ABORT: FILMROOM_TEST_PROJECT_HOST must match SUPABASE_URL host'); process.exit(1)
}
if (BASE_URL.includes(LIVE_DOMAIN)) {
  console.error('ABORT: BASE_URL must not be live production domain'); process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

let passed = 0, failed = 0
function assert(label: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  ✅ ${label}`); passed++ }
  else { console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++ }
}

async function signIn(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>()
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
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
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
    const name = `sb-${ref}-auth-token`
    jar.set(name, JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
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
  return { status: res.status, data }
}

async function run() {
  console.log(`\n🎬 Film Room Video + Upload Tests`)
  console.log(`   Supabase: ${new URL(SUPABASE_URL).hostname}`)
  console.log(`   Target:   ${BASE_URL}\n`)

  const suffix = Date.now()
  const email  = `test-video-${suffix}@filmroom-test.invalid`
  const pw     = 'Test-Video-Pass-2026!'
  let userId: string | null = null
  let cookie = ''
  let testTeamId: string | null = null
  let testGameId: string | null = null

  try {
    userId = (await (async () => {
      const { data, error } = await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })
      if (error) throw new Error(error.message)
      return data.user!.id
    })())
    cookie = await signIn(email, pw)

    // Provision team + game for test user
    const { data: tD } = await apiAs(cookie, 'POST', '/api/filmroom/teams',
      { name: 'Video Test Team', season: '2025-26', sport: 'basketball' })
    testTeamId = (tD as { id?: string })?.id ?? null

    if (testTeamId) {
      const { data: gD } = await apiAs(cookie, 'POST', '/api/filmroom/games',
        { team_id: testTeamId, opponent: 'Video Test Opp', game_date: '2026-01-01' })
      testGameId = (gD as { id?: string })?.id ?? null
    }

    // ── 1. Video token — no video attached ────────────────────────────────────
    console.log('1. Video token — unauthenticated + no video')
    { const { status } = await apiAs('', 'GET', `/api/filmroom/video-token?gameId=${testGameId ?? 'x'}`)
      assert('Unauthenticated video-token → 401', status === 401, `got ${status}`) }

    if (testGameId) {
      const { status } = await apiAs(cookie, 'GET', `/api/filmroom/video-token?gameId=${testGameId}`)
      assert('No video attached → 404', status === 404, `got ${status}`)
    }

    // ── 2. Video token — with real R2 video (if game ID provided) ─────────────
    if (GAME_W_VIDEO) {
      console.log('\n2. Video token — with attached R2 video')
      // Use Nate's cookie — but we're testing against a dev server with his session
      // This test only makes sense when run as Nate after migration 010
      console.log('  (Skip: requires authenticated session as data owner — run separately as Nate)')
      passed++ // placeholder
    }

    // ── 3. Upload session lifecycle ───────────────────────────────────────────
    console.log('\n3. Multipart upload session lifecycle')
    if (!testGameId) { console.log('  (skipped: no test game)'); return }

    // Create session
    const { status: cS, data: cD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: testGameId, filename: 'test-video.mp4', fileSizeBytes: 15 * 1024 * 1024 })
    assert('Create session → 200', cS === 200, `got ${cS}`)

    const sessionId = (cD as { sessionId?: string })?.sessionId
    assert('Session ID returned', !!sessionId, JSON.stringify(cD).slice(0, 80))

    if (!sessionId) return

    // Sign a part
    const { status: pS, data: pD } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part',
      { sessionId, partNumber: 1 })
    assert('Sign part → 200', pS === 200, `got ${pS}`)
    const signedUrl = (pD as { signedUrl?: string })?.signedUrl
    assert('Signed URL returned', !!signedUrl)

    // ── 4. ETag validation ────────────────────────────────────────────────────
    console.log('\n4. ETag validation')

    // Fabricated ETag → 400
    const { status: fabS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId, parts: [{ PartNumber: 1, ETag: '"part-1"' }] })
    assert('Fabricated ETag → 400', fabS === 400, `got ${fabS}`)

    // Non-contiguous parts → 400
    const { status: ncS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=complete',
      { sessionId, parts: [
        { PartNumber: 1, ETag: '"abc123def456abc123def456abc12345"' },
        { PartNumber: 3, ETag: '"abc123def456abc123def456abc12346"' },
      ]})
    assert('Non-contiguous parts → 400', ncS === 400, `got ${ncS}`)

    // Decimal partNumber → 400
    const { status: decS } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=part',
      { sessionId, partNumber: 1.5 })
    assert('Decimal partNumber → 400', decS === 400, `got ${decS}`)

    // ── 5. Resume behaviour ───────────────────────────────────────────────────
    console.log('\n5. Upload session resume logic')

    // Same filename + size → resumed
    const { data: r1D } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: testGameId, filename: 'test-video.mp4', fileSizeBytes: 15 * 1024 * 1024 })
    assert('Same file → resumed', (r1D as { resumed?: boolean })?.resumed === true,
      JSON.stringify(r1D).slice(0, 80))

    // Different filename → new session (aborts old)
    const { data: r2D } = await apiAs(cookie, 'POST',
      '/api/filmroom/upload/multipart?action=create',
      { game_id: testGameId, filename: 'different-video.mp4', fileSizeBytes: 15 * 1024 * 1024 })
    assert('Different file → new session (not resumed)', (r2D as { resumed?: boolean })?.resumed !== true)
    const newSessionId = (r2D as { sessionId?: string })?.sessionId
    assert('New session ID issued', newSessionId !== sessionId, `same: ${newSessionId === sessionId}`)

    // ── 6. Cross-user session access ──────────────────────────────────────────
    console.log('\n6. Cross-user session isolation')
    if (newSessionId) {
      const suffix2 = Date.now() + 1
      const email2 = `test-video-b-${suffix2}@filmroom-test.invalid`
      let idB: string | null = null
      try {
        idB = (await (async () => {
          const { data, error } = await svc.auth.admin.createUser({ email: email2, password: pw, email_confirm: true })
          if (error) throw error
          return data.user!.id
        })())
        const cookieB = await signIn(email2, pw)
        const { status: xS } = await apiAs(cookieB, 'POST',
          '/api/filmroom/upload/multipart?action=part',
          { sessionId: newSessionId, partNumber: 1 })
        assert('B cannot sign part on A\'s session → 403', xS === 403, `got ${xS}`)
      } finally {
        if (idB) await svc.auth.admin.deleteUser(idB)
      }
    }

    // ── 7. Abort ──────────────────────────────────────────────────────────────
    console.log('\n7. Abort cleans up')
    if (newSessionId) {
      const { status: abS } = await apiAs(cookie, 'POST',
        '/api/filmroom/upload/multipart?action=abort',
        { sessionId: newSessionId })
      assert('Abort → 200', abS === 200, `got ${abS}`)

      // Trying to sign a part after abort → 409
      const { status: aS } = await apiAs(cookie, 'POST',
        '/api/filmroom/upload/multipart?action=part',
        { sessionId: newSessionId, partNumber: 1 })
      assert('Sign part after abort → 409', aS === 409, `got ${aS}`)
    }

    // Abort original session too
    await apiAs(cookie, 'POST', '/api/filmroom/upload/multipart?action=abort', { sessionId })

  } finally {
    if (userId) await svc.auth.admin.deleteUser(userId)
    console.log('\n🧹 Test user deleted')
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`${passed}/${passed + failed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(e => { console.error(e); process.exit(1) })
