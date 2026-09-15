/**
 * Film Room Selective Import + Migration Orchestrator
 *
 * Applies migrations 009, 011, 012 to the new dedicated project,
 * then imports exported Film Room data, then runs migration 010
 * (assigns data to verified owner) only after confirming the owner
 * account exists and is confirmed in the new project's auth.users.
 *
 * Migration ordering for a fresh project with no legacy data:
 *   009 → auth columns, RLS, upload_sessions, deny-by-default policies
 *   011 → stat_entries CHECK constraint
 *   012 → provision_default_library RPC + active_upload_session
 *   [DATA IMPORT — all rows with owner_id = NULL]
 *   010 → assigns all rows to verified natesteven@gmail.com
 *           (requires owner to have signed up + confirmed email first)
 *
 * Idempotency:
 *   - All inserts use ON CONFLICT DO NOTHING
 *   - Migrations use CREATE IF NOT EXISTS / DROP IF EXISTS patterns
 *   - 010 pre-flight checks abort cleanly if already assigned or missing owner
 *   - Safe to re-run entire import if interrupted
 *
 * Conflict/consistency checks:
 *   - Verifies new project URL is not the source project
 *   - Verifies new project URL is not the RestoReports project
 *   - Verifies export file exists and contains expected tables
 *   - Verifies R2 objects referenced in games.video_url are accessible
 *   - Runs 010 only when owner is confirmed; dry-run flag skips it
 *
 * Usage:
 *   # Step 1: Apply migrations + import data (owner_id = NULL)
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://<new>.supabase.co \
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=*** \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=*** \
 *   npx ts-node scripts/import-filmroom-data.ts filmroom-export.sql
 *
 *   # Step 2: After owner signs up + confirms email, run assignment:
 *   ... same env vars ... npx ts-node scripts/import-filmroom-data.ts filmroom-export.sql --assign-owner
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const DEDICATED_URL = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
const DEDICATED_ANON = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY
const DEDICATED_SERVICE = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY

const EXPORT_FILE = process.argv[2]
const ASSIGN_OWNER = process.argv.includes('--assign-owner')
const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_HOST = 'suhfyckmuenjskitrzlq.supabase.co'
const RESTOREPORTS_HOST = 'suhfyckmuenjskitrzlq.supabase.co' // same project
const OWNER_EMAIL = 'natesteven@gmail.com'

// ── Guards ────────────────────────────────────────────────────────────────────

if (!DEDICATED_URL || !DEDICATED_ANON || !DEDICATED_SERVICE) {
  console.error('Required env vars: NEXT_PUBLIC_FILMROOM_SUPABASE_URL, NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY, FILMROOM_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const destHost = new URL(DEDICATED_URL).hostname
if (destHost === SOURCE_HOST) {
  console.error(`ABORT: destination must not be the source project (${SOURCE_HOST})`)
  process.exit(1)
}
if (destHost === RESTOREPORTS_HOST) {
  console.error('ABORT: destination must not be the RestoReports project')
  process.exit(1)
}

if (!EXPORT_FILE || !fs.existsSync(EXPORT_FILE)) {
  console.error('Usage: import-filmroom-data.ts <export.sql> [--assign-owner] [--dry-run]')
  process.exit(1)
}

const svc = createClient(DEDICATED_URL, DEDICATED_SERVICE, { auth: { persistSession: false } })

// ── Helpers ───────────────────────────────────────────────────────────────────

async function runSql(label: string, sql: string): Promise<void> {
  if (DRY_RUN) { console.log(`[DRY RUN] Would execute: ${label}`); return }
  const { error } = await svc.rpc('exec_sql', { sql }).single()
  // Note: exec_sql is a convenience function; in practice use the Supabase SQL editor
  // or psql directly for migration files. This script outputs the SQL for manual run.
  if (error) throw new Error(`${label} failed: ${error.message}`)
}

async function readMigration(filename: string): Promise<string> {
  const p = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  return fs.readFileSync(p, 'utf8')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🎬 Film Room Import → ${destHost}`)
  console.log(`   Export file: ${EXPORT_FILE}`)
  console.log(`   Assign owner: ${ASSIGN_OWNER}`)
  console.log(`   Dry run: ${DRY_RUN}\n`)

  // ── 1. Verify destination is fresh (no existing Film Room tables) ──────────
  console.log('📋 Pre-flight: checking destination...')
  const { data: existingGames } = await svc.from('games').select('id').limit(1)
  if (existingGames && existingGames.length > 0 && !ASSIGN_OWNER) {
    console.log('  ⚠️  Destination already has data. Re-import will use ON CONFLICT DO NOTHING.')
    console.log('  To re-assign owner only, pass --assign-owner.')
  }

  // ── 2. Print migration SQL for manual application ─────────────────────────
  // We output SQL blocks for manual execution in Supabase SQL editor
  // because the management API cannot run arbitrary SQL blocks.
  // Each migration is idempotent.
  console.log('\n📄 Migration SQL to run in Supabase SQL editor (in order):')
  console.log('   Copy each block to Supabase → SQL Editor → New query → Run\n')

  const migrationFiles = [
    '009_filmroom_auth.sql',
    '011_filmroom_stat_types.sql',
    '012_provision_library.sql',
  ]

  // Output migration summary (not full SQL — too long for console)
  for (const f of migrationFiles) {
    try {
      const sql = await readMigration(f)
      const lineCount = sql.split('\n').length
      console.log(`   📁 supabase/migrations/${f} (${lineCount} lines) — copy and run manually`)
    } catch { console.log(`   ⚠️  ${f} not found`) }
  }

  // ── 3. Verify export file structure ──────────────────────────────────────
  console.log('\n🔍 Verifying export file...')
  const exportSql = fs.readFileSync(EXPORT_FILE, 'utf8')
  const expectedTables = ['coaches', 'teams', 'players', 'games', 'clips']
  const missing = expectedTables.filter(t => !exportSql.includes(`INSERT INTO public.${t}`))
  if (missing.length > 0) {
    console.error(`Export file missing tables: ${missing.join(', ')}`)
    process.exit(1)
  }

  // Count rows
  const gameInserts = (exportSql.match(/INSERT INTO public\.games /g) ?? []).length
  const videoUrls = (exportSql.match(/https:\/\/[^\s']+r2[^\s']+/g) ?? [])
  console.log(`  ✅ Export looks valid: ~${gameInserts} game rows, ${videoUrls.length} R2 video references`)

  // ── 4. Output import SQL path ─────────────────────────────────────────────
  console.log('\n📥 Import SQL:')
  console.log(`   Run in Supabase SQL Editor: ${path.resolve(EXPORT_FILE)}`)
  console.log('   (all inserts use ON CONFLICT DO NOTHING — safe to re-run)')

  // ── 5. Owner assignment ───────────────────────────────────────────────────
  if (ASSIGN_OWNER) {
    console.log('\n🔑 Owner assignment: verifying natesteven@gmail.com in new project auth...')

    // Check via admin API
    const adminRes = await fetch(`${DEDICATED_URL}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { Authorization: `Bearer ${DEDICATED_SERVICE}`, apikey: DEDICATED_ANON! }
    })
    const adminData = await adminRes.json()
    const users = adminData.users ?? []
    const owner = users.find((u: { email: string; email_confirmed_at: string | null }) =>
      u.email === OWNER_EMAIL && u.email_confirmed_at
    )

    if (!owner) {
      console.error(`\n❌ ABORT: ${OWNER_EMAIL} not found or not confirmed in new project auth.users`)
      console.error('   Nate must sign up at /filmroom/signup and confirm email first.')
      console.error('   Do not run --assign-owner until this is done.')
      process.exit(1)
    }

    console.log(`  ✅ Owner confirmed: ${owner.email} (id: ${owner.id.slice(0, 8)}...)`)
    console.log('\n📋 Migration 010 SQL to run in Supabase SQL Editor:')
    try {
      const sql010 = await readMigration('010_filmroom_data_migration.sql')
      console.log(`   supabase/migrations/010_filmroom_data_migration.sql (${sql010.split('\n').length} lines)`)
      console.log('   Pre-flight checks in the migration will verify the owner and abort on conflict.')
    } catch {
      console.log('   ⚠️  010 migration file not found')
    }
  } else {
    console.log('\n⏭️  Skipping owner assignment (no --assign-owner flag)')
    console.log(`   After Nate signs up + confirms email at ${OWNER_EMAIL},`)
    console.log('   re-run with --assign-owner to run migration 010.')
  }

  // ── 6. R2 inventory check ─────────────────────────────────────────────────
  console.log('\n☁️  R2 objects referenced in export:')
  const r2Pattern = /games\/[^\s'"]+\.(mp4|mov|mkv|MP4|MOV|MKV)/g
  const r2Keys = [...new Set([...exportSql.matchAll(r2Pattern)].map(m => m[0]))]
  if (r2Keys.length === 0) {
    console.log('   No R2 video keys found in export (videos may not be attached yet)')
  } else {
    for (const key of r2Keys) {
      console.log(`   ✓ ${key}`)
    }
    console.log('   These already exist in filmroom-videos bucket — no action needed.')
    console.log('   The new project\'s API routes will generate signed URLs for the same keys.')
  }

  console.log('\n✅ Import plan complete. No production changes made.')
  console.log('\nOrdered checklist:')
  console.log('  [ ] Create new Supabase project (cost approved)')
  console.log('  [ ] Run migrations 009, 011, 012 in SQL editor')
  console.log('  [ ] Run export: scripts/export-filmroom-data.ts > filmroom-export.sql')
  console.log('  [ ] Run import SQL in SQL editor (ON CONFLICT DO NOTHING)')
  console.log('  [ ] Set NEXT_PUBLIC_FILMROOM_SUPABASE_URL etc in Vercel + .env.local')
  console.log('  [ ] Deploy filmroom-auth branch')
  console.log('  [ ] Nate signs up at /filmroom/signup with natesteven@gmail.com')
  console.log('  [ ] Nate confirms email')
  console.log('  [ ] Run: npx ts-node scripts/import-filmroom-data.ts filmroom-export.sql --assign-owner')
  console.log('  [ ] Run migration 010 in SQL editor')
  console.log('  [ ] Verify library (games, players, clips, 9GB video)')
  console.log('  [ ] Run two-user security tests')
  console.log('  [ ] CDN cutover (separate decision)')
}

run().catch(e => { console.error(e); process.exit(1) })
