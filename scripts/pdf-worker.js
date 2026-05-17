#!/usr/bin/env node
'use strict'

const {
  renderToBuffer, Document, Page, Text, View, Image, StyleSheet,
} = require('@react-pdf/renderer')
const React = require('react')
const h = React.createElement

const NAVY = '#1B4F72'
const ORANGE = '#FF5F04'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#F3F4F6'
const LIGHT_BLUE = '#EBF5FB'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#111827', paddingBottom: 90, paddingTop: 28 },

  // Logo / company band — white, centered
  logoBand: { backgroundColor: 'white', paddingHorizontal: 40, paddingTop: 0, paddingBottom: 20, alignItems: 'center' },
  logoImage: { maxHeight: 130, maxWidth: 300, objectFit: 'contain', marginBottom: 10 },
  logoFallback: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 10 },
  logoAccent: { color: ORANGE },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center' },
  companyContact: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  companyContactText: { fontSize: 9, color: GRAY, textAlign: 'center' },
  // Navy job info band
  header: { backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 18, alignItems: 'center' },
  headerJobDetails: { fontSize: 8, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  headerAddress: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: 'white', marginBottom: 10, textAlign: 'center' },
  headerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  headerCell: { minWidth: 90, alignItems: 'center' },
  headerLabel: { fontSize: 7, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  headerValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: 'white' },

  // Body
  body: { paddingHorizontal: 40, paddingTop: 22 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY,
    marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#DBEAFE',
  },

  // Location / summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { backgroundColor: LIGHT_GRAY, borderRadius: 6, padding: 8, minWidth: 100, flex: 1 },
  summaryLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 2 },
  description: { fontSize: 9, color: GRAY, marginTop: 8 },

  // Notes
  noteRow: { paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  noteTech: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  noteDate: { fontSize: 8, color: GRAY },
  noteText: { fontSize: 9, color: '#4B5563' },

  // Rooms
  roomCard: { marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden' },
  roomHeader: { backgroundColor: LIGHT_BLUE, paddingHorizontal: 12, paddingVertical: 7 },
  roomName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  roomDesc: { fontSize: 8, color: GRAY, marginTop: 1 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: LIGHT_GRAY,
    paddingHorizontal: 12, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase' },
  td: { fontSize: 9, color: '#374151' },
  col1: { width: '18%' }, col2: { width: '10%' }, col3: { width: '10%' },
  col4: { width: '10%' }, col5: { width: '28%' }, col6: { width: '24%' },
  emptyRoom: { paddingHorizontal: 12, paddingVertical: 10, color: GRAY, fontSize: 9 },

  // Photos
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoItem: { flex: 1 },
  photoImage: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 },
  photoTitle: { fontSize: 7, color: GRAY, marginTop: 3, textAlign: 'center' },

  // Footer
  footer: {
    position: 'absolute', bottom: 20, left: 40, right: 40,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8,
  },
  footerLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  footerBrand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  footerAccent: { color: ORANGE },
  pageNum: { fontSize: 8, color: GRAY, marginTop: 3 },
})

function fmt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtDt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function fmtPhone(p) {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  return p
}

