/**
 * Film Room Auth Security Test
 *
 * Two-user API ownership test against a STAGING endpoint.
 * Uses @supabase/ssr createServerClient to produce project-scoped session cookies
 * that Next.js middleware can read server-side.
 *
 * Guards:
 *   - NEXT_PUBLIC_FILMROOM_SUPABASE_URL must NOT be the RestoReports project
 *   - FILMROOM_TEST_PROJECT_HOST must match the Supabase URL host (explicit approval)
 *   - BASE_URL must NOT be www.njsbuilds.com (never run against live production)
 *   - Test users are created fresh, tested, then deleted — never touches Nate's data
 *
 * Usage:
 *   BASE_URL=https://njsbuilds-<preview>.vercel.app \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://gurhiziqghzuqumpzkig.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=*** \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=*** \
 *   FILMROOM_TEST_PROJECT_HOST=gurhiziqghzuqumpzkig.supabase.co \
 *   npx ts-node --transpile-only scripts/test-filmroom-auth.ts
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local without overriding keys already in shell env.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv') as { config: (o: object) => void }
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false })
} catch { /* dotenv optional */ }

const BASE_URL     = process.env.BASE_URL ?? 'http://localhost:3002'
const SUPABASE_URL = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY!
const SERVICE_KEY  = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY!

const RESTOREPORTS_HOST = 'suhfyckmuenjskitrzlq.supabase.co'
const LIVE_DOMAIN       = 'www.njsbuilds.com'

// ── Guards ────────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Required: NEXT_PUBLIC_FILMROOM_SUPABASE_URL, NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY, FILMROOM_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (new URL(SUPABASE_URL).hostname === RESTOREPORTS_HOST) {
  console.error('ABORT: SUPABASE_URL must not be the RestoReports project')
  process.exit(1)
}

const approvedHost = process.env.FILMROOM_TEST_PROJECT_HOST
if (!approvedHost || new URL(SUPABASE_URL).hostname !== approvedHost) {
  console.error('ABORT: Set FILMROOM_TEST_PROJECT_HOST to the explicitly approved test DB host')
  console.error('       This prevents accidental test-user creation on wrong project')
  process.exit(1)
}

