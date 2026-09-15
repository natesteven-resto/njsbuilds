/**
 * Film Room Import Orchestrator
 *
 * Validates the export file, checks pre-conditions, and prints an ordered
 * checklist with exact SQL to paste into the Supabase SQL editor.
 * 
 * Does NOT attempt to run SQL automatically (no exec_sql RPC exists on Supabase;
 * programmatic SQL requires psql/supabase CLI with DB password, not REST API).
 *
 * With --check-owner: calls the Auth admin API on the new project to verify
 * natesteven@gmail.com exists and is confirmed before printing migration 010.
 *
 * Usage:
 *   # Print full import checklist
 *   NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://gurhiziqghzuqumpzkig.supabase.co \
 *   FILMROOM_SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   npx ts-node scripts/import-filmroom-data.ts filmroom-export.sql
 *
 *   # After owner signs up + confirms email:
 *   ... same env vars ... --check-owner
 */

import * as fs from 'fs'
import * as path from 'path'

const DEDICATED_URL     = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
const DEDICATED_SERVICE = process.env.FILMROOM_SUPABASE_SERVICE_ROLE_KEY
const EXPORT_FILE       = process.argv.find(a => a.endsWith('.sql'))
const CHECK_OWNER       = process.argv.includes('--check-owner')

const SOURCE_HOST    = 'suhfyckmuenjskitrzlq.supabase.co'
const DEDICATED_HOST = 'gurhiziqghzuqumpzkig.supabase.co'
const OWNER_EMAIL    = 'natesteven@gmail.com'
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations')

// ── Guards ────────────────────────────────────────────────────────────────────

if (!DEDICATED_URL) {
  console.error('Set NEXT_PUBLIC_FILMROOM_SUPABASE_URL')
  process.exit(1)
}

const destHost = new URL(DEDICATED_URL).hostname
if (destHost === SOURCE_HOST) {
  console.error(`ABORT: destination must not be the source project (${SOURCE_HOST})`)
  process.exit(1)
}
if (destHost !== DEDICATED_HOST) {
  console.error(`ABORT: unexpected destination host ${destHost}, expected ${DEDICATED_HOST}`)
  process.exit(1)
}

