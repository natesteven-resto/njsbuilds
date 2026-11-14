const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

/** Format cents as $1,234.56. Negative values get a real minus sign. */
export function fmtMoney(cents: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const showCents = opts.cents ?? true
  const abs = Math.abs(cents) / 100
  const s = (showCents ? USD : USD0).format(abs)
  if (cents < 0) return '\u2212' + s
  if (opts.sign && cents > 0) return '+' + s
  return s
}

/** Compact: $12.4k, $1.2M. */
export function fmtMoneyShort(cents: number): string {
  const abs = Math.abs(cents) / 100
  let s: string
  const trim = (x: string) => x.replace(/\.0$/, '')
  if (abs >= 1_000_000) s = '$' + trim((abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)) + 'M'
  else if (abs >= 10_000) s = '$' + trim((abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)) + 'k'
  else s = USD0.format(abs)
  return cents < 0 ? '\u2212' + s : s
}

/** Parse "1,234.56", "$1234", "1234.5" → cents. Returns null for garbage. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!cleaned) return null
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** Cents → "1234.56" for editing in an input. */
export function centsToInput(cents: number): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2)
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}
