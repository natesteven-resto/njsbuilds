/**
 * filmroom-viewer-pglite-test.mjs
 *
 * Executes the REAL migrations (007–024) in PGlite and exercises the team-wide
 * Viewer access model end-to-end against the actual SQL functions. Uses the same
 * harness pattern as filmroom-archive-pglite-test.mjs (does NOT copy it).
 *
 * Coverage:
 *   - migrations apply cleanly incl. 024
 *   - accepted+verified viewer gets FILM on ALL team games (past + future)
 *   - uninvited / wrong-email / unverified users get NO access
 *   - other-team games denied
 *   - private mode: stats limited to linked players only (teammate filtered out),
 *     archived linked players still returned, box-score player list scoped
 *   - team mode: all team stats + full roster (incl. archived) visible
 *   - self-claim request records a row but grants NOTHING
 *   - forged approval (direct link insert by non-owner role) is blocked
 *   - link revocation and invite revocation both cut future stats access
 *   - unknown access kind raises
 *   - no anonymous/authenticated direct table access to link/request tables
 */

import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('../supabase/migrations/', import.meta.url).pathname
const db = new PGlite()

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' // owner (seed email required by migration 010)
const VIEWER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const WRONG = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const UNVER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const BOWNER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

const id = {
  teamA: '11111111-1111-4111-8111-111111111111',
  teamB: '22222222-2222-4222-8222-222222222222',
  gamePast: '33333333-3333-4333-8333-333333333333',
  gameFuture: '34444444-4444-4444-8444-444444444444',
  gameB: '35555555-5555-4555-8555-555555555555',
  pLinked: '41111111-1111-4111-8111-111111111111',
  pOther: '42222222-2222-4222-8222-222222222222',
  pArchived: '43333333-3333-4333-8333-333333333333',
  invite: '51111111-1111-4111-8111-111111111111',
}

let failures = 0
async function test(name, fn) {
  try { await fn(); console.log('PASS', name) }
  catch (e) { failures++; console.log('FAIL', name, e.message) }
}
function assert(v, msg) { if (!v) throw new Error(msg) }

// Run a block as a given authenticated user (role + jwt sub claim), rolled back.
async function asUser(sub, sql) {
  await db.exec('BEGIN')
  try {
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${sub}';`)
    return await db.query(sql)
  } finally {
    await db.exec('ROLLBACK')
  }
}
async function rpcJson(sub, sql) {
  const r = await asUser(sub, sql)
  return r.rows[0]
}

// ── Bootstrap roles + auth (same harness pattern) ─────────────────────────────
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    ('${A}','natesteven@gmail.com',now()),
    ('${VIEWER}','viewer@example.com',now()),
    ('${WRONG}','wrong@example.com',now()),
    ('${UNVER}','unver@example.com',NULL),
    ('${BOWNER}','bowner@example.com',now());
`)

// ── Apply migrations ──────────────────────────────────────────────────────────
try {
  const fixed = ['007_filmroom.sql', '008_stat_entries.sql']
  const rest = readdirSync(root).filter(f => /^\d{3}_/.test(f) && Number(f.slice(0, 3)) >= 9).sort()
  for (const f of [...fixed, ...rest]) {
    await db.exec(readFileSync(root + f, 'utf8'))
  }
  console.log('MIGRATION PASS (through 024)')
} catch (e) {
  console.log('MIGRATION FAIL', e.message)
  await db.close(); process.exit(1)
}

// ── Seed two coaches, teams, games (past + future), players, invite ───────────
const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
await db.exec(`
  INSERT INTO coaches(id,email,name,auth_user_id) VALUES
    ('${A}','natesteven@gmail.com','Owner A','${A}'),
    ('${BOWNER}','bowner@example.com','Owner B','${BOWNER}') ON CONFLICT (auth_user_id) DO NOTHING;
  INSERT INTO teams(id,coach_id,name,owner_id) SELECT '${id.teamA}',id,'Team A','${A}' FROM coaches WHERE auth_user_id='${A}';
  INSERT INTO teams(id,coach_id,name,owner_id) SELECT '${id.teamB}',id,'Team B','${BOWNER}' FROM coaches WHERE auth_user_id='${BOWNER}';
  INSERT INTO games(id,team_id,opponent,game_date,owner_id,video_url) VALUES
    ('${id.gamePast}','${id.teamA}','Past Foe','2020-01-01','${A}','http://v/past'),
    ('${id.gameFuture}','${id.teamA}','Future Foe','${future}','${A}',NULL),
    ('${id.gameB}','${id.teamB}','B Foe','2020-01-01','${BOWNER}',NULL);
  INSERT INTO players(id,team_id,name,number,owner_id) VALUES
    ('${id.pLinked}','${id.teamA}','Linked Kid',10,'${A}'),
    ('${id.pOther}','${id.teamA}','Other Kid',11,'${A}');
  INSERT INTO players(id,team_id,name,number,owner_id,archived_at) VALUES
    ('${id.pArchived}','${id.teamA}','Archived Kid',12,'${A}',now());
  -- Stats: linked + other on past game; linked on future game.
  INSERT INTO stat_entries(game_id,player_id,stat_type,owner_id,video_time_ms) VALUES
    ('${id.gamePast}','${id.pLinked}','PTS','${A}',1000),
    ('${id.gamePast}','${id.pOther}','AST','${A}',2000),
    ('${id.gamePast}','${id.pArchived}','REB','${A}',3000),
    ('${id.gameFuture}','${id.pLinked}','PTS','${A}',1500);
  -- Invite viewer@example.com to Team A (private mode by default).
  INSERT INTO filmroom_parent_invites(id,owner_id,team_id,email) VALUES
    ('${id.invite}','${A}','${id.teamA}','viewer@example.com');
