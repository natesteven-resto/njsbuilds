/**
 * filmroom-archive-pglite-test.mjs
 *
 * PGlite preservation test: insert synthetic player + stats + clip_players,
 * archive the player (set archived_at), restore, and verify counts/values survive.
 *
 * Uses the billing-db-test migration harness (same pattern; does NOT copy it).
 *
 * Tests:
 *   1. Migrations 007–023 all apply cleanly
 *   2. archived_at column exists on players table
 *   3. stat_entries rows survive archive (FK preserved, not cascaded)
 *   4. clip_players rows survive archive
 *   5. Active player query (archived_at IS NULL) excludes archived
 *   6. Historical query (no filter) includes archived
 *   7. Restore (archived_at = NULL) re-includes player in active queries
 *   8. Service-role can archive (update archived_at) — authenticated cannot hard-delete (migration 023)
 */

import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('../supabase/migrations/', import.meta.url).pathname
const db = new PGlite()
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ids = {
  team: '11111111-1111-4111-8111-111111111111',
  game: '33333333-3333-4333-8333-333333333333',
  player: '55555555-5555-4555-8555-555555555555',
  clip: '77777777-7777-4777-8777-777777777777',
  stat: '99999999-9999-4999-8999-999999999999',
}

// Bootstrap roles + auth schema (same as billing-db-test harness).
// Seed natesteven@gmail.com because migration 010 (data-migration) requires it.
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  INSERT INTO auth.users(id, email, email_confirmed_at) VALUES('${A}', 'natesteven@gmail.com', now());
`)

let failures = 0
async function test(name, fn) {
  try { await fn(); console.log('PASS', name) }
  catch (e) { failures++; console.log('FAIL', name, e.message) }
}
function assert(v, msg) { if (!v) throw new Error(msg) }

// ── Apply migrations ─────────────────────────────────────────────────────────
try {
  const fixed = ['007_filmroom.sql', '008_stat_entries.sql']
  const rest = readdirSync(root)
    .filter(f => /^\d{3}_/.test(f) && Number(f.slice(0, 3)) >= 9)
    .sort()
  for (const f of [...fixed, ...rest]) {
    await db.exec(readFileSync(root + f, 'utf8'))
    console.log('MIGRATION PASS', f)
  }
} catch (e) {
  console.log('MIGRATION FAIL', e.message)
  await db.close()
  process.exit(1)
}

// ── Seed data ────────────────────────────────────────────────────────────────
await db.exec(`
  INSERT INTO coaches(id, email, name, auth_user_id) VALUES('${A}', 'natesteven@gmail.com', 'Archive Test Coach', '${A}') ON CONFLICT (auth_user_id) DO NOTHING;
  INSERT INTO teams(id, coach_id, name, owner_id) SELECT '${ids.team}', id, 'Archive Test Team', '${A}' FROM coaches WHERE auth_user_id='${A}';
  INSERT INTO games(id, team_id, opponent, game_date, owner_id) VALUES('${ids.game}', '${ids.team}', 'Opponent', current_date, '${A}');
  INSERT INTO players(id, team_id, name, number, owner_id) VALUES('${ids.player}', '${ids.team}', 'Archive Testington', 10, '${A}');
  INSERT INTO clips(id, game_id, team_id, start_time_ms, end_time_ms, owner_id) VALUES('${ids.clip}', '${ids.game}', '${ids.team}', 0, 5000, '${A}');
  INSERT INTO stat_entries(id, game_id, player_id, stat_type, owner_id) VALUES('${ids.stat}', '${ids.game}', '${ids.player}', 'AST', '${A}');
  INSERT INTO clip_players(clip_id, player_id) VALUES('${ids.clip}', '${ids.player}');