if (EXPORT_FILE && !fs.existsSync(EXPORT_FILE)) {
  console.error(`Export file not found: ${EXPORT_FILE}`)
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readMigration(filename: string): string {
  const p = path.join(MIGRATIONS_DIR, filename)
  if (!fs.existsSync(p)) throw new Error(`Migration not found: ${p}`)
  return fs.readFileSync(p, 'utf8')
}

function migrationSummary(filename: string): string {
  const sql = readMigration(filename)
  return `${sql.split('\n').length} lines`
}

async function checkOwnerInNewProject(): Promise<{ found: boolean; confirmed: boolean; idPrefix?: string }> {
  if (!DEDICATED_SERVICE) throw new Error('FILMROOM_SUPABASE_SERVICE_ROLE_KEY not set')
  const res = await fetch(`${DEDICATED_URL}/auth/v1/admin/users?page=1&per_page=100`, {
    headers: {
      Authorization: `Bearer ${DEDICATED_SERVICE}`,
      apikey: DEDICATED_SERVICE,
    },
  })
  if (!res.ok) throw new Error(`Auth API ${res.status}: ${await res.text().then(t => t.slice(0, 100))}`)
  const data = await res.json() as { users?: Array<{ email: string; email_confirmed_at: string | null; id: string }> }
  const user = (data.users ?? []).find(u => u.email === OWNER_EMAIL)
  if (!user) return { found: false, confirmed: false }
  return { found: true, confirmed: !!user.email_confirmed_at, idPrefix: user.id.slice(0, 8) }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n Film Room Import Checklist → ${destHost}`)
  console.log(`  Source export: ${EXPORT_FILE ?? '(not specified)'}`)
  console.log(`  Check owner: ${CHECK_OWNER}\n`)
  console.log('All SQL blocks below must be pasted into the Supabase SQL Editor')
  console.log(`at: https://supabase.com/dashboard/project/gurhiziqghzuqumpzkig/sql/new\n`)
  console.log('─'.repeat(60))

  // ── Step 1: Schema migrations (fresh project) ─────────────────────────────
  console.log('\n[ ] STEP 1 — Run base schema (no seed data)')
  console.log(`    File: supabase/migrations/007b_filmroom_schema_only.sql`)
  console.log(`    Size: ${migrationSummary('007b_filmroom_schema_only.sql')}`)
  console.log('    Purpose: creates Film Room tables with no seed rows')

  console.log('\n[ ] STEP 2 — Auth columns + RLS + upload_sessions')
  console.log(`    File: supabase/migrations/009_filmroom_auth.sql`)
  console.log(`    Size: ${migrationSummary('009_filmroom_auth.sql')}`)
  console.log('    Purpose: adds owner_id, deny-by-default RLS, upload_sessions table')

  console.log('\n[ ] STEP 3 — stat_entries CHECK constraint')
  console.log(`    File: supabase/migrations/011_filmroom_stat_types.sql`)
  console.log(`    Size: ${migrationSummary('011_filmroom_stat_types.sql')}`)

  console.log('\n[ ] STEP 4 — provision_default_library RPC + active_upload_session')
  console.log(`    File: supabase/migrations/012_provision_library.sql`)
  console.log(`    Size: ${migrationSummary('012_provision_library.sql')}`)

  // ── Step 2: Import exported data ─────────────────────────────────────────
  if (EXPORT_FILE) {
    const sql = fs.readFileSync(EXPORT_FILE, 'utf8')
    const gameCount = (sql.match(/INSERT INTO public\.games /g) ?? []).length
    const playerCount = (sql.match(/INSERT INTO public\.players /g) ?? []).length
    const clipCount = (sql.match(/INSERT INTO public\.clips /g) ?? []).length
    const statCount = (sql.match(/INSERT INTO public\.stat_entries /g) ?? []).length
    const kb = (Buffer.byteLength(sql) / 1024).toFixed(1)

    // Validate export mentions expected tables
    const missing = ['coaches','teams','games','players'].filter(
      t => !sql.includes(`INSERT INTO public.${t} `)
    )
    if (missing.length > 0) {
      console.error(`\nWARN: Export missing INSERT blocks for: ${missing.join(', ')}`)
    }

    console.log('\n[ ] STEP 5 — Import exported Film Room data')
    console.log(`    File: ${path.resolve(EXPORT_FILE)} (${kb} KB)`)
    console.log(`    Rows: ~${gameCount} games, ${playerCount} players, ${clipCount} clips, ${statCount} stat entries`)
    console.log('    Method: paste full file content into SQL Editor → Run')
    console.log('    Safe to re-run (ON CONFLICT DO NOTHING throughout)')
    console.log('    ⚠ owner_id is NULL on all rows until Step 7')

    // Check R2 keys referenced
    const r2Pattern = /-- key: ([^\n]+)/g
    const r2Keys = [...sql.matchAll(r2Pattern)].map(m => m[1].trim())
    if (r2Keys.length > 0) {
      console.log(`\n    R2 keys referenced (must exist in filmroom-videos bucket):`)
      for (const k of r2Keys) console.log(`      ${k}`)
    }
  } else {
    console.log('\n[ ] STEP 5 — Import exported Film Room data')
    console.log('    Run export first: npx ts-node scripts/export-filmroom-data.ts')
    console.log('    Then paste output SQL into SQL Editor')
  }

  // ── Step 3: Configure and deploy ─────────────────────────────────────────
  console.log('\n[ ] STEP 6 — Add env vars to Vercel (dashboard only — cannot be set via CLI with protected secrets)')
  console.log('    Go to: vercel.com → njsbuilds → Settings → Environment Variables')
  console.log('    Add:')
  console.log('      NEXT_PUBLIC_FILMROOM_SUPABASE_URL  = https://gurhiziqghzuqumpzkig.supabase.co  (Config)')
  console.log('      NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY = <anon key from Supabase Settings → API>  (Config)')
  console.log('      FILMROOM_SUPABASE_SERVICE_ROLE_KEY = <service_role key from Supabase Settings → API>  (Secret)')
  console.log('    Then: redeploy filmroom-auth branch')

  console.log('\n[ ] STEP 7 — Nate signs up in the Film Room UI')
  console.log('    URL: https://www.njsbuilds.com/filmroom/signup')
  console.log(`    Email: ${OWNER_EMAIL}`)
  console.log('    ⚠ Do NOT sign up on the RestoReports project — the new project is now active')
  console.log('    ⚠ Add /filmroom/auth/callback to Supabase redirect allowlist on new project first')

  console.log('\n[ ] STEP 8 — Confirm email')
  console.log('    Check inbox for confirmation link from new project')

  // ── Step 4: Owner assignment ─────────────────────────────────────────────
  if (CHECK_OWNER) {
    console.log('\n🔑 Checking owner in new project auth...')
    if (!DEDICATED_SERVICE) {
      console.error('FILMROOM_SUPABASE_SERVICE_ROLE_KEY not set — cannot check owner')
    } else {
      try {
        const { found, confirmed, idPrefix } = await checkOwnerInNewProject()
        if (!found) {
          console.log(`  ❌ ${OWNER_EMAIL} NOT found in new project auth`)
          console.log('     Complete steps 7–8 first')
        } else if (!confirmed) {
          console.log(`  ⚠ ${OWNER_EMAIL} found but email NOT confirmed`)
          console.log('     Complete step 8 first')
        } else {
          console.log(`  ✅ ${OWNER_EMAIL} found and confirmed (id: ${idPrefix}...)`)
          console.log('\n[ ] STEP 9 — Run migration 010 (owner assignment)')
          console.log(`    File: supabase/migrations/010_filmroom_data_migration.sql`)
          console.log(`    Size: ${migrationSummary('010_filmroom_data_migration.sql')}`)
          console.log('    Paste into SQL Editor on new project and run')
          console.log('    Pre-flight checks in migration abort on conflict — safe')
        }
      } catch (e) {
        console.error(`  Error checking owner: ${(e as Error).message}`)
      }
    }
  } else {
    console.log('\n[ ] STEP 9 — Run migration 010 (owner assignment)')
    console.log('    Run with --check-owner flag to verify owner is confirmed first:')
    console.log('    npx ts-node scripts/import-filmroom-data.ts filmroom-export.sql --check-owner')
  }

  console.log('\n[ ] STEP 10 — Verify library')
  console.log('    Sign in at /filmroom/login')
  console.log('    Confirm all games, players, clips, 9GB video visible')

  console.log('\n[ ] STEP 11 — Run two-user security tests')
  console.log('    Requires FILMROOM_TEST_PROJECT_HOST set to gurhiziqghzuqumpzkig.supabase.co')
  console.log('    npx ts-node scripts/test-filmroom-auth.ts')
  console.log('    Tests create/delete their own users; never touches Nate\'s data')
  console.log('    ⚠ Do not run after real data is imported (test cleanup deletes test users only)')

  console.log('\n[ ] STEP 12 — CDN cutover (separate decision)')
  console.log('    Only after step 10 confirms video playback via signed URLs')
  console.log('\n' + '─'.repeat(60))
  console.log('Supabase SQL Editor: https://supabase.com/dashboard/project/gurhiziqghzuqumpzkig/sql/new')
}

run().catch(e => { console.error(e); process.exit(1) })
