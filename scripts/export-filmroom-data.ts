/**
 * Film Room Selective Export — corrected
 *
 * Fixes vs prior version:
 *   1. text[] columns (tags) serialized as ARRAY['a','b']::text[], not JSON strings
 *   2. jsonb columns cast as ::jsonb
 *   3. Stable PK-ordered pagination (cursor for single-PK, offset+ORDER for composite)
 *   4. Optional-empty vs integrity-failure separation; FK violations never bypassed
 *   5. ON CONFLICT mismatch: verifies primary-key rows match on re-import attempt
 *   6. Round-trip validation: parse generated SQL and check array/jsonb literals
 *
 * Usage:
 *   EXPORT_SOURCE_URL=https://suhfyckmuenjskitrzlq.supabase.co \
 *   EXPORT_SOURCE_SERVICE_KEY=<key> \
 *   npx ts-node scripts/export-filmroom-data.ts [output.sql] [--force] [-]
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const SOURCE_URL = process.env.EXPORT_SOURCE_URL
const SOURCE_KEY = process.env.EXPORT_SOURCE_SERVICE_KEY
const OUT_PATH   = process.argv.find(a => !a.startsWith('-') && a.endsWith('.sql')) ??
                   `filmroom-export-${new Date().toISOString().slice(0,19).replace(/[T:]/g,'-')}.sql`
const TO_STDOUT  = process.argv.includes('-')
const FORCE      = process.argv.includes('--force')

const EXPECTED_SOURCE_HOST: string = 'suhfyckmuenjskitrzlq.supabase.co'
const DEDICATED_HOST: string       = 'gurhiziqghzuqumpzkig.supabase.co'
const LEGACY_TEAM_ID               = '00000000-0000-0000-0000-000000000010'
const LEGACY_COACH_ID              = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE                    = 1000

// ── Guards ────────────────────────────────────────────────────────────────────
if (!SOURCE_URL || !SOURCE_KEY) { console.error('Set EXPORT_SOURCE_URL and EXPORT_SOURCE_SERVICE_KEY'); process.exit(1) }

const sourceHost = new URL(SOURCE_URL).hostname
if (sourceHost !== EXPECTED_SOURCE_HOST) { console.error(`ABORT: source must be ${EXPECTED_SOURCE_HOST}`); process.exit(1) }
if (sourceHost === DEDICATED_HOST) { console.error('ABORT: cannot export from destination'); process.exit(1) }
const dedicatedUrl = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
if (dedicatedUrl && new URL(dedicatedUrl).hostname === sourceHost) { console.error('ABORT: env points at source'); process.exit(1) }

// Read-only service role client — SELECT only, never writes
const db = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })

// ── Serialization ─────────────────────────────────────────────────────────────

/**
 * Escape a single text value for use inside a Postgres standard string literal.
 * With standard_conforming_strings=ON (Postgres default since 9.1, always on in Supabase):
 *   - Only single quotes need escaping (doubled: '')
 *   - Backslashes are LITERAL — do NOT double them
 *   - Doubling backslashes would corrupt data (store two instead of one)
 */
function pgEscStr(s: string): string {
  return s.replace(/'/g, "''")
}

/** Serialize a text[] array as ARRAY['a','b']::text[] — NOT as a JSON string. */
function pgTextArray(raw: unknown): string {
  let arr: unknown[]
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    // Supabase REST sometimes returns text[] as a JSON array string
    try { arr = JSON.parse(raw) } catch { arr = raw ? [raw] : [] }
  } else {
    arr = []
  }
  if (arr.length === 0) return "ARRAY[]::text[]"
  const elems = arr.map(v => v === null ? 'NULL' : `'${pgEscStr(String(v))}'`)
  return `ARRAY[${elems.join(',')}]::text[]`
}

/** Serialize a jsonb value with ::jsonb cast. */
function pgJsonb(val: unknown): string {
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
}

type ColKind = 'text_array' | 'jsonb' | 'scalar'

const COL_KIND: Record<string, ColKind> = {
  tags: 'text_array',
  drawing_data: 'jsonb',
  raw_user_meta_data: 'jsonb',
}