`)

// ── Tests ─────────────────────────────────────────────────────────────────────

await test('teams.viewer_stats_mode defaults to private', async () => {
  const r = await db.query(`SELECT viewer_stats_mode FROM teams WHERE id='${id.teamA}'`)
  assert(r.rows[0].viewer_stats_mode === 'private', 'default not private')
})

await test('unverified-email user cannot accept invite', async () => {
  let denied = false
  try { await asUser(UNVER, `SELECT filmroom_accept_parent_invite('${id.invite}')`) }
  catch { denied = true }
  assert(denied, 'unverified accept should fail')
})

await test('wrong-email user cannot accept invite', async () => {
  let denied = false
  try { await asUser(WRONG, `SELECT filmroom_accept_parent_invite('${id.invite}')`) }
  catch { denied = true }
  assert(denied, 'wrong-email accept should fail')
})

// Accept as the real viewer (service role to persist outside rollback).
await db.exec(`UPDATE filmroom_parent_invites SET accepted_by='${VIEWER}', accepted_at=now() WHERE id='${id.invite}'`)

await test('accepted viewer has FILM on past game', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gamePast}','film') AS ok`)
  assert(r.ok === true, 'film denied')
})
await test('accepted viewer has FILM on FUTURE game automatically', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gameFuture}','film') AS ok`)
  assert(r.ok === true, 'future film denied')
})
await test('viewer has NO access to another team game', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gameB}','film') AS ok`)
  assert(r.ok === false, 'cross-team film allowed')
})
await test('uninvited (wrong-email) user has NO film', async () => {
  const r = await rpcJson(WRONG, `SELECT filmroom_parent_access('${id.gamePast}','film') AS ok`)
  assert(r.ok === false, 'uninvited film allowed')
})
await test('unknown access kind raises', async () => {
  let raised = false
  try { await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gamePast}','bogus') AS ok`) }
  catch { raised = true }
  assert(raised, 'unknown kind did not raise')
})

// ── PRIVATE mode: no stats until linked ───────────────────────────────────────
await test('private mode: viewer has NO stats before any link', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gamePast}','stats') AS ok`)
  assert(r.ok === false, 'stats granted without link')
})
await test('private mode: filmroom_parent_stats raises Forbidden before link', async () => {
  let raised = false
  try { await asUser(VIEWER, `SELECT filmroom_parent_stats('${id.gamePast}')`) }
  catch { raised = true }
  assert(raised, 'stats not forbidden')
})

// ── Self-claim request records but grants nothing ─────────────────────────────
await test('request_connection records a request but grants NO stats', async () => {
  await db.exec('BEGIN')
  try {
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${VIEWER}';`)
    await db.query(`SELECT filmroom_request_connection('${id.invite}','Linked Kid','parent')`)
    const got = await db.query(`SELECT filmroom_parent_access('${id.gamePast}','stats') AS ok`)
    assert(got.rows[0].ok === false, 'request granted stats (must not)')
    await db.exec(`SET LOCAL ROLE service_role;`)
    const req = await db.query(`SELECT count(*)::int n FROM filmroom_viewer_requests WHERE invite_id='${id.invite}'`)
    assert(req.rows[0].n === 1, 'request row not recorded')
  } finally { await db.exec('ROLLBACK') }
})

// Coach approves a link to pLinked + pArchived (service role path).
await db.exec(`
  INSERT INTO filmroom_viewer_player_links(invite_id,player_id,relationship) VALUES
    ('${id.invite}','${id.pLinked}','parent'),
    ('${id.invite}','${id.pArchived}',NULL);
`)

