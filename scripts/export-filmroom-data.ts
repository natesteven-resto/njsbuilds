/**
 * Film Room Selective Export
 *
 * Reads ONLY Film Room tables from the current (shared) Supabase project
 * and writes a portable SQL file for import into the new dedicated project.
 *
 * What is exported:
 *   coaches, teams, players, games, clips, clip_players, clip_comments,
 *   stat_entries, player_stats, stat_clips
 *
 * What is NOT exported:
 *   - Any RestoReports tables (not touched)
 *   - auth.users (cannot be exported; owner signs up fresh on new project)
 *   - owner_id / auth_user_id columns (nulled — migration 010 re-assigns after signup)
 *   - R2 objects (already in R2; keys are preserved in games.video_url)
 *
 * Safety checks:
 *   - Refuses to run against the new dedicated project URL (export source only)
 *   - Refuses if NEXT_PUBLIC_FILMROOM_SUPABASE_URL is set to the source project
 *   - Prints R2 object inventory for cross-check
 *
 * Usage:
 *   EXPORT_SOURCE_URL=https://suhfyckmuenjskitrzlq.supabase.co \
 *   EXPORT_SOURCE_SERVICE_KEY=*** \
 *   npx ts-node scripts/export-filmroom-data.ts > filmroom-export.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const SOURCE_URL = process.env.EXPORT_SOURCE_URL
const SOURCE_KEY = process.env.EXPORT_SOURCE_SERVICE_KEY
const OUT_PATH   = process.argv[2] ?? 'filmroom-export.sql'

// Guard: must explicitly name the source project
const EXPECTED_SOURCE_HOST = 'suhfyckmuenjskitrzlq.supabase.co'

if (!SOURCE_URL || !SOURCE_KEY) {
  console.error('Set EXPORT_SOURCE_URL and EXPORT_SOURCE_SERVICE_KEY')
  process.exit(1)
}

const sourceHost = new URL(SOURCE_URL).hostname
if (sourceHost !== EXPECTED_SOURCE_HOST) {
  console.error(`Source must be ${EXPECTED_SOURCE_HOST}, got ${sourceHost}`)
  console.error('This script only exports from the known Film Room source project.')
  process.exit(1)
}

// Guard: refuse if the new dedicated project env var is set to the same host
const dedicatedUrl = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
if (dedicatedUrl && new URL(dedicatedUrl).hostname === sourceHost) {
  console.error('NEXT_PUBLIC_FILMROOM_SUPABASE_URL must not point at the source export project')
  process.exit(1)
}

const db = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } })

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

function insertSql(table: string, rows: Record<string, unknown>[], omitCols: string[] = []): string {
  if (rows.length === 0) return `-- No rows in ${table}\n`
  const allCols = Object.keys(rows[0]).filter(c => !omitCols.includes(c))
  const lines = [`-- ${table} (${rows.length} rows)`]
  for (const row of rows) {
    const cols = allCols.join(', ')
    const vals = allCols.map(c => sqlLiteral(row[c])).join(', ')
    lines.push(`INSERT INTO public.${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`)
  }
  return lines.join('\n') + '\n'
}

async function run() {
  const lines: string[] = []
  lines.push('-- Film Room selective export')
  lines.push(`-- Source: ${sourceHost}`)
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push('-- owner_id and auth_user_id are NULL; run migration 010 after owner signs up')
  lines.push('-- Import order matters: run in sequence to satisfy FK constraints')
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')

  // Tables in FK-safe order; omit auth-linked columns (set by migration 010)
  const tables: Array<{ name: string; omit: string[]; filter?: Record<string, string> }> = [
    { name: 'coaches',       omit: ['auth_user_id', 'plan'] },
    { name: 'teams',         omit: ['owner_id'] },
    { name: 'players',       omit: ['owner_id'] },
    { name: 'games',         omit: ['owner_id', 'active_upload_session'] },
    { name: 'clips',         omit: ['owner_id'] },
    { name: 'clip_players',  omit: [] },
    { name: 'clip_comments', omit: ['owner_id', 'author_id'] },
    { name: 'stat_entries',  omit: ['owner_id'] },
    { name: 'player_stats',  omit: [] },
    { name: 'stat_clips',    omit: [] },
  ]

  let gameCount = 0
  let videoKeys: string[] = []

  for (const t of tables) {
    const { data, error } = await db.from(t.name).select('*')
    if (error) { console.error(`Error reading ${t.name}:`, error.message); process.exit(1) }
    const rows = data ?? []
    console.error(`${t.name}: ${rows.length} rows`)

    if (t.name === 'games') {
      gameCount = rows.length
      videoKeys = rows
        .map((r: Record<string, unknown>) => r.video_url as string | null)
        .filter(Boolean) as string[]
    }

    lines.push(insertSql(t.name, rows as Record<string, unknown>[], t.omit))
  }

  lines.push('COMMIT;')
  lines.push('')
  lines.push('-- R2 objects referenced by games.video_url (must already exist in filmroom-videos bucket):')
  for (const url of videoKeys) {
    lines.push(`--   ${url}`)
  }

  const sql = lines.join('\n')
  if (OUT_PATH === '-') {
    process.stdout.write(sql)
  } else {
    fs.writeFileSync(OUT_PATH, sql, 'utf8')
    console.error(`\nExport written to: ${OUT_PATH}`)
    console.error(`Games: ${gameCount}, R2 videos referenced: ${videoKeys.length}`)
    console.error('\nNext step: run import-filmroom-data.ts against the new dedicated project')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
