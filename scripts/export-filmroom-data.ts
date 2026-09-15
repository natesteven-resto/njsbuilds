/**
 * Film Room Selective Export
 *
 * Reads ONLY Film Room tables from the source (shared) Supabase project.
 * Writes SQL for import into the dedicated Film Room project.
 *
 * Safety guarantees:
 *   - Source URL must be the known shared project; refuses all others
 *   - Never writes to source (SELECT only via service role)
 *   - Paginates all tables (1000 rows/page; handles large datasets)
 *   - FK-scoped: only rows traceable to the Film Room team chain are exported
 *   - Empty-table validation: warns if critical tables have 0 rows
 *   - Conflict detection: reports rows that reference out-of-scope FKs
 *   - owner_id and auth_user_id exported as NULL (set by migration 010)
 *   - active_upload_session omitted (new column not present in source)
 *   - ON CONFLICT DO NOTHING on all inserts (idempotent re-import)
 *   - R2 keys inventoried and printed; no objects copied
 *
 * Usage:
 *   EXPORT_SOURCE_URL=https://suhfyckmuenjskitrzlq.supabase.co \
 *   EXPORT_SOURCE_SERVICE_KEY=<service_role_key> \
 *   npx ts-node scripts/export-filmroom-data.ts [output.sql | -]
 *   Add --force to write despite validation warnings.
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
const LEGACY_TEAM_ID       = '00000000-0000-0000-0000-000000000010'
const LEGACY_COACH_ID      = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE            = 1000

// ── Guards ────────────────────────────────────────────────────────────────────

if (!SOURCE_URL || !SOURCE_KEY) {
  console.error('ABORT: Set EXPORT_SOURCE_URL and EXPORT_SOURCE_SERVICE_KEY')
  process.exit(1)
}

const sourceHost = new URL(SOURCE_URL).hostname
if (sourceHost !== EXPECTED_SOURCE_HOST) {
  console.error(`ABORT: Source must be ${EXPECTED_SOURCE_HOST}, got ${sourceHost}`)
  process.exit(1)
}
if (sourceHost === DEDICATED_HOST) {
  console.error('ABORT: Cannot export from the dedicated Film Room destination project')
  process.exit(1)
}

const dedicatedUrl = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
if (dedicatedUrl && new URL(dedicatedUrl).hostname === sourceHost) {
  console.error('ABORT: NEXT_PUBLIC_FILMROOM_SUPABASE_URL points at the export source')
  process.exit(1)
}

// Read-only client — service role for SELECT, never used for writes
const db = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })

// ── Helpers ───────────────────────────────────────────────────────────────────

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL'
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

/** Paginate through all rows of a filtered query. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T extends Record<string, unknown>>(
  table: string,
  buildQuery: (q: any) => any
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  for (;;) {
    const q = buildQuery(db.from(table).select('*')).range(offset, offset + PAGE_SIZE - 1)
    const { data, error } = await q
    if (error) throw new Error(`Fetching ${table} at offset ${offset}: ${error.message}`)
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}

/** Build INSERT SQL block. nullCols are forced to NULL regardless of source value. */
function insertBlock(
  table: string,
  rows: Record<string, unknown>[],
  { omit = [], nullify = [] }: { omit?: string[]; nullify?: string[] } = {}
): string {
  if (rows.length === 0) return `-- ${table}: 0 rows\n`
  const cols = Object.keys(rows[0]).filter(c => !omit.includes(c))
  const lines = [`-- ${table}: ${rows.length} row${rows.length !== 1 ? 's' : ''}`]
  for (const row of rows) {
    const vals = cols.map(c => nullify.includes(c) ? 'NULL' : sqlLiteral(row[c])).join(', ')
    lines.push(`INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${vals}) ON CONFLICT DO NOTHING;`)
  }
  return lines.join('\n') + '\n'
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.error(`\nFilm Room export from ${sourceHost}`)
  console.error(`Output: ${TO_STDOUT ? 'stdout' : OUT_PATH}\n`)

  // ── Fetch FK-scoped data ─────────────────────────────────────────────────

  console.error('Fetching coaches...')
  const coaches = await fetchAll('coaches', q => q.eq('id', LEGACY_COACH_ID))

  console.error('Fetching teams...')
  const teams = await fetchAll('teams', q => q.eq('id', LEGACY_TEAM_ID))

  console.error('Fetching games...')
  const games = await fetchAll('games', q => q.eq('team_id', LEGACY_TEAM_ID))
  const gameIds = games.map(g => g.id as string)

  console.error('Fetching players...')
  const players = await fetchAll('players', q => q.eq('team_id', LEGACY_TEAM_ID))
  const playerIds = new Set(players.map(p => p.id as string))

  console.error('Fetching clips...')
  const clips = gameIds.length
    ? await fetchAll('clips', q => q.in('game_id', gameIds))
    : []
  const clipIds = new Set(clips.map(c => c.id as string))

  console.error('Fetching clip_players...')
  const clipPlayers = clipIds.size
    ? await fetchAll('clip_players', q => q.in('clip_id', [...clipIds]))
    : []

  console.error('Fetching clip_comments...')
  const clipComments = clipIds.size
    ? await fetchAll('clip_comments', q => q.in('clip_id', [...clipIds]))
    : []

  console.error('Fetching stat_entries...')
  const statEntries = gameIds.length
    ? await fetchAll('stat_entries', q => q.in('game_id', gameIds))
    : []

  console.error('Fetching player_stats...')
  const playerStats = gameIds.length && playerIds.size
    ? await fetchAll('player_stats', q => q.in('game_id', gameIds))
    : []

  console.error('Fetching stat_clips...')
  const statClipStatIds = new Set(playerStats.map(s => s.id as string))
  const statClips = clipIds.size && statClipStatIds.size
    ? await fetchAll('stat_clips', q =>
        q.in('clip_id', [...clipIds]).in('stat_id', [...statClipStatIds]))
    : []

  // ── Validation ────────────────────────────────────────────────────────────

  console.error('\nValidation:')
  let warnings = 0

  const checks: Array<{ label: string; count: number; expected?: string }> = [
    { label: 'coaches',       count: coaches.length,      expected: '1' },
    { label: 'teams',         count: teams.length,         expected: '1' },
    { label: 'games',         count: games.length },
    { label: 'players',       count: players.length },
    { label: 'clips',         count: clips.length },
    { label: 'clip_players',  count: clipPlayers.length },
    { label: 'clip_comments', count: clipComments.length },
    { label: 'stat_entries',  count: statEntries.length },
    { label: 'player_stats',  count: playerStats.length },
    { label: 'stat_clips',    count: statClips.length },
  ]

  for (const c of checks) {
    const expectedMismatch = c.expected && String(c.count) !== c.expected
    const marker = c.count === 0 || expectedMismatch ? '⚠' : '✓'
    console.error(`  ${marker} ${c.label}: ${c.count}${expectedMismatch ? ` (expected ${c.expected})` : ''}`)
    if (c.count === 0 || expectedMismatch) warnings++
  }

  // FK consistency checks — detect rows referencing out-of-scope entities
  const outOfScopeStats = statEntries.filter(
    s => s.player_id !== null && !playerIds.has(s.player_id as string)
  )
  if (outOfScopeStats.length > 0) {
    console.error(`  ⚠ stat_entries: ${outOfScopeStats.length} rows reference players outside export (null player_id = opponent events, expected)`)
    warnings++
  }

  const outOfScopeCP = clipPlayers.filter(
    cp => !clipIds.has(cp.clip_id as string) || !playerIds.has(cp.player_id as string)
  )
  if (outOfScopeCP.length > 0) {
    console.error(`  ⚠ clip_players: ${outOfScopeCP.length} rows reference out-of-scope clips or players`)
    warnings++
  }

  const outOfScopeSC = statClips.filter(
    sc => !clipIds.has(sc.clip_id as string) || !statClipStatIds.has(sc.stat_id as string)
  )
  if (outOfScopeSC.length > 0) {
    console.error(`  ⚠ stat_clips: ${outOfScopeSC.length} rows reference out-of-scope clips or stats`)
    warnings++
  }

  // R2 inventory
  console.error('\nR2 objects referenced in games.video_url:')
  const videoUrls = games.map(g => g.video_url as string | null).filter(Boolean) as string[]
  if (videoUrls.length === 0) {
    console.error('  (none — no video_url set on any game)')
  } else {
    for (const u of videoUrls) {
      const key = u.replace(/^https?:\/\/[^/]+\//, '')
      console.error(`  key: ${key}`)
      console.error(`  url: ${u}`)
    }
    console.error('  These keys must already exist in filmroom-videos bucket. No objects are copied.')
  }

  if (warnings > 0 && !FORCE) {
    console.error(`\n${warnings} validation warning(s). Review above. Re-run with --force to write anyway.`)
    process.exit(1)
  }

  // ── Build SQL ─────────────────────────────────────────────────────────────

  const NULLIFY = ['owner_id', 'auth_user_id', 'author_id'] // cross-project user refs → NULL
  const OMIT    = ['active_upload_session']                   // new column absent from source

  const sql = [
    '-- Film Room selective export',
    `-- Source: ${sourceHost}  (read-only — no writes made to source)`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Games: ${games.length} | Players: ${players.length} | Clips: ${clips.length} | Stat entries: ${statEntries.length}`,
    `-- R2 keys: ${videoUrls.length > 0 ? videoUrls.map(u => u.replace(/^https?:\/\/[^/]+\//, '')).join(', ') : 'none'}`,
    '-- owner_id / auth_user_id / author_id exported as NULL — run migration 010 to assign',
    '-- All inserts use ON CONFLICT DO NOTHING — safe to re-run',
    '',
    'BEGIN;',
    '',
    insertBlock('coaches',       coaches,       { omit: OMIT, nullify: NULLIFY }),
    insertBlock('teams',         teams,         { omit: OMIT, nullify: NULLIFY }),
    insertBlock('players',       players,       { omit: OMIT, nullify: NULLIFY }),
    insertBlock('games',         games,         { omit: OMIT, nullify: NULLIFY }),
    insertBlock('clips',         clips,         { omit: OMIT, nullify: NULLIFY }),
    insertBlock('clip_players',  clipPlayers,   { omit: OMIT }),
    insertBlock('clip_comments', clipComments,  { omit: OMIT, nullify: NULLIFY }),
    insertBlock('stat_entries',  statEntries,   { omit: OMIT, nullify: NULLIFY }),
    insertBlock('player_stats',  playerStats,   { omit: OMIT }),
    insertBlock('stat_clips',    statClips,     { omit: OMIT }),
    '',
    'COMMIT;',
    '',
  ].join('\n')

  if (TO_STDOUT) {
    process.stdout.write(sql)
  } else {
    fs.writeFileSync(OUT_PATH, sql, 'utf8')
    const kb = (Buffer.byteLength(sql) / 1024).toFixed(1)
    console.error(`\nExport written: ${OUT_PATH} (${kb} KB)`)
  }
}

run().catch(e => { console.error('Export failed:', e.message); process.exit(1) })
