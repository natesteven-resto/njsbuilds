'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'

// ---------- Types ----------
type OneOff = { id: string; date: string; label: string; amount: number }
type Recurring = {
  id: string
  label: string
  amount: number
  cadence: 'monthly' | 'weekly' | 'biweekly'
  dayOfMonth?: number
  weekday?: number
  startDate?: string
}
type Override = { recId: string; originalDate: string; newDate: string }
type ForcastDoc = {
  startingBalance: number
  startingDate: string
  oneOffs: OneOff[]
  recurring: Recurring[]
  overrides: Override[]
}

// ---------- Helpers ----------
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const uid = () => Math.random().toString(36).slice(2, 10)

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function moneyShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}$${abs.toFixed(0)}`
}
function diffDays(a: Date, b: Date): number {
  const ms = parseYmd(ymd(a)).getTime() - parseYmd(ymd(b)).getTime()
  return Math.round(ms / 86400000)
}

// Expand a recurring rule into concrete YYYY-MM-DD hits within [start,end]
function recurringHits(r: Recurring, start: Date, end: Date): string[] {
  const hits: string[] = []
  if (r.cadence === 'monthly') {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const dim = daysInMonth(cur.getFullYear(), cur.getMonth())
      const day = Math.min(r.dayOfMonth ?? 1, dim)
      const d = new Date(cur.getFullYear(), cur.getMonth(), day)
      if (d >= start && d <= end) hits.push(ymd(d))
      cur.setMonth(cur.getMonth() + 1)
    }
  } else if (r.cadence === 'weekly' || r.cadence === 'biweekly') {
    const step = r.cadence === 'weekly' ? 7 : 14
    let anchor = r.startDate ? parseYmd(r.startDate) : new Date(start)
    if (!r.startDate && r.weekday != null) {
      while (anchor.getDay() !== r.weekday) anchor.setDate(anchor.getDate() + 1)
    }
    let d = new Date(anchor)
    while (d < start) d.setDate(d.getDate() + step)
    while (d <= end) {
      hits.push(ymd(d))
      d.setDate(d.getDate() + step)
    }
  }
  return hits
}

type DayItem = { label: string; amount: number; recurring: boolean; recId?: string; originalDate?: string }

// ---------- Page ----------
export default function ForcastPage() {
  const [doc, setDoc] = useState<ForcastDoc | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const now = new Date()
  const [anchorY, setAnchorY] = useState(now.getFullYear())
  const [anchorM, setAnchorM] = useState(now.getMonth())

  useEffect(() => {
    fetch('/api/forcast')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDoc({ overrides: [], ...d.doc })
        else setDoc({ startingBalance: 0, startingDate: ymd(now), oneOffs: [], recurring: [], overrides: [] })
      })
      .catch(() =>
        setDoc({ startingBalance: 0, startingDate: ymd(now), oneOffs: [], recurring: [], overrides: [] })
      )
      .finally(() => setLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback((next: ForcastDoc) => {
    setSaving(true)
    fetch('/api/forcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .catch(() => {})
      .finally(() => setSaving(false))
  }, [])

  const update = useCallback(
    (mut: (d: ForcastDoc) => ForcastDoc) => {
      setDoc((prev) => {
        if (!prev) return prev
        const next = mut(prev)
        save(next)
        return next
      })
    },
    [save]
  )

  const months = useMemo(() => {
    const m1 = { y: anchorY, m: anchorM }
    const m2Date = new Date(anchorY, anchorM + 1, 1)
    const m2 = { y: m2Date.getFullYear(), m: m2Date.getMonth() }
    return [m1, m2]
  }, [anchorY, anchorM])

  const computed = useMemo(() => {
    if (!doc) return null
    const startDate = parseYmd(doc.startingDate)
    const firstVisible = new Date(months[0].y, months[0].m, 1)
    const lastVisible = new Date(months[1].y, months[1].m, daysInMonth(months[1].y, months[1].m))
    const windowStart = startDate < firstVisible ? startDate : firstVisible

    const byDate: Record<string, DayItem[]> = {}
    const add = (date: string, label: string, amount: number, rec: boolean, recId?: string, originalDate?: string) => {
      ;(byDate[date] ||= []).push({ label, amount, recurring: rec, recId, originalDate })
    }
    for (const o of doc.oneOffs) add(o.date, o.label, o.amount, false)

    const ovMap: Record<string, string> = {}
    for (const ov of doc.overrides || []) ovMap[`${ov.recId}|${ov.originalDate}`] = ov.newDate

    for (const r of doc.recurring) {
      const padStart = new Date(windowStart); padStart.setDate(padStart.getDate() - 40)
      const padEnd = new Date(lastVisible); padEnd.setDate(padEnd.getDate() + 40)
      for (const hit of recurringHits(r, padStart, padEnd)) {
        const shown = ovMap[`${r.id}|${hit}`] ?? hit
        add(shown, r.label, r.amount, true, r.id, hit)
      }
    }

    const balByDate: Record<string, number> = {}
    let bal = doc.startingBalance
    const totalDays = diffDays(lastVisible, startDate)
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = ymd(d)
      const items = byDate[key] || []
      for (const it of items) bal += it.amount
      balByDate[key] = bal
    }

    return { byDate, balByDate, startDate }
  }, [doc, months])

  if (!loaded || !doc || !computed) {
    return (
      <main style={S.page}>
        <div style={S.bgGlow} />
        <div style={S.loadingWrap}><div style={S.loading}>Loading forecast…</div></div>
      </main>
    )
  }

  const todayKey = ymd(now)

  const goPrev = () => { const d = new Date(anchorY, anchorM - 1, 1); setAnchorY(d.getFullYear()); setAnchorM(d.getMonth()) }
  const goNext = () => { const d = new Date(anchorY, anchorM + 1, 1); setAnchorY(d.getFullYear()); setAnchorM(d.getMonth()) }
  const goToday = () => { setAnchorY(now.getFullYear()); setAnchorM(now.getMonth()) }

  const addOneOffTo = (date: string) => {
    const label = prompt('Label (e.g. Paycheck, Rent):')
    if (label == null) return
    const raw = prompt('Amount — positive = income, negative = expense:')
    if (raw == null) return
    const amount = Number(raw)
    if (!isFinite(amount)) return
    update((d) => ({ ...d, oneOffs: [...d.oneOffs, { id: uid(), date, label: label.trim(), amount }] }))
  }

  return (
    <main style={S.page}>
      <div style={S.bgGlow} />
      <div style={S.bgGlow2} />
      <div style={S.container}>
        {/* Header */}
        <header style={S.header}>
          <div>
            <h1 style={S.h1}>Forecast</h1>
            <p style={S.sub}>Two months at a glance · balance carried forward daily</p>
          </div>
          <div style={S.headerRight}>
            <div style={S.saveInd}>
              <span style={{ ...S.saveDot, background: saving ? '#fbbf24' : '#34d399' }} />
              {saving ? 'Saving' : 'Saved'}
            </div>
            <button style={S.gearBtn} onClick={() => setSettingsOpen((o) => !o)} title="Settings">⚙</button>
          </div>
        </header>

        {/* Nav */}
        <div style={S.nav}>
          <button style={S.navBtn} onClick={goPrev}>‹</button>
          <button style={S.navBtnGhost} onClick={goToday}>Today</button>
          <button style={S.navBtn} onClick={goNext}>›</button>
        </div>

        {/* Two months */}
        <div style={S.monthsRow}>
          {months.map((mm) => (
            <MonthCalendar
              key={`${mm.y}-${mm.m}`}
              year={mm.y}
              month={mm.m}
              byDate={computed.byDate}
              balByDate={computed.balByDate}
              todayKey={todayKey}
              startKey={doc.startingDate}
              onAddOneOff={addOneOffTo}
              onRemoveOneOff={(id) => update((d) => ({ ...d, oneOffs: d.oneOffs.filter((o) => o.id !== id) }))}
              onMoveOneOff={(id, newDate) =>
                update((d) => ({ ...d, oneOffs: d.oneOffs.map((o) => (o.id === id ? { ...o, date: newDate } : o)) }))
              }
              onMoveRecurring={(recId, originalDate, newDate) =>
                update((d) => {
                  const others = (d.overrides || []).filter((ov) => !(ov.recId === recId && ov.originalDate === originalDate))
                  if (newDate === originalDate) return { ...d, overrides: others }
                  return { ...d, overrides: [...others, { recId, originalDate, newDate }] }
                })
              }
              oneOffs={doc.oneOffs}
            />
          ))}
        </div>

        {/* Recurring manager */}
        <RecurringManager doc={doc} update={update} />

        {/* Settings drawer (starting balance lives here now) */}
        {settingsOpen && (
          <div style={S.drawerOverlay} onClick={() => setSettingsOpen(false)}>
            <div style={S.drawer} onClick={(e) => e.stopPropagation()}>
              <div style={S.drawerHead}>
                <span style={S.drawerTitle}>Settings</span>
                <button style={S.drawerClose} onClick={() => setSettingsOpen(false)}>✕</button>
              </div>
              <StartFields doc={doc} update={update} />
              <p style={S.recHint}>Your starting balance anchors the forecast. Everything after this date is projected forward.</p>
            </div>
          </div>
        )}

        <footer style={S.footer}>Tap any day to add · tap an item to move or remove</footer>
      </div>
    </main>
  )
}

// ---------- Starting balance fields (in drawer) ----------
function StartFields({ doc, update }: { doc: ForcastDoc; update: (m: (d: ForcastDoc) => ForcastDoc) => void }) {
  const [bal, setBal] = useState(String(doc.startingBalance))
  const [date, setDate] = useState(doc.startingDate)
  useEffect(() => { setBal(String(doc.startingBalance)); setDate(doc.startingDate) }, [doc.startingBalance, doc.startingDate])
  return (
    <div style={S.startBar}>
      <div style={S.startField}>
        <label style={S.startLabel}>Starting balance</label>
        <input style={S.startInput} type="number" value={bal}
          onChange={(e) => setBal(e.target.value)}
          onBlur={() => update((d) => ({ ...d, startingBalance: Number(bal) || 0 }))} />
      </div>
      <div style={S.startField}>
        <label style={S.startLabel}>As of</label>
        <input style={S.startInput} type="date" value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => update((d) => ({ ...d, startingDate: date }))} />
      </div>
    </div>
  )
}

// ---------- Month calendar ----------
function MonthCalendar({
  year, month, byDate, balByDate, todayKey, startKey, onAddOneOff, onRemoveOneOff, onMoveOneOff, onMoveRecurring, oneOffs,
}: {
  year: number; month: number
  byDate: Record<string, DayItem[]>
  balByDate: Record<string, number>
  todayKey: string; startKey: string
  onAddOneOff: (date: string) => void
  onRemoveOneOff: (id: string) => void
  onMoveOneOff: (id: string, newDate: string) => void
  onMoveRecurring: (recId: string, originalDate: string, newDate: string) => void
  oneOffs: OneOff[]
}) {
  const dim = daysInMonth(year, month)
  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const endBal = balByDate[ymd(new Date(year, month, dim))]

  return (
    <div style={S.month}>
      <div style={S.monthHead}>
        <span style={S.monthTitle}>{MONTHS[month]}<span style={S.monthYear}> {year}</span></span>
        {endBal != null && (
          <span style={{ ...S.monthEnd, ...(endBal < 0 ? S.monthEndNeg : S.monthEndPos) }}>
            {money(endBal)}
          </span>
        )}
      </div>
      <div style={S.dow}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={i} style={S.dowCell}>{d}</div>
        ))}
      </div>
      <div style={S.grid}>
        {cells.map((d, i) => {
          if (d == null) return <div key={i} style={S.emptyCell} />
          const key = ymd(new Date(year, month, d))
          const items = byDate[key] || []
          const bal = balByDate[key]
          const isToday = key === todayKey
          const isStart = key === startKey
          const hasItems = items.length > 0
          return (
            <div
              key={i}
              style={{ ...S.day, ...(isToday ? S.dayToday : {}), ...(isStart ? S.dayStart : {}) }}
              onClick={() => onAddOneOff(key)}
            >
              <div style={S.dayTop}>
                <span style={{ ...S.dayNum, ...(isToday ? S.dayNumToday : {}) }}>{d}</span>
              </div>

              <div style={S.dayItems}>
                {items.map((it, j) => {
                  const oneOff = !it.recurring && oneOffs.find((o) => o.date === key && o.label === it.label && o.amount === it.amount)
                  const moved = it.recurring && it.originalDate && it.originalDate !== key
                  const handleTap = (e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (it.recurring && it.recId && it.originalDate) {
                      const to = prompt(
                        `Move "${it.label}" ${money(it.amount)} to which date? (YYYY-MM-DD)\n\nOnly this occurrence moves — the recurring rule stays put.\nEnter its original date (${it.originalDate}) to move it back.`,
                        key
                      )
                      if (to == null) return
                      const t = to.trim()
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) { alert('Use format YYYY-MM-DD'); return }
                      onMoveRecurring(it.recId, it.originalDate, t)
                      return
                    }
                    if (oneOff) {
                      const choice = prompt(
                        `"${it.label}" ${money(it.amount)}\n\nType a new date (YYYY-MM-DD) to MOVE it, or "x" to REMOVE it.`,
                        key
                      )
                      if (choice == null) return
                      const c = choice.trim().toLowerCase()
                      if (c === 'x' || c === 'delete' || c === 'remove') { onRemoveOneOff((oneOff as OneOff).id); return }
                      if (/^\d{4}-\d{2}-\d{2}$/.test(choice.trim())) onMoveOneOff((oneOff as OneOff).id, choice.trim())
                      else alert('Use format YYYY-MM-DD to move, or "x" to remove.')
                    }
                  }
                  const income = it.amount >= 0
                  return (
                    <div
                      key={j}
                      style={{ ...S.item, ...(income ? S.itemIncome : S.itemExpense) }}
                      onClick={handleTap}
                      title={it.recurring ? (moved ? 'Recurring (moved) — tap to move' : 'Recurring — tap to move') : 'Tap to move or remove'}
                    >
                      <span style={S.itemLabel}>{it.recurring ? (moved ? '→ ' : '↻ ') : ''}{it.label}</span>
                      <span style={S.itemAmt}>{income ? '+' : ''}{moneyShort(it.amount)}</span>
                    </div>
                  )
                })}
              </div>

              {bal != null && (
                <div style={{ ...S.balChip, ...(bal < 0 ? S.balChipNeg : hasItems ? S.balChipPos : S.balChipIdle) }}>
                  {money(bal)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Recurring manager ----------
function RecurringManager({ doc, update }: { doc: ForcastDoc; update: (m: (d: ForcastDoc) => ForcastDoc) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [cadence, setCadence] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [weekday, setWeekday] = useState('5')
  const [startDate, setStartDate] = useState(ymd(new Date()))

  const addRec = () => {
    if (!label.trim() || !isFinite(Number(amount))) return
    const r: Recurring = {
      id: uid(), label: label.trim(), amount: Number(amount), cadence,
      ...(cadence === 'monthly' ? { dayOfMonth: Number(dayOfMonth) } : {}),
      ...(cadence !== 'monthly' ? { weekday: Number(weekday), startDate } : {}),
    }
    update((d) => ({ ...d, recurring: [...d.recurring, r] }))
    setLabel(''); setAmount('')
  }

  return (
    <section style={S.recSection}>
      <button style={S.recToggle} onClick={() => setOpen((o) => !o)}>
        <span>{open ? '▾' : '▸'} Recurring income & expenses</span>
        <span style={S.recCount}>{doc.recurring.length}</span>
      </button>
      {open && (
        <div style={S.recBody}>
          <div style={S.recList}>
            {doc.recurring.length === 0 && <div style={S.recEmpty}>None yet. Add one below.</div>}
            {doc.recurring.map((r) => (
              <div key={r.id} style={S.recRow}>
                <span style={{ ...S.recAmt, color: r.amount < 0 ? '#f87171' : '#34d399' }}>
                  {r.amount < 0 ? '' : '+'}{money(r.amount)}
                </span>
                <span style={S.recLbl}>{r.label}</span>
                <span style={S.recCad}>
                  {r.cadence === 'monthly' ? `day ${r.dayOfMonth}` : `${r.cadence} · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][r.weekday ?? 0]}`}
                </span>
                <button style={S.recDel} onClick={() => update((d) => ({ ...d, recurring: d.recurring.filter((x) => x.id !== r.id) }))}>✕</button>
              </div>
            ))}
          </div>
          <div style={S.recForm}>
            <input style={S.recInput} placeholder="Label (e.g. Rent)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input style={S.recInputSm} placeholder="Amount ±" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select style={S.recInputSm} value={cadence} onChange={(e) => setCadence(e.target.value as any)}>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="weekly">Weekly</option>
            </select>
            {cadence === 'monthly' ? (
              <input style={S.recInputSm} type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} title="Day of month" />
            ) : (
              <input style={S.recInputSm} type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setWeekday(String(parseYmd(e.target.value).getDay())) }} title="First occurrence" />
            )}
            <button style={S.recAdd} onClick={addRec}>Add</button>
          </div>
          <p style={S.recHint}>Negative = expense (e.g. -850 rent), positive = income.</p>
        </div>
      )}
    </section>
  )
}

// ---------- Styles (liquid glass) ----------
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(31,38,135,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(160deg, #eef2ff 0%, #f6f0ff 40%, #eafcff 100%)',
    padding: '18px 12px 70px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1e293b',
  },
  bgGlow: { position: 'fixed', top: -120, left: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.35), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 },
  bgGlow2: { position: 'fixed', bottom: -140, right: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,234,212,0.28), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 },
  container: { maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 },
  loadingWrap: { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 },
  loading: { color: '#64748b', fontSize: 16 },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  h1: { margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  saveInd: { ...glass, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', padding: '6px 12px', borderRadius: 999 },
  saveDot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  gearBtn: { ...glass, width: 38, height: 38, borderRadius: 12, fontSize: 17, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  nav: { display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  navBtn: { ...glass, width: 44, height: 40, fontSize: 20, fontWeight: 700, borderRadius: 12, color: '#4f46e5', cursor: 'pointer' },
  navBtnGhost: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none', padding: '10px 22px', fontSize: 14, fontWeight: 700, borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.4)' },

  monthsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 },
  month: { ...glass, borderRadius: 24, overflow: 'hidden' },
  monthHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.5)' },
  monthTitle: { fontSize: 19, fontWeight: 800, color: '#1e293b' },
  monthYear: { fontWeight: 500, color: '#94a3b8' },
  monthEnd: { fontSize: 15, fontWeight: 800, padding: '6px 14px', borderRadius: 999 },
  monthEndPos: { color: '#047857', background: 'rgba(52,211,153,0.18)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.35)' },
  monthEndNeg: { color: '#b91c1c', background: 'rgba(248,113,113,0.18)', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.4)' },

  dow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  dowCell: { textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '8px 0', textTransform: 'uppercase', letterSpacing: 0.5 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '4px 6px 8px' },
  emptyCell: { minHeight: 96, borderRadius: 12, background: 'rgba(255,255,255,0.12)' },
  day: {
    minHeight: 96, borderRadius: 12, padding: '6px 6px 4px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', position: 'relative',
    background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.4)',
    transition: 'transform 0.1s',
  },
  dayToday: { background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.55)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15), 0 4px 14px rgba(99,102,241,0.2)' },
  dayStart: { background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.4)' },
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dayNum: { fontSize: 12, fontWeight: 700, color: '#94a3b8', lineHeight: 1 },
  dayNumToday: { color: '#4f46e5' },
  dayItems: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, flex: 1 },

  item: { fontSize: 10.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 3, lineHeight: 1.25, cursor: 'pointer', padding: '2px 5px', borderRadius: 6 },
  itemIncome: { color: '#047857', background: 'rgba(52,211,153,0.16)' },
  itemExpense: { color: '#b91c1c', background: 'rgba(248,113,113,0.14)' },
  itemLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '62%' },
  itemAmt: { fontWeight: 800, fontVariantNumeric: 'tabular-nums' },

  balChip: {
    marginTop: 'auto', textAlign: 'center', fontSize: 11, fontWeight: 800,
    padding: '3px 6px', borderRadius: 8, fontVariantNumeric: 'tabular-nums',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  },
  balChipPos: { color: '#0f766e', background: 'rgba(45,212,191,0.22)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,0.3)' },
  balChipNeg: { color: '#fff', background: 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(244,63,94,0.9))', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' },
  balChipIdle: { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' },

  // Settings drawer
  drawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 },
  drawer: { ...glass, borderRadius: 24, padding: 22, width: '100%', maxWidth: 440 },
  drawerHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  drawerTitle: { fontSize: 18, fontWeight: 800, color: '#1e293b' },
  drawerClose: { background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' },

  startBar: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  startField: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 140 },
  startLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  startInput: { padding: '11px 14px', fontSize: 16, border: '1px solid rgba(148,163,184,0.4)', borderRadius: 12, background: 'rgba(255,255,255,0.7)', color: '#1e293b', outline: 'none' },

  // Recurring
  recSection: { ...glass, marginTop: 20, borderRadius: 20 },
  recToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', fontSize: 15, fontWeight: 700, color: '#1e293b', background: 'none', border: 'none', cursor: 'pointer' },
  recCount: { fontSize: 12, fontWeight: 800, color: '#4f46e5', background: 'rgba(99,102,241,0.15)', borderRadius: 999, padding: '2px 10px' },
  recBody: { padding: '0 18px 18px' },
  recList: { display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 },
  recEmpty: { fontSize: 13, color: '#94a3b8', padding: '8px 0' },
  recRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.5)' },
  recAmt: { fontSize: 14, fontWeight: 800, minWidth: 92, fontVariantNumeric: 'tabular-nums' },
  recLbl: { fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 },
  recCad: { fontSize: 12, color: '#64748b' },
  recDel: { border: 'none', background: 'none', color: '#cbd5e1', fontSize: 15, cursor: 'pointer', padding: 4 },
  recForm: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  recInput: { flex: 1, minWidth: 140, padding: '10px 14px', fontSize: 14, border: '1px solid rgba(148,163,184,0.4)', borderRadius: 12, background: 'rgba(255,255,255,0.7)', outline: 'none' },
  recInputSm: { padding: '10px 12px', fontSize: 14, border: '1px solid rgba(148,163,184,0.4)', borderRadius: 12, background: 'rgba(255,255,255,0.7)', outline: 'none' },
  recAdd: { padding: '10px 20px', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' },
  recHint: { fontSize: 12, color: '#94a3b8', marginTop: 12, marginBottom: 0 },

  footer: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 28 },
}