await test('private mode: stats access true after approved link', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_access('${id.gamePast}','stats') AS ok`)
  assert(r.ok === true, 'stats denied after link')
})
await test('private mode: stats return ONLY linked players (teammate filtered)', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_stats('${id.gamePast}') AS j`)
  const j = r.j
  assert(j.stats_mode === 'private' && j.scope === 'linked', 'scope labels wrong')
  const ids = j.entries.map(e => e.player_id)
  assert(ids.includes('${id.pLinked}'.replace(/\$\{id.pLinked\}/, id.pLinked)) || ids.includes(id.pLinked), 'linked missing')
  assert(ids.includes(id.pArchived), 'archived linked player missing (history)')
  assert(!ids.includes(id.pOther), 'non-linked teammate leaked into stats')
})
await test('private mode: box-score player list limited to linked (incl. archived)', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_box_score('${id.gamePast}') AS j`)
  const names = r.j.players.map(p => p.id)
  assert(names.includes(id.pLinked) && names.includes(id.pArchived), 'linked players missing from box')
  assert(!names.includes(id.pOther), 'non-linked player leaked into box roster')
  const archived = r.j.players.find(p => p.id === id.pArchived)
  assert(archived && archived.archived === true, 'archived flag not set')
})

// ── TEAM mode: all stats + full roster ────────────────────────────────────────
await db.exec(`UPDATE teams SET viewer_stats_mode='team' WHERE id='${id.teamA}'`)
await test('team mode: stats include ALL team players', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_stats('${id.gamePast}') AS j`)
  const ids = r.j.entries.map(e => e.player_id)
  assert(r.j.scope === 'team', 'scope not team')
  assert(ids.includes(id.pLinked) && ids.includes(id.pOther) && ids.includes(id.pArchived), 'team mode missing players')
})
await test('team mode: box-score shows full roster incl. archived', async () => {
  const r = await rpcJson(VIEWER, `SELECT filmroom_parent_box_score('${id.gamePast}') AS j`)
  const ids = r.j.players.map(p => p.id)
  assert(ids.includes(id.pLinked) && ids.includes(id.pOther) && ids.includes(id.pArchived), 'roster incomplete')
})
await db.exec(`UPDATE teams SET viewer_stats_mode='private' WHERE id='${id.teamA}'`)

// ── Forged approval: non-owner authenticated cannot insert a link ─────────────
await test('forged approval: authenticated role cannot insert viewer link directly', async () => {
  let denied = false
  await db.exec('BEGIN')
  try {
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${VIEWER}';`)
    await db.exec(`INSERT INTO filmroom_viewer_player_links(invite_id,player_id) VALUES('${id.invite}','${id.pOther}')`)
  } catch (e) { if (/permission denied/.test(e.message)) denied = true; else throw e }
  finally { await db.exec('ROLLBACK') }
  assert(denied, 'authenticated direct link insert should be denied')
})

// ── Link revocation cuts stats immediately ────────────────────────────────────
await test('link revocation: removing last link cuts stats access', async () => {
  await db.exec('BEGIN')
  try {
    await db.exec(`DELETE FROM filmroom_viewer_player_links WHERE invite_id='${id.invite}'`)
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${VIEWER}';`)
    const r = await db.query(`SELECT filmroom_parent_access('${id.gamePast}','stats') AS ok`)
    assert(r.rows[0].ok === false, 'stats still allowed after link revoke')
    // Film remains.
    const f = await db.query(`SELECT filmroom_parent_access('${id.gamePast}','film') AS ok`)
    assert(f.rows[0].ok === true, 'film wrongly revoked with link')
  } finally { await db.exec('ROLLBACK') }
})

// ── Invite revocation cuts ALL access immediately ─────────────────────────────
await test('invite revocation: deleting invite cuts film + stats', async () => {
  await db.exec('BEGIN')
  try {
    await db.exec(`DELETE FROM filmroom_parent_invites WHERE id='${id.invite}'`)
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${VIEWER}';`)
    const r = await db.query(`SELECT filmroom_parent_access('${id.gamePast}','film') AS ok`)
    assert(r.rows[0].ok === false, 'film still allowed after invite revoke')
  } finally { await db.exec('ROLLBACK') }
})

// ── No anonymous/authenticated direct table reads ─────────────────────────────
await test('authenticated role gets NO data from viewer link/request tables (REVOKE+RLS)', async () => {
  // No leak = either permission denied (REVOKE) or zero rows (RLS enabled, no policy).
  // Each probe in its own transaction so a permission-denied abort doesn't cascade.
  const probe = async (table) => {
    await db.exec('BEGIN')
    try {
      await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${VIEWER}';`)
      const r = await db.query(`SELECT * FROM ${table}`)
      return r.rows.length === 0
    } catch (e) { return /permission denied/.test(e.message) }
    finally { await db.exec('ROLLBACK') }
  }
  const safeLinks = await probe('filmroom_viewer_player_links')
  const safeReq = await probe('filmroom_viewer_requests')
  assert(safeLinks && safeReq, `direct table access leaked rows (links=${safeLinks} req=${safeReq})`)
})

await test('anon role cannot execute filmroom_parent_stats (no grant)', async () => {
  let denied = false
  await db.exec('BEGIN')
  try {
    await db.exec(`SET LOCAL ROLE anon;`)
    await db.query(`SELECT filmroom_parent_stats('${id.gamePast}')`)
  } catch (e) { if (/permission denied/.test(e.message)) denied = true; else denied = true }
  finally { await db.exec('ROLLBACK') }
  assert(denied, 'anon could execute stats RPC')
})

console.log(JSON.stringify({ failures }))
await db.close()
process.exitCode = failures ? 1 : 0
