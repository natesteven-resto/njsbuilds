#!/usr/bin/env node
// Legacy MySQL → Supabase migration script
// Usage: node scripts/migrate-legacy.js /path/to/restoreports_export.json

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
  console.error('Usage: node scripts/migrate-legacy.js <export.json>')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
const { vendors, jobs, rooms, readings, humidities, equipment, notes } = data

console.log(`Loaded: ${vendors.length} companies, ${jobs.length} jobs, ${rooms.length} rooms, ${readings.length} readings`)

// Status mapping
const STATUS_MAP = {
  'Active': 'Mitigation',
  'Pending': 'Initial Assessment',
  'Complete': 'Complete',
  'Opportunity': 'Initial Assessment',
  'Loss': 'Complete',
}

const DEFAULT_PHASES = ['Initial Assessment', 'Mitigation', 'Drying', 'Wrap Up', 'Complete']

async function insertBatch(table, rows, batchSize = 100) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`  Error inserting into ${table}:`, error.message)
      return false
    }
    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${rows.length} inserted into ${table}   `)
  }
  console.log()
  return true
}

async function main() {
  // Maps from old MySQL IDs to new Supabase UUIDs
  const vendorIdMap = {}   // old vendor id → new company id
  const jobIdMap = {}      // old job id → new job id
  const roomIdMap = {}     // old room id → new room id
  const readingIdMap = {}  // old reading id → new reading id

  // ─── Companies ────────────────────────────────────────────────
  console.log('\n[1/7] Migrating companies...')
  for (const v of vendors) {
    // Check if already exists by email
    if (v.email && v.email.includes('@')) {
      const { data: existing } = await supabase
        .from('companies').select('id').eq('email', v.email.toLowerCase().trim()).single()
      if (existing) {
        vendorIdMap[v.id] = existing.id
        process.stdout.write(`\r  ${Object.keys(vendorIdMap).length}/${vendors.length} companies   `)
        continue
      }
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        first_name: v.first_name || '',
        last_name: v.last_name || '',
        email: v.email || '',
        phone_1: v.phone_1 || '',
        business_name: v.business_name || `${v.first_name} ${v.last_name}`.trim() || 'Unnamed Company',
        business_address_1: v.business_address_1 || '',
        business_city: v.business_city || '',
        business_state: v.business_state || '',
        business_zip_code: v.business_zip_code || '',
        active: false,
        trial: false,
        subscription_status: 'inactive',
        phases: DEFAULT_PHASES,
      })
      .select('id')
      .single()

    if (error || !company) {
      console.error(`  Failed to insert company ${v.business_name}:`, error?.message)
      continue
    }
    vendorIdMap[v.id] = company.id

    // Create auth user (no password — they'll need to reset)
    if (v.email && v.email.includes('@') && !v.email.includes('noemail@')) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: v.email.toLowerCase().trim(),
        email_confirm: true,
        user_metadata: { first_name: v.first_name, last_name: v.last_name },
      })

      if (!authError && authUser?.user) {
        await supabase.from('app_users').insert({
          id: authUser.user.id,
          company_id: company.id,
          first_name: v.first_name || '',
          last_name: v.last_name || '',
          email: v.email.toLowerCase().trim(),
          role: 'owner',
          active: false,
        })
      } else if (authError?.message?.includes('already been registered')) {
        console.log(`  Note: ${v.email} already exists in auth`)
      }
    }

    process.stdout.write(`\r  ${Object.keys(vendorIdMap).length}/${vendors.length} companies   `)
  }
  console.log(`\n  Done: ${Object.keys(vendorIdMap).length} companies`)

  // ─── Jobs ─────────────────────────────────────────────────────
  console.log('\n[2/7] Migrating jobs...')
  const jobRows = []
  for (const j of jobs) {
    const companyId = vendorIdMap[j.account_vendor_id]
    if (!companyId) continue
    jobRows.push({
      legacy_id: String(j.id),
      company_id: companyId,
      address: j.address || '',
      city: j.city || '',
      state: j.state || '',
      zip_code: j.zip_code || '',
      phone: j.phone || null,
      claim_number: j.claim_number || null,
      job_number: j.job_number || null,
      contact_first_name: j.contact_first_name || null,
      contact_last_name: j.contact_last_name || null,
      contact_email: j.contact_email || null,
      contact_phone: j.contact_phone || null,
      description: j.description || null,
      status: STATUS_MAP[j.status] || 'Initial Assessment',
      active: j.active === 1,
      created_at: j.created || new Date().toISOString(),
    })
  }

  // Insert jobs in batches and collect ID map
  for (let i = 0; i < jobRows.length; i += 100) {
    const batch = jobRows.slice(i, i + 100)
    const { data: inserted, error } = await supabase
      .from('jobs')
      .insert(batch)
      .select('id, legacy_id')
    if (error) { console.error('  Job insert error:', error.message); continue }
    for (const row of (inserted || [])) {
      if (row.legacy_id) jobIdMap[row.legacy_id] = row.id
    }
    process.stdout.write(`\r  ${Math.min(i + 100, jobRows.length)}/${jobRows.length} jobs   `)
  }
  console.log(`\n  Done: ${Object.keys(jobIdMap).length} jobs`)

  // ─── Rooms ────────────────────────────────────────────────────
  console.log('\n[3/7] Migrating rooms...')
  const roomRows = []
  for (const r of rooms) {
    const jobId = jobIdMap[String(r.account_property_id)]
    if (!jobId) continue
    roomRows.push({
      legacy_id: String(r.id),
      job_id: jobId,
      name: r.name || 'Room',
      description: r.description || null,
      active: true,
      created_at: r.created || new Date().toISOString(),
    })
  }

  for (let i = 0; i < roomRows.length; i += 200) {
    const batch = roomRows.slice(i, i + 200)
    const { data: inserted, error } = await supabase.from('rooms').insert(batch).select('id, legacy_id')
    if (error) { console.error('  Room insert error:', error.message); continue }
    for (const row of (inserted || [])) {
      if (row.legacy_id) roomIdMap[row.legacy_id] = row.id
    }
    process.stdout.write(`\r  ${Math.min(i + 200, roomRows.length)}/${roomRows.length} rooms   `)
  }
  console.log(`\n  Done: ${Object.keys(roomIdMap).length} rooms`)

  // ─── Readings ─────────────────────────────────────────────────
  console.log('\n[4/7] Migrating readings...')
  const readingRows = []
  for (const r of readings) {
    const roomId = roomIdMap[String(r.account_room_id)]
    if (!roomId) continue
    readingRows.push({
      legacy_id: String(r.id),
      room_id: roomId,
      technician_name: r.technician_name || 'Imported',
      temperature_in: r.temperature_in != null ? parseFloat(r.temperature_in) : null,
      relative_humidity_in: r.relative_humidity_in != null ? parseFloat(r.relative_humidity_in) : null,
      grains_per_pound_in: r.grains_per_pound_in != null ? parseFloat(r.grains_per_pound_in) : null,
      notes: r.notes || null,
      notes_private: false,
      created_at: r.created || new Date().toISOString(),
    })
  }

  for (let i = 0; i < readingRows.length; i += 500) {
    const batch = readingRows.slice(i, i + 500)
    const { data: inserted, error } = await supabase.from('room_readings').insert(batch).select('id, legacy_id')
    if (error) { console.error('  Reading insert error:', error.message); continue }
    for (const row of (inserted || [])) {
      if (row.legacy_id) readingIdMap[row.legacy_id] = row.id
    }
    process.stdout.write(`\r  ${Math.min(i + 500, readingRows.length)}/${readingRows.length} readings   `)
  }
  console.log(`\n  Done: ${Object.keys(readingIdMap).length} readings`)

  // ─── Humidity readings ────────────────────────────────────────
  console.log('\n[5/7] Migrating humidity readings...')
  const humRows = []
  for (const h of humidities) {
    const readingId = readingIdMap[String(h.account_room_reading_id)]
    if (!readingId) continue
    humRows.push({
      room_reading_id: readingId,
      label: h.label || 'A',
      value: h.value != null ? parseFloat(h.value) : 0,
    })
  }
  await insertBatch('humidity_readings', humRows, 500)

  // ─── Equipment readings ───────────────────────────────────────
  console.log('\n[6/7] Migrating equipment readings...')
  const equipRows = []
  for (const e of equipment) {
    const readingId = readingIdMap[String(e.account_room_reading_id)]
    if (!readingId) continue
    equipRows.push({
      room_reading_id: readingId,
      name: e.equipment_name || 'Equipment',
      count: e.count != null ? parseInt(e.count) : 1,
    })
  }
  await insertBatch('equipment_readings', equipRows, 500)

  // ─── Notes ───────────────────────────────────────────────────
  console.log('\n[7/7] Migrating notes...')
  const noteRows = []
  for (const n of notes) {
    const jobId = jobIdMap[String(n.account_property_id)]
    if (!jobId) continue
    noteRows.push({
      job_id: jobId,
      value: n.value || '',
      private: false,
      created_at: n.created || new Date().toISOString(),
    })
  }
  await insertBatch('job_notes', noteRows, 200)

  console.log('\n✅ Migration complete!')
  console.log(`  Companies: ${Object.keys(vendorIdMap).length}`)
  console.log(`  Jobs: ${Object.keys(jobIdMap).length}`)
  console.log(`  Rooms: ${Object.keys(roomIdMap).length}`)
  console.log(`  Readings: ${Object.keys(readingIdMap).length}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
