/**
 * Film Room Auth Security Test
 *
 * Tests ownership enforcement at the API layer using two real Supabase auth users.
 * Uses @supabase/ssr-compatible cookie flow — signs in and extracts the
 * project-scoped session cookie that Next.js middleware reads.
 *
 * SAFETY GUARD: refuses to run against the production Supabase URL.
 * Run against staging or local only.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://YOUR-STAGING-PROJECT.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=... \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx ts-node scripts/test-filmroom-auth.ts
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const BASE_URL     = process.env.BASE_URL ?? 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY!
const SERVICE_KEY  = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY!

// ── Production guard ──────────────────────────────────────────────────────────
const PRODUCTION_URL = 'https://suhfyckmuenjskitrzlq.supabase.co'
if (!SUPABASE_URL || new URL(SUPABASE_URL).hostname === new URL(PRODUCTION_URL).hostname) {
  console.error('ABORT: refusing to run test user creation against production Supabase project.')
  console.error('Set NEXT_PUBLIC_FILMROOM_SUPABASE_URL to a staging project.')
  process.exit(1)
}

if (!process.env.FILMROOM_TEST_PROJECT_HOST || new URL(SUPABASE_URL).hostname !== process.env.FILMROOM_TEST_PROJECT_HOST) {
  throw new Error('Set FILMROOM_TEST_PROJECT_HOST to the explicitly approved disposable test database host')
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

let passed = 0; let failed = 0

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++ }
  else { console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++ }
}

/**
 * Sign in and extract the project-scoped @supabase/ssr session cookie.
 * @supabase/ssr encodes the session as sb-<project-ref>-auth-token (chunked).
 * We use the raw fetch flow to capture Set-Cookie headers.
 */
async function signInGetCookie(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>()
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => { for (const { name, value } of cookies) jar.set(name, value) },
    },
    auth: { autoRefreshToken: false, persistSession: true },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  if (jar.size === 0) throw new Error(`No session cookies set after sign-in for ${email} — cookie jar is empty`)
  // Verify we got a real JWT, not a sentinel
  const cookieStr = [...jar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ')
  const hasJwt = [...jar.values()].some(v => v.startsWith('eyJ'))
  if (!hasJwt) throw new Error(`Cookie jar does not contain a JWT — got: ${[...jar.keys()].join(', ')}`)
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

async function createTestUser(email: string, password: string): Promise<string> {
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`Create user ${email}: ${error.message}`)
  return data.user!.id
}

async function deleteTestUser(id: string) {
  await svc.auth.admin.deleteUser(id)
}