`)

// ── Test 1: archived_at column exists ────────────────────────────────────────
await test('archived_at column exists on players', async () => {
  const r = await db.query(`SELECT archived_at FROM players WHERE id = '${ids.player}'`)
  assert(r.rows.length === 1, 'player row not found')
  assert(r.rows[0].archived_at === null, 'archived_at should start null')
})

// ── Test 2: stat_entries count before archive ─────────────────────────────
await test('stat_entries row present before archive', async () => {
  const r = await db.query(`SELECT id FROM stat_entries WHERE player_id = '${ids.player}'`)
  assert(r.rows.length === 1, 'stat_entries row missing')
})

// ── Test 3: clip_players count before archive ─────────────────────────────
await test('clip_players row present before archive', async () => {
  const r = await db.query(`SELECT player_id FROM clip_players WHERE player_id = '${ids.player}'`)
  assert(r.rows.length === 1, 'clip_players row missing')
})

// ── Archive the player (service_role path — update archived_at) ───────────
await db.exec(`UPDATE players SET archived_at = now() WHERE id = '${ids.player}'`)

// ── Test 4: stat_entries survive archive ─────────────────────────────────
await test('stat_entries survive archive (FK preserved)', async () => {
  const r = await db.query(`SELECT id FROM stat_entries WHERE player_id = '${ids.player}'`)
  assert(r.rows.length === 1, `stat_entries count should be 1, got ${r.rows.length}`)
})

// ── Test 5: clip_players survive archive ─────────────────────────────────
await test('clip_players survive archive', async () => {
  const r = await db.query(`SELECT player_id FROM clip_players WHERE player_id = '${ids.player}'`)
  assert(r.rows.length === 1, `clip_players count should be 1, got ${r.rows.length}`)
})

// ── Test 6: Active player query excludes archived ─────────────────────────
await test('active player query (archived_at IS NULL) excludes archived player', async () => {
  const r = await db.query(`SELECT id FROM players WHERE team_id = '${ids.team}' AND archived_at IS NULL`)
  assert(!r.rows.some(row => row.id === ids.player), 'archived player appears in active query')
})

// ── Test 7: Historical player query includes archived ─────────────────────
await test('historical player query (no filter) includes archived player', async () => {
  const r = await db.query(`SELECT id, archived_at FROM players WHERE team_id = '${ids.team}'`)
  const found = r.rows.find(row => row.id === ids.player)
  assert(found, 'archived player missing from historical query')
  assert(found.archived_at !== null, 'archived_at should be set')
})

// ── Restore the player ───────────────────────────────────────────────────
await db.exec(`UPDATE players SET archived_at = NULL WHERE id = '${ids.player}'`)

// ── Test 8: Restore re-includes in active query ────────────────────────────
await test('restore clears archived_at and player reappears in active query', async () => {
  const r = await db.query(`SELECT id, archived_at FROM players WHERE team_id = '${ids.team}' AND archived_at IS NULL`)
  const found = r.rows.find(row => row.id === ids.player)
  assert(found, 'restored player not found in active query')
  assert(found.archived_at === null, 'archived_at should be null after restore')
})

// ── Test 9: stat_entries and clip_players values unchanged after restore ───
await test('stat_entries and clip_players unchanged after restore', async () => {
  const s = await db.query(`SELECT stat_type FROM stat_entries WHERE player_id = '${ids.player}'`)
  assert(s.rows.length === 1 && s.rows[0].stat_type === 'AST', 'stat_entries altered')
  const c = await db.query(`SELECT clip_id FROM clip_players WHERE player_id = '${ids.player}'`)
  assert(c.rows.length === 1 && c.rows[0].clip_id === ids.clip, 'clip_players altered')
})

// ── Test 10: authenticated role cannot hard-delete (migration 023) ─────────
await test('authenticated role cannot hard-delete player (migration 023)', async () => {
  await db.exec('BEGIN')
  let denied = false
  try {
    await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub"='${A}';`)
    await db.exec(`DELETE FROM players WHERE id = '${ids.player}'`)
  } catch (e) {
    if (/permission denied/.test(e.message)) denied = true
    else throw e
  } finally {
    await db.exec('ROLLBACK')
  }
  assert(denied, 'authenticated hard-delete should be denied (migration 023 not applied?)')
})

// ── Test 11: service_role can still archive (update archived_at) ────────────
await test('service_role can set archived_at (archive still works)', async () => {
  await db.exec('BEGIN; SET LOCAL ROLE service_role;')
  const r = await db.query(`UPDATE players SET archived_at = now() WHERE id = '${ids.player}' RETURNING archived_at`)
  assert(r.rows.length === 1 && r.rows[0].archived_at !== null, 'service_role archive failed')
  // Roll back the synthetic service-role update
  await db.exec('ROLLBACK')
})

console.log(JSON.stringify({ failures }))
await db.close()
process.exitCode = failures ? 1 : 0