async function run() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const { job, company, rooms, notes, logoBase64, photoImages } = JSON.parse(raw)

  const doc = h(Document, { title: `RestoReport — ${job.address}` },
    h(Page, { size: 'LETTER', style: styles.page },

      // ── LOGO + COMPANY BAND (white, centered) ─────────────────────────
      h(View, { style: styles.logoBand },
        logoBase64
          ? h(Image, { src: logoBase64, style: styles.logoImage })
          : h(Text, { style: styles.logoFallback },
              'Resto', h(Text, { style: styles.logoAccent }, 'Reports')
            ),
        company?.business_name && h(Text, { style: styles.companyName }, company.business_name),
        company?.business_address_1 && h(Text, { style: [styles.companyContactText, { marginTop: 3 }] }, company.business_address_1),
        (company?.business_city && company?.business_state)
          ? h(Text, { style: styles.companyContactText }, `${company.business_city}, ${company.business_state}${company.business_zip_code ? ' ' + company.business_zip_code : ''}`)
          : null,
        company?.phone_1 ? h(Text, { style: [styles.companyContactText, { marginTop: 2 }] }, fmtPhone(company.phone_1)) : null,
      ),

      // ── NAVY JOB INFO BAND ─────────────────────────────────────────────
      h(View, { style: styles.header },
        (job.contact_first_name || job.contact_last_name)
          ? h(Text, { style: styles.headerJobDetails },
              `Job Details: ${job.contact_first_name ?? ''} ${job.contact_last_name ?? ''}`.trim()
            )
          : null,
        h(Text, { style: styles.headerAddress }, `${job.address}, ${job.city}, ${job.state} ${job.zip_code ?? ''}`.trim()),
        h(View, { style: styles.headerGrid },
          h(View, { style: styles.headerCell },
            h(Text, { style: styles.headerLabel }, 'Status'),
            h(Text, { style: styles.headerValue }, job.status),
          ),
          job.phone
            ? h(View, { style: styles.headerCell },
                h(Text, { style: styles.headerLabel }, 'Phone'),
                h(Text, { style: styles.headerValue }, fmtPhone(job.phone)),
              )
            : null,
          job.job_number
            ? h(View, { style: styles.headerCell },
                h(Text, { style: styles.headerLabel }, 'Job #'),
                h(Text, { style: styles.headerValue }, job.job_number),
              )
            : null,
          job.claim_number
            ? h(View, { style: styles.headerCell },
                h(Text, { style: styles.headerLabel }, 'Claim #'),
                h(Text, { style: styles.headerValue }, job.claim_number),
              )
            : null,
        ),
      ),

      h(View, { style: styles.body },

        // description if present
        job.description
          ? h(View, { style: [styles.section, { marginTop: 4 }] },
              h(Text, { style: styles.description }, job.description),
            )
          : null,

        // ── 2. FIELD NOTES ─────────────────────────────────────────────
        notes.length > 0
          ? h(View, { style: styles.section },
              h(Text, { style: styles.sectionTitle }, 'Field Notes'),
              h(View, { style: [styles.roomCard, { marginBottom: 0 }] },
                ...notes.map((note, idx) =>
                  h(View, { key: note.id, style: [styles.noteRow, idx === 0 ? { borderTopWidth: 0 } : {}] },
                    h(View, { style: styles.noteMeta },
                      h(Text, { style: styles.noteTech }, note.technician_name),
                      h(Text, { style: styles.noteDate }, fmtDt(note.created_at)),
                    ),
                    h(Text, { style: styles.noteText }, note.value),
                  )
                ),
              ),
            )
          : null,

        // ── 3. ROOM READINGS ───────────────────────────────────────────
        rooms.length > 0
          ? h(View, { style: styles.section },
              h(Text, { style: styles.sectionTitle }, 'Room Moisture Readings'),
              ...rooms.map(room =>
                h(View, { key: room.id, style: styles.roomCard },
                  h(View, { style: styles.roomHeader },
                    h(Text, { style: styles.roomName }, room.name),
                    room.description ? h(Text, { style: styles.roomDesc }, room.description) : null,
                  ),
                  room.room_readings && room.room_readings.length > 0
                    ? h(View, null,
                        h(View, { style: styles.tableHeader },
                          h(Text, { style: [styles.th, styles.col1] }, 'Date'),
                          h(Text, { style: [styles.th, styles.col2] }, 'Temp'),
                          h(Text, { style: [styles.th, styles.col3] }, 'RH%'),
                          h(Text, { style: [styles.th, styles.col4] }, 'GPP'),
                          h(Text, { style: [styles.th, styles.col5] }, 'Moisture Pts'),
                          h(Text, { style: [styles.th, styles.col6] }, 'Equipment'),
                        ),
                        ...room.room_readings.map((r, idx) =>
                          h(View, { key: r.id, style: [styles.tableRow, idx % 2 !== 0 ? styles.tableRowAlt : {}] },
                            h(Text, { style: [styles.td, styles.col1] }, fmtDt(r.created_at)),
                            h(Text, { style: [styles.td, styles.col2] }, r.temperature_in != null ? `${r.temperature_in}°F` : '—'),
                            h(Text, { style: [styles.td, styles.col3] }, r.relative_humidity_in != null ? `${r.relative_humidity_in}%` : '—'),
                            h(Text, { style: [styles.td, styles.col4] }, r.grains_per_pound_in != null ? String(r.grains_per_pound_in) : '—'),
                            h(Text, { style: [styles.td, styles.col5] },
                              r.humidity_readings?.length > 0
                                ? r.humidity_readings.map(hh => `${hh.label}:${hh.value}%`).join('  ')
                                : '—'),
                            h(Text, { style: [styles.td, styles.col6] },
                              r.equipment_readings?.filter(e => e.count > 0).length > 0
                                ? r.equipment_readings.filter(e => e.count > 0).map(e => `${e.count}× ${e.equipment_type?.name ?? '?'}`).join(', ')
                                : '—'),
                          )
                        ),
                      )
                    : h(Text, { style: styles.emptyRoom }, 'No readings recorded'),
                )
              ),
            )
          : null,

        // ── 4. PHOTOS & DOCS ───────────────────────────────────────────
        photoImages && photoImages.length > 0
          ? h(View, { style: styles.section },
              h(Text, { style: styles.sectionTitle }, `Photos & Documents (${photoImages.length})`),
              // Chunk into rows of 3, each row has wrap={false} to prevent mid-photo cuts
              ...Array.from({ length: Math.ceil(photoImages.length / 3) }, (_, rowIdx) => {
                const rowPhotos = photoImages.slice(rowIdx * 3, rowIdx * 3 + 3)
                // Pad to 3 items so flex sizing stays consistent
                while (rowPhotos.length < 3) rowPhotos.push(null)
                return h(View, { key: rowIdx, style: styles.photoRow, wrap: false },
                  ...rowPhotos.map((photo, idx) =>
                    photo
                      ? h(View, { key: idx, style: styles.photoItem },
                          h(Image, { src: photo.base64, style: styles.photoImage }),
                          photo.title ? h(Text, { style: styles.photoTitle }, photo.title) : null,
                        )
                      : h(View, { key: idx, style: styles.photoItem })
                  )
                )
              }),
            )
          : null,
      ),

      // ── FOOTER ─────────────────────────────────────────────────────────
      h(View, { style: styles.footer, fixed: true },
        h(Text, { style: styles.footerLabel }, 'Report Generated By'),
        h(Text, { style: styles.footerBrand },
          'Resto',
          h(Text, { style: styles.footerAccent }, 'Reports'),
          h(Text, { style: styles.footerBrand }, '.com'),
        ),
        h(Text, {
          style: styles.pageNum,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
        }),
      ),
    )
  )

  const buffer = await renderToBuffer(doc)
  process.stdout.write(buffer)
}

run().catch(e => { process.stderr.write(e.message); process.exit(1) })