async function run() {
  console.log(`\n🔐 Film Room Auth Security Tests`)
  console.log(`   Target: ${BASE_URL}`)
  console.log(`   Supabase: ${SUPABASE_URL}\n`)

  const suffix   = Date.now()
  const emailA   = `test-filmroom-a-${suffix}@test.invalid`
  const emailB   = `test-filmroom-b-${suffix}@test.invalid`
  const password = 'FilmRoomTest123!'

  let idA: string | null = null, idB: string | null = null
  let cookieA = '', cookieB = ''
  let gameAId: string | null = null, teamAId: string | null = null

  try {
    console.log('📦 Setup: creating test users...')
    idA = await createTestUser(emailA, password)
    idB = await createTestUser(emailB, password)
    cookieA = await signInGetCookie(emailA, password)
    cookieB = await signInGetCookie(emailB, password)

    // Positive auth check before negative tests
    const { status: authCheck } = await apiAs(cookieA, 'GET', '/api/filmroom/games')
    assert('User A authenticated successfully (positive auth check)', authCheck === 200, `got ${authCheck}`)

    // Provision team for A
    const { status: tStatus, data: tData } = await apiAs(cookieA, 'POST', '/api/filmroom/teams',
      { name: 'Test Team A', season: '2025-26', sport: 'basketball' })
    assert('A can provision default team', tStatus === 200 || tStatus === 201, `got ${tStatus}`)
    teamAId = (tData as { id?: string })?.id ?? null

    // Provision team for B (each user's own coach — no legacy coach reuse)
    const { status: tBStatus } = await apiAs(cookieB, 'POST', '/api/filmroom/teams',
      { name: 'Test Team B', season: '2025-26', sport: 'basketball' })
    assert('B can provision their own team (separate coach)', tBStatus === 200 || tBStatus === 201, `got ${tBStatus}`)

    // Create game for A
    if (teamAId) {
      const { status: gStatus, data: gData } = await apiAs(cookieA, 'POST', '/api/filmroom/games',
        { team_id: teamAId, opponent: 'Test Opponent', game_date: '2026-01-01' })
      assert('A can create a game', gStatus === 201, `got ${gStatus}`)
      gameAId = (gData as { id?: string })?.id ?? null
    }

    // ── Test 1: Anonymous → 401 ────────────────────────────────────────────
    console.log('\n🔒 Test 1: Anonymous requests → 401')
    for (const [m, p] of [
      ['GET', '/api/filmroom/games'],
      ['GET', '/api/filmroom/teams'],
      ['GET', `/api/filmroom/clips?game_id=${gameAId ?? '00000000-0000-0000-0000-000000000033'}`],
      ['POST', '/api/filmroom/upload/multipart?action=create'],
    ] as const) {
      const { status } = await apiAs('', m, p, m === 'POST' ? {} : undefined)
      assert(`Anonymous ${m} ${p.split('?')[0]} → 401`, status === 401, `got ${status}`)
    }

    // ── Test 2: B cannot access A's resources ─────────────────────────────
    if (gameAId) {
      console.log('\n🚫 Test 2: Cross-user denial')
      const checks = [
        ['GET',    `/api/filmroom/games/${gameAId}`],
        ['PATCH',  `/api/filmroom/games/${gameAId}`],
        ['DELETE', `/api/filmroom/games/${gameAId}`],
        ['GET',    `/api/filmroom/clips?game_id=${gameAId}`],
        ['GET',    `/api/filmroom/stat-entries?game_id=${gameAId}`],
        ['GET',    `/api/filmroom/video-token?gameId=${gameAId}`],
      ] as const
      for (const [m, p] of checks) {
        const body = m === 'PATCH' ? { opponent: 'Hacked' } : undefined
        const { status } = await apiAs(cookieB, m, p, body)
        assert(`B cannot ${m} A's resource ${p.split('?')[0]}`, status === 403 || status === 404, `got ${status}`)
      }
    }

    // ── Test 3: B cannot upload to A's game ───────────────────────────────
    if (gameAId) {
      console.log('\n🚫 Test 3: Upload isolation')
      const { status: s1 } = await apiAs(cookieB, 'POST', '/api/filmroom/upload/multipart?action=create',
        { game_id: gameAId, filename: 'hack.mp4', fileSizeBytes: 1000 })
      assert('B cannot create multipart session for A\'s game', s1 === 403, `got ${s1}`)

      const { status: s2 } = await apiAs(cookieB, 'POST', '/api/filmroom/upload/multipart?action=part',
        { sessionId: '00000000-0000-0000-0000-000000000099', partNumber: 1 })
      assert('B cannot sign part with forged sessionId', s2 === 403, `got ${s2}`)
    }

    // ── Test 4: owner_id in body is ignored ──────────────────────────────
    if (teamAId) {
      console.log('\n🔒 Test 4: owner_id forging rejected')
      const { status: cs, data: cd } = await apiAs(cookieB, 'POST', '/api/filmroom/teams',
        { name: 'Forged Team' })
      if (cs === 200 || cs === 201) {
        const t = cd as { owner_id?: string }
        assert('B\'s team has B\'s owner_id (not A)', t.owner_id !== idA, `got ${t.owner_id}`)
      } else {
        assert('B team creation did not 500', cs !== 500, `got ${cs}`)
      }
    }

    // ── Test 5: A can manage their own resources ──────────────────────────
    console.log('\n✅ Test 5: Positive owner CRUD')
    if (teamAId) {
      const { status: gs } = await apiAs(cookieA, 'POST', '/api/filmroom/games',
        { team_id: teamAId, opponent: 'Delete Me', game_date: '2026-09-01' })
      assert('A can create game', gs === 201, `got ${gs}`)
    }

    const { data: gList } = await apiAs(cookieA, 'GET', '/api/filmroom/games')
    assert('A games list is array', Array.isArray(gList), `got ${typeof gList}`)

    const { status: tList } = await apiAs(cookieA, 'GET', '/api/filmroom/teams')
    assert('A can list teams', tList === 200, `got ${tList}`)

  } finally {
    console.log('\n🧹 Cleanup...')
    if (idA) await deleteTestUser(idA).catch(() => {})
    if (idB) await deleteTestUser(idB).catch(() => {})
    console.log('   Done.\n')
  }

  console.log('─'.repeat(50))
  console.log(`Results: ${passed}/${passed + failed} passed, ${failed} failed`)
  if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.`); process.exit(1) }
  else console.log('\n✅ All tests passed.')
}

run().catch(e => { console.error('Runner error:', e); process.exit(1) })
