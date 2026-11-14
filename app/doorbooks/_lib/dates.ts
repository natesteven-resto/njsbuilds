// All dates are YYYY-MM-DD strings in local time. No Date-at-midnight-UTC surprises.

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

export function toISODate(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

export function today(): string {
  return toISODate(new Date())
}

export function parseISO(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10))
  return { y, m, d }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(s: string, opts: { year?: boolean } = {}): string {
  if (!s) return ''
  const { y, m, d } = parseISO(s)
  if (!y || !m || !d) return s
  const showYear = opts.year ?? y !== new Date().getFullYear()
  return MONTHS[m - 1] + ' ' + d + (showYear ? ', ' + y : '')
}

/** 'YYYY-MM' */
export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function monthLabel(key: string, opts: { year?: boolean } = {}): string {
  const [y, m] = key.split('-').map((x) => parseInt(x, 10))
  const showYear = opts.year ?? true
  return MONTHS[m - 1] + (showYear ? ' ' + y : '')
}

export function monthLabelShort(key: string): string {
  const m = parseInt(key.slice(5, 7), 10)
  return MONTHS[m - 1]
}

/** Last n month keys ending with the current month, oldest first. */
export function lastNMonths(n: number, from: Date = new Date()): string[] {
  const out: string[] = []
  let y = from.getFullYear()
  let m = from.getMonth() + 1
  for (let i = 0; i < n; i++) {
    out.unshift(y + '-' + pad2(m))
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return out
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export interface DateRange {
  start: string
  end: string
}

export type RangePreset = 'month' | 'last_month' | 'quarter' | 'ytd' | 'last_year' | 'last12' | 'all' | 'custom'

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'last_year', label: 'Last year' },
  { id: 'last12', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
]

export function rangeFor(preset: RangePreset, now: Date = new Date()): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  switch (preset) {
    case 'month':
      return { start: y + '-' + pad2(m) + '-01', end: y + '-' + pad2(m) + '-' + pad2(daysInMonth(y, m)) }
    case 'last_month': {
      const ly = m === 1 ? y - 1 : y
      const lm = m === 1 ? 12 : m - 1
      return { start: ly + '-' + pad2(lm) + '-01', end: ly + '-' + pad2(lm) + '-' + pad2(daysInMonth(ly, lm)) }
    }
    case 'quarter': {
      const qStart = Math.floor((m - 1) / 3) * 3 + 1
      const qEnd = qStart + 2
      return { start: y + '-' + pad2(qStart) + '-01', end: y + '-' + pad2(qEnd) + '-' + pad2(daysInMonth(y, qEnd)) }
    }
    case 'ytd':
      return { start: y + '-01-01', end: toISODate(now) }
    case 'last_year':
      return { start: (y - 1) + '-01-01', end: (y - 1) + '-12-31' }
    case 'last12': {
      const months = lastNMonths(12, now)
      const first = months[0]
      return { start: first + '-01', end: y + '-' + pad2(m) + '-' + pad2(daysInMonth(y, m)) }
    }
    case 'all':
    default:
      return { start: '1900-01-01', end: '2999-12-31' }
  }
}

export function inRange(date: string, r: DateRange): boolean {
  return date >= r.start && date <= r.end
}

export function rangeLabel(r: DateRange): string {
  if (r.start <= '1900-01-01') return 'All time'
  return fmtDate(r.start, { year: true }) + ' \u2013 ' + fmtDate(r.end, { year: true })
}

export function yearOf(date: string): number {
  return parseInt(date.slice(0, 4), 10)
}
