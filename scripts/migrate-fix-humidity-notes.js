#!/usr/bin/env node
// Fix script: re-runs only humidity_readings and job_notes migration
// Use after the main migrate-legacy.js when those two steps errored out.
// Usage: node scripts/migrate-fix-humidity-notes.js /path/to/restoreports_export.json

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const inputFile = process.argv[2]
if (!inputFile) {
  console.error('Usage: node scripts/migrate-fix-humidity-notes.js <export.json>')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
const { humidities, notes } = data

async function insertBatch(table, rows, batchSize = 500) {
  let inserted = 0
  let errors = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`\n  Batch error in ${table}: ${error.message}`)
      errors++
      continue
    }
    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${rows.length} inserted into ${table}   `)
  }
  console.log()
  return { inserted, errors }
}

async function buildIdMap(table, legacyField, newField, batchSize = 1000) {
  const map = {}
  let from = 0
  while (true) {
    const { data: rows, error } = await supabase
      .from(table)
      .select(`${legacyField}, ${newField}`)
      .not(legacyField, 'is', null)
      .range(from, from + batchSize - 1)
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
    if (!rows || rows.length === 0) break
    for (const row of rows) {
      if (row[legacyField]) map[row[legacyField]] = row[newField]
    }
    process.stdout.write(`\r  Loaded ${Object.keys(map).length} ${table} IDs...   `)
    if (rows.length < batchSize) break
    from += batchSize
  }
  console.log()
  return map
}

async function main() {
  // ─── Rebuild ID maps from existing DB data ─────────────────────
  console.log('Rebuilding ID maps from Supabase...')

  console.log('  Loading room_readings legacy IDs...')
  const readingIdMap = await buildIdMap('room_readings', 'legacy_id', 'id')
  console.log(`  → ${Object.keys(readingIdMap).length} reading IDs loaded`)

  console.log('  Loading jobs legacy IDs...')
  const jobIdMap = await buildIdMap('jobs', 'legacy_id', 'id')
  console.log(`  → ${Object.keys(jobIdMap).length} job IDs loaded`)

  // ─── Humidity readings ────────────────────────────────────────
  console.log('\n[5/7] Migrating humidity readings...')
  const humRows = []
  let humSkipped = 0
  for (const h of humidities) {
    const readingId = readingIdMap[String(h.account_room_reading_id)]
    if (!readingId) { humSkipped++; continue }

    // Fix: parseFloat("") = NaN which Postgres rejects — default to 0
    const val = parseFloat(h.value)
    humRows.push({
      room_reading_id: readingId,
      label: h.label || 'A',
      value: isNaN(val) ? 0 : val,
    })
  }
  console.log(`  ${humRows.length} rows to insert (${humSkipped} skipped — no matching reading)`)
  const humResult = await insertBatch('humidity_readings', humRows, 500)
  console.log(`  Done: ${humResult.inserted} humidity readings (${humResult.errors} batch errors)`)

  // ─── Notes ────────────────────────────────────────────────────
  console.log('\n[7/7] Migrating notes...')
  const noteRows = []
  let noteSkipped = 0
  for (const n of notes) {
    const jobId = jobIdMap[String(n.account_property_id)]
    if (!jobId) { noteSkipped++; continue }
    noteRows.push({
      job_id: jobId,
      technician_name: n.technician_name || 'Imported',  // Fix: was missing entirely
      value: n.value || '',
      private: false,
      created_at: n.created || new Date().toISOString(),
    })
  }
  console.log(`  ${noteRows.length} rows to insert (${noteSkipped} skipped — no matching job)`)
  const noteResult = await insertBatch('job_notes', noteRows, 200)
  console.log(`  Done: ${noteResult.inserted} notes (${noteResult.errors} batch errors)`)

  console.log('\n✅ Fix migration complete!')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