if (BASE_URL.includes(LIVE_DOMAIN)) {
  console.error('ABORT: BASE_URL must not target www.njsbuilds.com (live production domain)')
  console.error('       Use a preview/staging URL or localhost')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0
function assert(label: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  ✅ ${label}`); passed++ }
  else { console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++ }
}

/**
 * Sign in and capture the @supabase/ssr project-scoped session cookie.
 * createServerClient stores the JWT in a chunked cookie named
 * sb-<project-ref>-auth-token which Next.js middleware can read.
 */
async function signIn(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>()

  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const { name, value } of list) jar.set(name, value) },
    },
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false },
  })

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`)

  // @supabase/ssr may store session lazily — check jar and also try getSession to flush
  await client.auth.getSession()

  if (jar.size === 0) {
    // Fallback: manually construct the cookie that @supabase/ssr expects
    // The project ref is the subdomain of the Supabase URL
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`
    const sessionJson = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'bearer',
      expires_at: data.session.expires_at,
    })
    jar.set(cookieName, sessionJson)
  }

  if (jar.size === 0) throw new Error(`Cookie jar empty after sign-in for ${email}`)

  const cookieStr = [...jar.entries()]
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join('; ')

  // Verify the cookie actually authenticates against the API — no content sniffing.
  // @supabase/ssr may chunk, encode, or structure cookie values in any format.
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

async function apiAs(
  cookie: string, method: string, path: string, body?: unknown
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data }
}

async function createUser(email: string, password: string): Promise<string> {
  const { data, error } = await svc.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return data.user!.id
}

async function deleteUser(id: string) {
  await svc.auth.admin.deleteUser(id).catch(() => {})
}

// ── Test runner ───────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔐 Film Room Two-User API Security Test`)
  console.log(`   Supabase: ${new URL(SUPABASE_URL).hostname}`)
  console.log(`   Target:   ${BASE_URL}\n`)

  const suffix  = Date.now()
  const emailA  = `test-fr-a-${suffix}@filmroom-test.invalid`
  const emailB  = `test-fr-b-${suffix}@filmroom-test.invalid`
  const pw      = 'Test-Secure-Pass-2026!'

  let idA: string | null = null, idB: string | null = null
  let cookieA = '', cookieB = ''
  let teamAId: string | null = null
  let gameAId: string | null = null

  try {
    // ── Setup ────────────────────────────────────────────────────────────────
    console.log('📦 Creating test users...')
    idA = await createUser(emailA, pw)
    idB = await createUser(emailB, pw)
    cookieA = await signIn(emailA, pw)
    cookieB = await signIn(emailB, pw)

    // Positive auth check before any negative tests
    const { status: authCheck } = await apiAs(cookieA, 'GET', '/api/filmroom/games')
    assert('User A authenticated (positive check first)', authCheck === 200, `got ${authCheck}`)
    if (authCheck !== 200) {
      console.error('\n  Cannot proceed: A is not authenticated. Cookie may be malformed.')
      console.error('  Check that BASE_URL points to a deployment with the new Film Room env vars.')
      return
    }

    const { status: authCheckB } = await apiAs(cookieB, 'GET', '/api/filmroom/games')
    assert('User B authenticated (positive check)', authCheckB === 200, `got ${authCheckB}`)

    // Provision team for A via POST /api/filmroom/teams
    const { status: tS, data: tD } = await apiAs(cookieA, 'POST', '/api/filmroom/teams',
      { name: 'Test Team A', season: '2025-26', sport: 'basketball' })
    assert('A can provision default team', tS === 200 || tS === 201, `got ${tS}`)
    teamAId = (tD as { id?: string })?.id ?? null
    assert('Team ID returned', !!teamAId, JSON.stringify(tD).slice(0, 80))

    // Provision team for B (separate coach, no shared data)
    const { status: tBS } = await apiAs(cookieB, 'POST', '/api/filmroom/teams',
      { name: 'Test Team B', season: '2025-26', sport: 'basketball' })
    assert('B can provision their own team', tBS === 200 || tBS === 201, `got ${tBS}`)

    // Create game for A
    if (teamAId) {
      const { status: gS, data: gD } = await apiAs(cookieA, 'POST', '/api/filmroom/games',
        { team_id: teamAId, opponent: 'Test Opponent', game_date: '2026-01-01' })
      assert('A can create a game', gS === 201, `got ${gS}`)
      gameAId = (gD as { id?: string })?.id ?? null
    }

    // ── Test 1: Anonymous → 401 ───────────────────────────────────────────────
    console.log('\n🔒 Test 1: Anonymous → 401 on all routes')
    const anonRoutes: Array<[string, string]> = [
      ['GET',  '/api/filmroom/games'],
      ['GET',  '/api/filmroom/teams'],
      ['POST', '/api/filmroom/upload/multipart?action=create'],
    ]
    if (gameAId) {
      anonRoutes.push(
        ['GET', `/api/filmroom/clips?game_id=${gameAId}`],
        ['GET', `/api/filmroom/stat-entries?game_id=${gameAId}`],
        ['GET', `/api/filmroom/video-token?gameId=${gameAId}`],
      )
    }
    for (const [m, p] of anonRoutes) {
      const { status } = await apiAs('', m, p, m === 'POST' ? {} : undefined)
      assert(`Anonymous ${m} ${p.split('?')[0]} → 401`, status === 401, `got ${status}`)
    }

    // ── Test 2: B cannot access A's resources ─────────────────────────────────
    if (gameAId) {
      console.log('\n🚫 Test 2: B cannot access A\'s data')
      const crossRoutes: Array<[string, string, unknown?]> = [
        ['GET',    `/api/filmroom/games/${gameAId}`],
        ['PATCH',  `/api/filmroom/games/${gameAId}`, { opponent: 'Hacked' }],
        ['DELETE', `/api/filmroom/games/${gameAId}`],
        ['GET',    `/api/filmroom/clips?game_id=${gameAId}`],
        ['GET',    `/api/filmroom/stat-entries?game_id=${gameAId}`],
        ['GET',    `/api/filmroom/video-token?gameId=${gameAId}`],
      ]
      for (const [m, p, b] of crossRoutes) {
        const { status } = await apiAs(cookieB, m, p, b)
        assert(`B cannot ${m} ${p.split('?')[0]}`, status === 403 || status === 404, `got ${status}`)
      }
    }

    // ── Test 3: owner_id in body is stripped ──────────────────────────────────
    if (teamAId) {
      console.log('\n🔒 Test 3: Forged owner_id in body is ignored')
      const { status: cs, data: cd } = await apiAs(cookieB, 'POST', '/api/filmroom/games', {
        team_id: teamAId,    // B trying to create in A's team
        opponent: 'Forged',
        game_date: '2026-06-01',
        owner_id: idA,       // forged — must be rejected
      })
      // Should be 403 (can't use A's team) not 201
      assert('B cannot create game in A\'s team', cs === 403, `got ${cs}`)

      // B creates in own team — owner_id in body must be ignored
      const { data: bTeams } = await apiAs(cookieB, 'GET', '/api/filmroom/teams')
      const bTeamId = (bTeams as { id: string }[])?.[0]?.id
      if (bTeamId) {
        const { status: bgs, data: bgd } = await apiAs(cookieB, 'POST', '/api/filmroom/games', {
          team_id: bTeamId,
          opponent: 'B Game',
          game_date: '2026-06-01',
          owner_id: idA,  // forged — server must use B's actual user.id
        })
        assert('B can create game in own team', bgs === 201, `got ${bgs}`)
        if (bgs === 201) {
          const bGame = bgd as { owner_id?: string }
          assert('Returned game has B\'s owner_id (not forged A)',
            bGame.owner_id === idB, `got ${bGame.owner_id}`)
        }
      }
    }

    // ── Test 4: Upload isolation ──────────────────────────────────────────────
    if (gameAId) {
      console.log('\n🚫 Test 4: Upload session isolation')
      const { status: us } = await apiAs(cookieB, 'POST',
        '/api/filmroom/upload/multipart?action=create',
        { game_id: gameAId, filename: 'hack.mp4', fileSizeBytes: 1000 })
      assert('B cannot create multipart session for A\'s game', us === 403, `got ${us}`)

      const { status: ps } = await apiAs(cookieB, 'POST',
        '/api/filmroom/upload/multipart?action=part',
        { sessionId: '00000000-0000-0000-0000-000000000099', partNumber: 1 })
      assert('B cannot sign part with forged sessionId', ps === 403, `got ${ps}`)
    }

    // ── Test 5: A can manage own resources ────────────────────────────────────
    console.log('\n✅ Test 5: Positive — A can CRUD own resources')
    if (teamAId) {
      const { status: gcs, data: gcd } = await apiAs(cookieA, 'POST', '/api/filmroom/games',
        { team_id: teamAId, opponent: 'Delete Me', game_date: '2026-09-01' })
      assert('A creates a second game', gcs === 201, `got ${gcs}`)
      const tempGameId = (gcd as { id?: string })?.id
      if (tempGameId) {
        const { status: ds } = await apiAs(cookieA, 'DELETE', `/api/filmroom/games/${tempGameId}`)
        assert('A deletes own game', ds === 200, `got ${ds}`)
        const { status: check } = await apiAs(cookieA, 'GET', `/api/filmroom/games/${tempGameId}`)
        assert('Deleted game returns 404', check === 404, `got ${check}`)
      }
    }

    const { data: gList } = await apiAs(cookieA, 'GET', '/api/filmroom/games')
    assert('A games list is an array', Array.isArray(gList), typeof gList)

    if (gameAId) {
      const { status: vs } = await apiAs(cookieA, 'GET',
        `/api/filmroom/video-token?gameId=${gameAId}`)
      // 404 is fine (no video attached to test game), 200 would mean signed URL works
      assert('Video token responds (200 or 404, not 403/500)',
        vs === 200 || vs === 404, `got ${vs}`)
    }

  } finally {
    console.log('\n🧹 Cleanup...')
    if (idA) await deleteUser(idA)
    if (idB) await deleteUser(idB)
    console.log('   Test users deleted\n')
  }

  console.log('─'.repeat(50))
  console.log(`${passed}/${passed + failed} passed, ${failed} failed`)
  if (failed > 0) { console.error(`\n❌ ${failed} failure(s)`); process.exit(1) }
  else console.log('\n✅ All tests passed')
}

run().catch(e => { console.error('Runner error:', e); process.exit(1) })
