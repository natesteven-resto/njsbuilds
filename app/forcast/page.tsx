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
    // Anchor: startDate if given, else first matching weekday on/after start
    let anchor = r.startDate ? parseYmd(r.startDate) : new Date(start)
    if (!r.startDate && r.weekday != null) {
      while (anchor.getDay() !== r.weekday) anchor.setDate(anchor.getDate() + 1)
    }
    // Walk backward/forward to align anchor into range
    let d = new Date(anchor)
    // move forward to >= start
    while (d < start) d.setDate(d.getDate() + step)
    // if anchor was after start, also fill nothing before (we only forecast forward from start)
    while (d <= end) {
      hits.push(ymd(d))
      d.setDate(d.getDate() + step)
    }
  }
  return hits
}

// ---------- Page ----------
export default function ForcastPage() {
  const [doc, setDoc] = useState<ForcastDoc | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Which two months to show. Default: current + next.
  const now = new Date()
  const [anchorY, setAnchorY] = useState(now.getFullYear())
  const [anchorM, setAnchorM] = useState(now.getMonth())

  // Load
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

  // Debounced save
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

  // Build the two visible months
  const months = useMemo(() => {
    const m1 = { y: anchorY, m: anchorM }
    const m2Date = new Date(anchorY, anchorM + 1, 1)
    const m2 = { y: m2Date.getFullYear(), m: m2Date.getMonth() }
    return [m1, m2]
  }, [anchorY, anchorM])

  // Compute per-day items + running balance across the full visible window
  const computed = useMemo(() => {
    if (!doc) return null
    const startDate = parseYmd(doc.startingDate)

    // Window: from earliest of (startingDate, first visible day) to last visible day
    const firstVisible = new Date(months[0].y, months[0].m, 1)
    const lastVisible = new Date(months[1].y, months[1].m, daysInMonth(months[1].y, months[1].m))
    const windowStart = startDate < firstVisible ? startDate : firstVisible

    // Collect all items keyed by date. Recurring instances carry the rule id
    // and the date the rule originally generated, so a single occurrence can
    // be moved via an override without altering the rule.
    const byDate: Record<
      string,
      { label: string; amount: number; recurring: boolean; recId?: string; originalDate?: string }[]
    > = {}
    const add = (
      date: string,
      label: string,
      amount: number,
      rec: boolean,
      recId?: string,
      originalDate?: string
    ) => {
      ;(byDate[date] ||= []).push({ label, amount, recurring: rec, recId, originalDate })
    }
    for (const o of doc.oneOffs) add(o.date, o.label, o.amount, false)

    // Fast lookup: recId|originalDate -> newDate
    const ovMap: Record<string, string> = {}
    for (const ov of doc.overrides || []) ovMap[`${ov.recId}|${ov.originalDate}`] = ov.newDate

    for (const r of doc.recurring) {
      // Expand across a slightly padded window so an occurrence moved INTO view
      // from just outside still appears.
      const padStart = new Date(windowStart); padStart.setDate(padStart.getDate() - 40)
      const padEnd = new Date(lastVisible); padEnd.setDate(padEnd.getDate() + 40)
      for (const hit of recurringHits(r, padStart, padEnd)) {
        const shown = ovMap[`${r.id}|${hit}`] ?? hit
        add(shown, r.label, r.amount, true, r.id, hit)
      }
    }

    // Running balance day-by-day from startingDate forward
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
      <main style={S.loadingWrap}>
        <div style={S.loading}>Loading forecast…</div>
      </main>
    )
  }

  const todayKey = ymd(now)

  const goPrev = () => {
    const d = new Date(anchorY, anchorM - 1, 1)
    setAnchorY(d.getFullYear())
    setAnchorM(d.getMonth())
  }
  const goNext = () => {
    const d = new Date(anchorY, anchorM + 1, 1)
    setAnchorY(d.getFullYear())
    setAnchorM(d.getMonth())
  }
  const goToday = () => {
    setAnchorY(now.getFullYear())
    setAnchorM(now.getMonth())
  }

  return (
    <main style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <header style={S.header}>
          <div>
            <h1 style={S.h1}>Forecast</h1>
            <p style={S.sub}>Two months at a glance. Balance carried forward, day by day.</p>
          </div>
          <div style={S.saveInd}>{saving ? 'Saving…' : 'Saved'}</div>
        </header>

        {/* Starting balance bar */}
        <StartBar doc={doc} update={update} />

        {/* Nav */}
        <div style={S.nav}>
          <button style={S.navBtn} onClick={goPrev}>‹ Prev</button>
          <button style={S.navBtnGhost} onClick={goToday}>Today</button>
          <button style={S.navBtn} onClick={goNext}>Next ›</button>
        </div>

        {/* Two months */}
        <div style={S.monthsRow}>
          {months.map((mm, i) => (
            <MonthCalendar
              key={`${mm.y}-${mm.m}`}
              year={mm.y}
              month={mm.m}
              byDate={computed.byDate}
              balByDate={computed.balByDate}
              todayKey={todayKey}
              startKey={doc.startingDate}
              onAddOneOff={(date) => {
                const label = prompt('Label (e.g. Paycheck, Rent):')
                if (label == null) return
                const raw = prompt('Amount — positive = income, negative = expense:')
                if (raw == null) return
                const amount = Number(raw)
                if (!isFinite(amount)) return
                update((d) => ({
                  ...d,
                  oneOffs: [...d.oneOffs, { id: uid(), date, label: label.trim(), amount }],
                }))
              }}
              onRemoveOneOff={(id) =>
                update((d) => ({ ...d, oneOffs: d.oneOffs.filter((o) => o.id !== id) }))
              }
              onMoveOneOff={(id, newDate) =>
                update((d) => ({
                  ...d,
                  oneOffs: d.oneOffs.map((o) => (o.id === id ? { ...o, date: newDate } : o)),
                }))
              }
              onMoveRecurring={(recId, originalDate, newDate) =>
                update((d) => {
                  const others = (d.overrides || []).filter(
                    (ov) => !(ov.recId === recId && ov.originalDate === originalDate)
                  )
                  // If moved back to its original date, just drop the override.
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

        <footer style={S.footer}>
          Tap any day to add a one-off item. Recurring items repeat automatically.
        </footer>
      </div>
    </main>
  )
}

// ---------- Starting balance ----------
function StartBar({ doc, update }: { doc: ForcastDoc; update: (m: (d: ForcastDoc) => ForcastDoc) => void }) {
  const [bal, setBal] = useState(String(doc.startingBalance))
  const [date, setDate] = useState(doc.startingDate)
  useEffect(() => { setBal(String(doc.startingBalance)); setDate(doc.startingDate) }, [doc.startingBalance, doc.startingDate])
  return (
    <div style={S.startBar}>
      <div style={S.startField}>
        <label style={S.startLabel}>Starting balance</label>
        <input
          style={S.startInput}
          type="number"
          value={bal}
          onChange={(e) => setBal(e.target.value)}
          onBlur={() => update((d) => ({ ...d, startingBalance: Number(bal) || 0 }))}
        />
      </div>
      <div style={S.startField}>
        <label style={S.startLabel}>As of</label>
        <input
          style={S.startInput}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => update((d) => ({ ...d, startingDate: date }))}
        />
      </div>
    </div>
  )
}

// ---------- Month calendar ----------
function MonthCalendar({
  year, month, byDate, balByDate, todayKey, startKey, onAddOneOff, onRemoveOneOff, onMoveOneOff, onMoveRecurring, oneOffs,
}: {
  year: number; month: number
  byDate: Record<string, { label: string; amount: number; recurring: boolean; recId?: string; originalDate?: string }[]>
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
        <span style={S.monthTitle}>{MONTHS[month]} {year}</span>
        {endBal != null && (
          <span style={{ ...S.monthEnd, color: endBal < 0 ? '#dc2626' : '#059669' }}>
            End: {money(endBal)}
          </span>
        )}
      </div>
      <div style={S.dow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
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
          return (
            <div
              key={i}
              style={{
                ...S.day,
                ...(isToday ? S.dayToday : {}),
                ...(isStart ? S.dayStart : {}),
              }}
              onClick={() => onAddOneOff(key)}
            >
              <div style={S.dayNum}>{d}</div>
              {items.map((it, j) => {
                const oneOff = !it.recurring && oneOffs.find((o) => o.date === key && o.label === it.label && o.amount === it.amount)
                const moved = it.recurring && it.originalDate && it.originalDate !== key
                const handleTap = (e: React.MouseEvent) => {
                  e.stopPropagation()
                  // Menu: Move or Remove (recurring can only be moved, not removed here)
                  if (it.recurring && it.recId && it.originalDate) {
                    const to = prompt(
                      `Move "${it.label}" ${money(it.amount)} to which date? (YYYY-MM-DD)\n\nThis only moves this one occurrence — the recurring rule stays put.\nEnter its original date (${it.originalDate}) to move it back.`,
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
                      `"${it.label}" ${money(it.amount)}\n\nType a new date (YYYY-MM-DD) to MOVE it, or type "x" to REMOVE it.`,
                      key
                    )
                    if (choice == null) return
                    const c = choice.trim().toLowerCase()
                    if (c === 'x' || c === 'delete' || c === 'remove') {
                      onRemoveOneOff((oneOff as OneOff).id); return
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(choice.trim())) {
                      onMoveOneOff((oneOff as OneOff).id, choice.trim())
                    } else {
                      alert('Use format YYYY-MM-DD to move, or "x" to remove.')
                    }
                  }
                }
                return (
                  <div
                    key={j}
                    style={{ ...S.item, color: it.amount < 0 ? '#dc2626' : '#059669' }}
                    onClick={handleTap}
                    title={it.recurring ? (moved ? 'Recurring (moved this month) — tap to move' : 'Recurring — tap to move this occurrence') : 'Tap to move or remove'}
                  >
                    <span style={S.itemLabel}>{it.recurring ? (moved ? '→ ' : '↻ ') : ''}{it.label}</span>
                    <span>{it.amount < 0 ? '' : '+'}{money(it.amount)}</span>
                  </div>
                )
              })}
              {bal != null && (
                <div style={{ ...S.dayBal, color: bal < 0 ? '#dc2626' : '#334155' }}>
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
      id: uid(),
      label: label.trim(),
      amount: Number(amount),
      cadence,
      ...(cadence === 'monthly' ? { dayOfMonth: Number(dayOfMonth) } : {}),
      ...(cadence !== 'monthly' ? { weekday: Number(weekday), startDate } : {}),
    }
    update((d) => ({ ...d, recurring: [...d.recurring, r] }))
    setLabel(''); setAmount('')
  }

  return (
    <section style={S.recSection}>
      <button style={S.recToggle} onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} Recurring income & expenses ({doc.recurring.length})
      </button>
      {open && (
        <div style={S.recBody}>
          <div style={S.recList}>
            {doc.recurring.length === 0 && <div style={S.recEmpty}>None yet. Add one below.</div>}
            {doc.recurring.map((r) => (
              <div key={r.id} style={S.recRow}>
                <span style={{ ...S.recAmt, color: r.amount < 0 ? '#dc2626' : '#059669' }}>
                  {r.amount < 0 ? '' : '+'}{money(r.amount)}
                </span>
                <span style={S.recLbl}>{r.label}</span>
                <span style={S.recCad}>
                  {r.cadence === 'monthly'
                    ? `day ${r.dayOfMonth}`
                    : `${r.cadence} · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][r.weekday ?? 0]}`}
                </span>
                <button
                  style={S.recDel}
                  onClick={() => update((d) => ({ ...d, recurring: d.recurring.filter((x) => x.id !== r.id) }))}
                >
                  ✕
                </button>
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
          <p style={S.recHint}>Tip: use a negative amount for expenses (e.g. -850 for rent), positive for income.</p>
        </div>
      )}
    </section>
  )
}

// ---------- Styles ----------
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f1f5f9', padding: '16px 12px 60px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  container: { maxWidth: 1200, margin: '0 auto' },
  loadingWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
  loading: { color: '#64748b', fontSize: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  h1: { margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  saveInd: { fontSize: 12, color: '#94a3b8', padding: '4px 10px', background: '#fff', borderRadius: 999, border: '1px solid #e2e8f0' },
  startBar: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  startField: { display: 'flex', flexDirection: 'column', gap: 4 },
  startLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  startInput: { padding: '8px 12px', fontSize: 16, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', minWidth: 140 },
  nav: { display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' },
  navBtn: { padding: '8px 16px', fontSize: 14, fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', cursor: 'pointer' },
  navBtnGhost: { padding: '8px 16px', fontSize: 14, fontWeight: 700, border: '1px solid #0f172a', borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer' },
  monthsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  month: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  monthHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f1f5f9' },
  monthTitle: { fontSize: 16, fontWeight: 800, color: '#0f172a' },
  monthEnd: { fontSize: 13, fontWeight: 700 },
  dow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc' },
  dowCell: { textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', padding: '6px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  emptyCell: { minHeight: 64, background: '#fafbfc', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' },
  day: { minHeight: 64, padding: 4, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' },
  dayToday: { background: '#eff6ff', outline: '2px solid #3b82f6', outlineOffset: -2 },
  dayStart: { background: '#f0fdf4' },
  dayNum: { fontSize: 11, fontWeight: 700, color: '#94a3b8' },
  item: { fontSize: 10, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 2, lineHeight: 1.2, cursor: 'pointer' },
  itemLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' },
  dayBal: { fontSize: 10, fontWeight: 800, marginTop: 'auto', paddingTop: 2, borderTop: '1px dashed #e2e8f0', textAlign: 'right' },
  recSection: { marginTop: 20, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' },
  recToggle: { width: '100%', textAlign: 'left', padding: '14px 16px', fontSize: 15, fontWeight: 700, color: '#0f172a', background: 'none', border: 'none', cursor: 'pointer' },
  recBody: { padding: '0 16px 16px' },
  recList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  recEmpty: { fontSize: 13, color: '#94a3b8', padding: '8px 0' },
  recRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 8 },
  recAmt: { fontSize: 14, fontWeight: 800, minWidth: 90 },
  recLbl: { fontSize: 14, fontWeight: 600, color: '#0f172a', flex: 1 },
  recCad: { fontSize: 12, color: '#64748b' },
  recDel: { border: 'none', background: 'none', color: '#cbd5e1', fontSize: 16, cursor: 'pointer', padding: 4 },
  recForm: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  recInput: { flex: 1, minWidth: 140, padding: '8px 12px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8 },
  recInputSm: { padding: '8px 10px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' },
  recAdd: { padding: '8px 18px', fontSize: 14, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  recHint: { fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 0 },
  footer: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 },
}
