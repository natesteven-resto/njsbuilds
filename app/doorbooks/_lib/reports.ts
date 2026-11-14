import { CATEGORIES, SCHEDULE_E_LINES, categoryById, type Category } from './categories'
import { inRange, monthKey, type DateRange } from './dates'
import type { DB, Property, Transaction } from './types'

/** Signed cents: income positive, expense negative. */
export function signed(t: Transaction): number {
  return t.kind === 'income' ? t.amount : -t.amount
}

export interface Totals {
  income: number
  expense: number
  /** Net operating income = P&L income − P&L expenses. */
  noi: number
  /** Everything, including principal, capex, deposits. */
  cashflow: number
}

export function totals(txs: Transaction[]): Totals {
  let income = 0, expense = 0, cashIn = 0, cashOut = 0
  for (const t of txs) {
    const c = categoryById(t.categoryId)
    if (t.kind === 'income') {
      cashIn += t.amount
      if (c.pl) income += t.amount
    } else {
      cashOut += t.amount
      if (c.pl) expense += t.amount
    }
  }
  return { income, expense, noi: income - expense, cashflow: cashIn - cashOut }
}

export function filterTx(txs: Transaction[], f: { range?: DateRange; propertyId?: string; unitId?: string; kind?: 'income' | 'expense'; categoryId?: string; q?: string }): Transaction[] {
  const q = f.q?.trim().toLowerCase()
  return txs.filter((t) => {
    if (f.range && !inRange(t.date, f.range)) return false
    if (f.propertyId && t.propertyId !== f.propertyId) return false
    if (f.unitId && t.unitId !== f.unitId) return false
    if (f.kind && t.kind !== f.kind) return false
    if (f.categoryId && t.categoryId !== f.categoryId) return false
    if (q) {
      const c = categoryById(t.categoryId)
      const hay = (t.payee + ' ' + t.memo + ' ' + c.name + ' ' + t.account).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function sortByDateDesc(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
}

// ── P&L by property ─────────────────────────────────────────────

export interface PLRow {
  category: Category
  cells: number[]
  total: number
}

export interface PLReport {
  columns: Property[]
  incomeRows: PLRow[]
  expenseRows: PLRow[]
  /** Cash-only rows (not in NOI) shown below the line. */
  belowRows: PLRow[]
  incomeTotals: number[]
  expenseTotals: number[]
  noi: number[]
  cashflow: number[]
  grand: { income: number; expense: number; noi: number; cashflow: number }
}

export function buildPL(db: DB, range: DateRange, propertyIds?: string[]): PLReport {
  const columns = db.properties.filter((p) => !p.archived && (!propertyIds || propertyIds.includes(p.id)))
  const colIndex = new Map(columns.map((p, i) => [p.id, i]))
  const n = columns.length
  const byCat = new Map<string, number[]>()
  for (const t of db.transactions) {
    if (!inRange(t.date, range)) continue
    const ci = colIndex.get(t.propertyId)
    if (ci === undefined) continue
    let arr = byCat.get(t.categoryId)
    if (!arr) { arr = new Array(n).fill(0); byCat.set(t.categoryId, arr) }
    arr[ci] += t.amount
  }
  const mk = (c: Category): PLRow | null => {
    const cells = byCat.get(c.id)
    if (!cells || cells.every((v) => v === 0)) return null
    return { category: c, cells, total: cells.reduce((a, b) => a + b, 0) }
  }
  const incomeRows: PLRow[] = []
  const expenseRows: PLRow[] = []
  const belowRows: PLRow[] = []
  for (const c of CATEGORIES) {
    const row = mk(c)
    if (!row) continue
    if (!c.pl) belowRows.push(row)
    else if (c.kind === 'income') incomeRows.push(row)
    else expenseRows.push(row)
  }
  const sumRows = (rows: PLRow[]) => {
    const out = new Array(n).fill(0)
    for (const r of rows) r.cells.forEach((v, i) => { out[i] += v })
    return out
  }
  const incomeTotals = sumRows(incomeRows)
  const expenseTotals = sumRows(expenseRows)
  const noi = incomeTotals.map((v, i) => v - expenseTotals[i])
  const cashflow = noi.slice()
  for (const r of belowRows) {
    const sign = r.category.kind === 'income' ? 1 : -1
    r.cells.forEach((v, i) => { cashflow[i] += sign * v })
  }
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  return {
    columns, incomeRows, expenseRows, belowRows, incomeTotals, expenseTotals, noi, cashflow,
    grand: { income: sum(incomeTotals), expense: sum(expenseTotals), noi: sum(noi), cashflow: sum(cashflow) },
  }
}

// ── Schedule E ──────────────────────────────────────────────────

export interface ScheduleELine {
  line: number
  label: string
  cells: number[]
  total: number
}

export interface ScheduleEReport {
  year: number
  columns: Property[]
  lines: ScheduleELine[]
  totalExpenses: number[]
  net: number[]
  grand: { income: number; expenses: number; net: number }
}

export function buildScheduleE(db: DB, year: number): ScheduleEReport {
  const range: DateRange = { start: year + '-01-01', end: year + '-12-31' }
  const columns = db.properties.filter((p) => !p.archived)
  const colIndex = new Map(columns.map((p, i) => [p.id, i]))
  const n = columns.length
  const byLine = new Map<number, number[]>()
  for (const l of SCHEDULE_E_LINES) byLine.set(l.line, new Array(n).fill(0))
  for (const t of db.transactions) {
    if (!inRange(t.date, range)) continue
    const ci = colIndex.get(t.propertyId)
    if (ci === undefined) continue
    const c = categoryById(t.categoryId)
    if (!c.line || !c.pl) continue
    byLine.get(c.line)![ci] += t.amount
  }
  const lines = SCHEDULE_E_LINES.map((l) => {
    const cells = byLine.get(l.line)!
    return { line: l.line, label: l.label, cells, total: cells.reduce((a, b) => a + b, 0) }
  })
  const totalExpenses = new Array(n).fill(0)
  for (const l of lines) if (l.line >= 5) l.cells.forEach((v, i) => { totalExpenses[i] += v })
  const income = byLine.get(3)!
  const net = income.map((v, i) => v - totalExpenses[i])
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  return { year, columns, lines, totalExpenses, net, grand: { income: sum(income), expenses: sum(totalExpenses), net: sum(net) } }
}

// ── Monthly series ──────────────────────────────────────────────

export interface MonthPoint {
  month: string
  income: number
  expense: number
  noi: number
}

export function monthlySeries(txs: Transaction[], months: string[], propertyId?: string): MonthPoint[] {
  const idx = new Map(months.map((m, i) => [m, i]))
  const out: MonthPoint[] = months.map((m) => ({ month: m, income: 0, expense: 0, noi: 0 }))
  for (const t of txs) {
    if (propertyId && t.propertyId !== propertyId) continue
    const i = idx.get(monthKey(t.date))
    if (i === undefined) continue
    const c = categoryById(t.categoryId)
    if (!c.pl) continue
    if (t.kind === 'income') out[i].income += t.amount
    else out[i].expense += t.amount
  }
  for (const p of out) p.noi = p.income - p.expense
  return out
}

// ── Rent collection ─────────────────────────────────────────────

export interface RentStatus {
  expected: number
  collected: number
  unitsExpected: number
  unitsPaid: number
  /** Per property breakdown. */
  byProperty: { property: Property; expected: number; collected: number }[]
}

export function rentStatus(db: DB, month: string): RentStatus {
  const byProperty: RentStatus['byProperty'] = []
  let expected = 0, collected = 0, unitsExpected = 0, unitsPaid = 0
  for (const p of db.properties) {
    if (p.archived) continue
    const occupied = p.units.filter((u) => u.tenant.trim() && u.rent > 0)
    const exp = occupied.reduce((a, u) => a + u.rent, 0)
    const paidByUnit = new Map<string, number>()
    let col = 0
    for (const t of db.transactions) {
      if (t.propertyId !== p.id || t.kind !== 'income' || t.categoryId !== 'rent') continue
      if (monthKey(t.date) !== month) continue
      col += t.amount
      if (t.unitId) paidByUnit.set(t.unitId, (paidByUnit.get(t.unitId) ?? 0) + t.amount)
    }
    unitsExpected += occupied.length
    if (occupied.length === 1) {
      if (col >= occupied[0].rent) unitsPaid += 1
    } else {
      for (const u of occupied) if ((paidByUnit.get(u.id) ?? 0) >= u.rent) unitsPaid += 1
    }
    expected += exp
    collected += col
    if (exp > 0 || col > 0) byProperty.push({ property: p, expected: exp, collected: col })
  }
  return { expected, collected, unitsExpected, unitsPaid, byProperty }
}

/** Top expense categories for a set of transactions. */
export function expenseBreakdown(txs: Transaction[]): { category: Category; amount: number; share: number }[] {
  const map = new Map<string, number>()
  let total = 0
  for (const t of txs) {
    if (t.kind !== 'expense') continue
    const c = categoryById(t.categoryId)
    if (!c.pl) continue
    map.set(c.id, (map.get(c.id) ?? 0) + t.amount)
    total += t.amount
  }
  return [...map.entries()]
    .map(([id, amount]) => ({ category: categoryById(id), amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export function occupancy(p: Property): { occupied: number; total: number } {
  return { occupied: p.units.filter((u) => u.tenant.trim()).length, total: p.units.length }
}

export function monthlyRentRoll(p: Property): number {
  return p.units.filter((u) => u.tenant.trim()).reduce((a, u) => a + u.rent, 0)
}