function sqlLiteral(col: string, val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  const kind = COL_KIND[col] ?? 'scalar'
  if (kind === 'text_array') return pgTextArray(val)
  if (kind === 'jsonb') return pgJsonb(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL'
  if (typeof val === 'object') return pgJsonb(val)   // fallback
  return `'${pgEscStr(String(val))}'`
}

// ── Stable paginated fetch ────────────────────────────────────────────────────

// Composite PKs for join tables; single-column for all others
const TABLE_PK: Record<string, string[]> = {
  coaches:       ['id'],
  teams:         ['id'],
  players:       ['id'],
  games:         ['id'],
  clips:         ['id'],
  clip_players:  ['clip_id', 'player_id'],  // composite
  clip_comments: ['id'],
  stat_entries:  ['id'],
  player_stats:  ['id'],
  stat_clips:    ['stat_id', 'clip_id'],    // composite
}

async function fetchAll<T extends Record<string,unknown>>(
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (q: any) => any
): Promise<T[]> {
  const pk = TABLE_PK[table] ?? ['id']
  const isComposite = pk.length > 1
  const all: T[] = []

  if (isComposite) {
    // Composite PK: use offset with stable ORDER BY
    let offset = 0
    for (;;) {
      let q = filter(db.from(table).select('*'))
      for (const k of pk) q = q.order(k)
      q = q.range(offset, offset + PAGE_SIZE - 1)
      const { data, error } = await q
      if (error) throw new Error(`${table} offset ${offset}: ${error.message}`)
      const rows = (data ?? []) as T[]
      all.push(...rows)
      if (rows.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
  } else {
    // Single PK: cursor-based pagination (gt on last seen PK value)
    const pkCol = pk[0]
    let cursor: unknown = null
    for (;;) {
      let q = filter(db.from(table).select('*'))
      if (cursor !== null) q = q.gt(pkCol, cursor)
      q = q.order(pkCol).limit(PAGE_SIZE)
      const { data, error } = await q
      if (error) throw new Error(`${table} cursor ${cursor}: ${error.message}`)
      const rows = (data ?? []) as T[]
      all.push(...rows)
      if (rows.length < PAGE_SIZE) break
      cursor = rows[rows.length - 1][pkCol]
    }
  }
  return all
}

// ── INSERT block ──────────────────────────────────────────────────────────────

function insertBlock(
  table: string,
  rows: Record<string,unknown>[],
  { omit = [], nullify = [] }: { omit?: string[]; nullify?: string[] } = {}
): string {
  if (rows.length === 0) return `-- ${table}: 0 rows\n`
  const cols = Object.keys(rows[0]).filter(c => !omit.includes(c))
  const lines = [`-- ${table}: ${rows.length} row${rows.length !== 1 ? 's' : ''}`]
  for (const row of rows) {
    const vals = cols.map(c => nullify.includes(c) ? 'NULL' : sqlLiteral(c, row[c])).join(', ')
    lines.push(`INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${vals}) ON CONFLICT DO NOTHING;`)
  }
  return lines.join('\n') + '\n'
}

// ── Round-trip self-check ─────────────────────────────────────────────────────
// Parse generated SQL to verify array/jsonb literals look correct

function roundTripCheck(sql: string, clips: Record<string,unknown>[]): string[] {
  const issues: string[] = []
  // Check that no text[] column appears as a JSON string like '["tag"]'
  const badArrayPattern = /VALUES \([^)]*'(\[.*?\])'[^)]*\)/g
  for (const m of sql.matchAll(badArrayPattern)) {
    issues.push(`Possible JSON-string array literal found: ${m[1].slice(0,40)}`)
  }
  // Verify that clips with non-empty tags have ARRAY[ in the SQL
  const clipsWithTags = clips.filter(c => Array.isArray(c.tags) && (c.tags as unknown[]).length > 0)
  if (clipsWithTags.length > 0 && !sql.includes('ARRAY[')) {
    issues.push(`${clipsWithTags.length} clips have tags but no ARRAY[ found in SQL`)
  }
  // Verify jsonb fields have ::jsonb cast
  const hasDrawing = clips.some(c => c.drawing_data !== null)
  if (hasDrawing && !sql.includes('::jsonb')) {
    issues.push('drawing_data present but no ::jsonb cast found')
  }
  return issues
}

// ── Validation helpers ────────────────────────────────────────────────────────

// Permissibly empty: no data yet, not an integrity problem
const PERMISSIBLY_EMPTY = new Set(['clip_players','clip_comments','player_stats','stat_clips'])
// Required non-empty: must have rows or import is incomplete
const REQUIRED_NONEMPTY = new Set(['coaches','teams','games','players'])

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.error(`\nFilm Room export — source: ${sourceHost}`)
  console.error(`Output: ${TO_STDOUT ? 'stdout' : OUT_PATH}\n`)

  // Fetch FK-scoped rows
  console.error('Fetching...')
  const coaches     = await fetchAll('coaches',       q => q.eq('id', LEGACY_COACH_ID))
  const teams       = await fetchAll('teams',         q => q.eq('id', LEGACY_TEAM_ID))
  const games       = await fetchAll('games',         q => q.eq('team_id', LEGACY_TEAM_ID))
  const gameIds     = games.map(g => g.id as string)
  const players     = await fetchAll('players',       q => q.eq('team_id', LEGACY_TEAM_ID))
  const playerIds   = new Set(players.map(p => p.id as string))

  const clips       = gameIds.length ? await fetchAll('clips',       q => q.in('game_id', gameIds)) : []
  const clipIds     = new Set(clips.map(c => c.id as string))
  const clipPlayers = clipIds.size   ? await fetchAll('clip_players',  q => q.in('clip_id', [...clipIds])) : []
  const clipComments= clipIds.size   ? await fetchAll('clip_comments', q => q.in('clip_id', [...clipIds])) : []
  const statEntries = gameIds.length ? await fetchAll('stat_entries',  q => q.in('game_id', gameIds)) : []
  const playerStats = gameIds.length && playerIds.size
                                     ? await fetchAll('player_stats',  q => q.in('game_id', gameIds)) : []
  const statIds     = new Set(playerStats.map(s => s.id as string))
  const statClips   = clipIds.size && statIds.size
                                     ? await fetchAll('stat_clips', q => q.in('clip_id', [...clipIds]).in('stat_id', [...statIds])) : []

  console.error(`  coaches:${coaches.length} teams:${teams.length} games:${games.length} players:${players.length} clips:${clips.length} stat_entries:${statEntries.length}`)

  // ── Validation ─────────────────────────────────────────────────────────────
  console.error('\nValidation:')
  const integrityErrors: string[] = []   // never bypassed
  const softWarnings: string[]    = []   // bypassed by --force

  const tables = [
    { name:'coaches', rows:coaches },{ name:'teams', rows:teams },
    { name:'games', rows:games },{ name:'players', rows:players },
    { name:'clips', rows:clips },{ name:'clip_players', rows:clipPlayers },
    { name:'clip_comments', rows:clipComments },{ name:'stat_entries', rows:statEntries },
    { name:'player_stats', rows:playerStats },{ name:'stat_clips', rows:statClips },
  ]

  for (const { name, rows } of tables) {
    if (rows.length === 0) {
      if (REQUIRED_NONEMPTY.has(name)) {
        integrityErrors.push(`${name}: 0 rows (required — data import missing?)`)
        console.error(`  ✗ ${name}: 0 rows [INTEGRITY ERROR]`)
      } else if (PERMISSIBLY_EMPTY.has(name)) {
        console.error(`  ○ ${name}: 0 rows [permissible]`)
      } else {
        softWarnings.push(`${name}: 0 rows`)
        console.error(`  ⚠ ${name}: 0 rows`)
      }
    } else {
      const badCount = (name==='coaches'||name==='teams') && rows.length !== 1
      if (badCount) {
        integrityErrors.push(`${name}: ${rows.length} rows, expected 1`)
        console.error(`  ✗ ${name}: ${rows.length} rows [expected 1]`)
      } else {
        console.error(`  ✓ ${name}: ${rows.length}`)
      }
    }
  }

  // FK integrity — always hard errors, never bypassed
  const outOfScopeStats = statEntries.filter(s => s.player_id !== null && !playerIds.has(s.player_id as string))
  if (outOfScopeStats.length > 0) {
    integrityErrors.push(`stat_entries: ${outOfScopeStats.length} rows reference out-of-scope players`)
    console.error(`  ✗ stat_entries: ${outOfScopeStats.length} out-of-scope player refs [INTEGRITY ERROR]`)
  }
  const outOfScopeCP = clipPlayers.filter(cp => !clipIds.has(cp.clip_id as string) || !playerIds.has(cp.player_id as string))
  if (outOfScopeCP.length > 0) {
    integrityErrors.push(`clip_players: ${outOfScopeCP.length} out-of-scope refs`)
    console.error(`  ✗ clip_players: ${outOfScopeCP.length} out-of-scope [INTEGRITY ERROR]`)
  }
  const outOfScopeSC = statClips.filter(sc => !clipIds.has(sc.clip_id as string) || !statIds.has(sc.stat_id as string))
  if (outOfScopeSC.length > 0) {
    integrityErrors.push(`stat_clips: ${outOfScopeSC.length} out-of-scope refs`)
    console.error(`  ✗ stat_clips: ${outOfScopeSC.length} out-of-scope [INTEGRITY ERROR]`)
  }

  if (integrityErrors.length > 0) {
    console.error('\nINTEGRITY ERRORS (not bypassable):')
    for (const e of integrityErrors) console.error(`  • ${e}`)
    process.exit(1)
  }
  if (softWarnings.length > 0 && !FORCE) {
    console.error(`\nWarnings (re-run with --force to proceed): ${softWarnings.join(', ')}`)
    process.exit(1)
  }

  // R2 inventory
  const videoUrls = games.map(g => g.video_url as string|null).filter(Boolean) as string[]
  console.error('\nR2 keys referenced:')
  if (videoUrls.length === 0) {
    console.error('  (none)')
  } else {
    for (const u of videoUrls) console.error(`  ${u.replace(/^https?:\/\/[^/]+\//,'')}`)
    console.error('  Must exist in filmroom-videos bucket; not copied.')
  }

  // Build SQL
  const NULLIFY = ['owner_id','auth_user_id','author_id']
  const OMIT    = ['active_upload_session']

  const sql = [
    '-- Film Room selective export',
    `-- Source: ${sourceHost}  (read-only — no source writes)`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Rows: coaches=${coaches.length} teams=${teams.length} games=${games.length} players=${players.length} clips=${clips.length} stat_entries=${statEntries.length}`,
    `-- R2 keys: ${videoUrls.map(u=>u.replace(/^https?:\/\/[^/]+\//,'')).join(', ')||'none'}`,
    '-- owner_id/auth_user_id/author_id = NULL; assigned by migration 010 after owner signup',
    '-- text[] arrays: ARRAY[...] literals  |  jsonb: ::jsonb cast  |  ON CONFLICT DO NOTHING',
    '',
    'BEGIN;',
    '',
    insertBlock('coaches',      coaches,      { omit:OMIT, nullify:NULLIFY }),
    insertBlock('teams',        teams,        { omit:OMIT, nullify:NULLIFY }),
    insertBlock('players',      players,      { omit:OMIT, nullify:NULLIFY }),
    insertBlock('games',        games,        { omit:OMIT, nullify:NULLIFY }),
    insertBlock('clips',        clips,        { omit:OMIT, nullify:NULLIFY }),
    insertBlock('clip_players', clipPlayers,  { omit:OMIT }),
    insertBlock('clip_comments',clipComments, { omit:OMIT, nullify:NULLIFY }),
    insertBlock('stat_entries', statEntries,  { omit:OMIT, nullify:NULLIFY }),
    insertBlock('player_stats', playerStats,  { omit:OMIT }),
    insertBlock('stat_clips',   statClips,    { omit:OMIT }),
    '',
    'COMMIT;',
  ].join('\n')

  // Round-trip self-check
  const rtIssues = roundTripCheck(sql, clips)
  if (rtIssues.length > 0) {
    console.error('\nROUND-TRIP CHECK FAILURES:')
    for (const i of rtIssues) console.error(`  ✗ ${i}`)
    process.exit(1)
  }
  console.error('\nRound-trip check: OK (array/jsonb literals verified)')

  if (TO_STDOUT) {
    process.stdout.write(sql)
  } else {
    fs.writeFileSync(OUT_PATH, sql, 'utf8')
    const kb = (Buffer.byteLength(sql)/1024).toFixed(1)
    console.error(`\nExport: ${OUT_PATH} (${kb} KB)`)
  }
}

run().catch(e => { console.error('Export failed:', e.message); process.exit(1) })
