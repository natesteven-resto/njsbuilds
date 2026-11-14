'use client'

import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { EmptyState } from '../_components/EmptyState'
import { RangePicker, useRange } from '../_components/RangePicker'
import { downloadText, toCSV } from '../_lib/csv'
import { lastNMonths, monthLabel, rangeLabel, today } from '../_lib/dates'
import { fmtMoney } from '../_lib/money'
import { buildPL, buildScheduleE, monthlySeries } from '../_lib/reports'
import { useDB, useHydrated } from '../_lib/store'

type Tab = 'pl' | 'schedule_e' | 'monthly'

function Cell({ cents, strong, tone }: { cents: number; strong?: boolean; tone?: 'income' | 'expense' | 'noi' }) {
  const color = cents === 0 ? 'var(--db-faint)' : tone === 'income' ? 'var(--db-income)' : tone === 'expense' ? 'var(--db-expense)' : tone === 'noi' ? (cents >= 0 ? 'var(--db-brand2)' : 'var(--db-expense)') : undefined
  return (
    <td className="num" style={{ fontWeight: strong ? 800 : 500, color }}>
      {cents === 0 ? '\u2014' : fmtMoney(cents, { cents: false })}
    </td>
  )
}

export default function ReportsPage() {
  const db = useDB()
  const hydrated = useHydrated()
  const range = useRange('ytd')
  const [tab, setTab] = useState<Tab>('pl')
  const thisYear = parseInt(today().slice(0, 4), 10)
  const [year, setYear] = useState(thisYear)
  const [selected, setSelected] = useState<string[]>([])

  const properties = useMemo(() => db.properties.filter((p) => !p.archived), [db.properties])
  const pl = useMemo(() => buildPL(db, range.range, selected.length ? selected : undefined), [db, range.range, selected])
  const se = useMemo(() => buildScheduleE(db, year), [db, year])
  const months = useMemo(() => lastNMonths(12), [])
  const monthly = useMemo(() => monthlySeries(db.transactions, months), [db.transactions, months])
  const years = useMemo(() => {
    const ys = new Set<number>([thisYear])
    for (const t of db.transactions) ys.add(parseInt(t.date.slice(0, 4), 10))
    return [...ys].sort((a, b) => b - a)
  }, [db.transactions, thisYear])

  const dollars = (c: number) => (c / 100).toFixed(2)

  const exportPL = () => {
    const rows: (string | number)[][] = [['P&L by property', rangeLabel(range.range)], ['Category', ...pl.columns.map((p) => p.name), 'Total']]
    rows.push(['INCOME'])
    for (const r of pl.incomeRows) rows.push([r.category.name, ...r.cells.map(dollars), dollars(r.total)])
    rows.push(['Total income', ...pl.incomeTotals.map(dollars), dollars(pl.grand.income)])
    rows.push(['EXPENSES'])
    for (const r of pl.expenseRows) rows.push([r.category.name + (r.category.line ? ' (Sch E ' + r.category.line + ')' : ''), ...r.cells.map(dollars), dollars(r.total)])
    rows.push(['Total expenses', ...pl.expenseTotals.map(dollars), dollars(pl.grand.expense)])
    rows.push(['Net operating income', ...pl.noi.map(dollars), dollars(pl.grand.noi)])
    if (pl.belowRows.length) {
      rows.push(['NOT ON P&L'])
      for (const r of pl.belowRows) rows.push([r.category.name, ...r.cells.map((c) => dollars(r.category.kind === 'income' ? c : -c)), dollars(r.category.kind === 'income' ? r.total : -r.total)])
      rows.push(['Cash flow', ...pl.cashflow.map(dollars), dollars(pl.grand.cashflow)])
    }
    downloadText('doorbooks-pl-by-property.csv', toCSV(rows), 'text/csv')
  }

  const exportSE = () => {
    const rows: (string | number)[][] = [['Schedule E ' + year], ['Line', 'Description', ...se.columns.map((p) => p.name), 'Total']]
    for (const l of se.lines) rows.push([l.line, l.label, ...l.cells.map(dollars), dollars(l.total)])
    rows.push([20, 'Total expenses', ...se.totalExpenses.map(dollars), dollars(se.grand.expenses)])
    rows.push([21, 'Income or (loss)', ...se.net.map(dollars), dollars(se.grand.net)])
    downloadText('doorbooks-schedule-e-' + year + '.csv', toCSV(rows), 'text/csv')
  }

  if (!hydrated) return <div className="db-skel" style={{ height: 300 }} />
  if (properties.length === 0) return <EmptyState />

  const mTotals = monthly.reduce((a, m) => ({ income: a.income + m.income, expense: a.expense + m.expense, noi: a.noi + m.noi }), { income: 0, expense: 0, noi: 0 })

  return (
    <div className="db-page" style={{ gap: 14 }}>
      <div className="db-head">
        <div>
          <h1 className="db-h1 db-display">Reports</h1>
          <div className="db-sub">One column per property. No classes, no filters to remember.</div>
        </div>
        <div className="db-seg db-seg-scroll db-noprint" role="group" aria-label="Report">
          <button type="button" aria-pressed={tab === 'pl'} onClick={() => setTab('pl')}>P&amp;L by property</button>
          <button type="button" aria-pressed={tab === 'schedule_e'} onClick={() => setTab('schedule_e')}>Schedule E</button>
          <button type="button" aria-pressed={tab === 'monthly'} onClick={() => setTab('monthly')}>Monthly</button>
        </div>
      </div>

      {tab === 'pl' && (
        <>
          <div className="db-card db-card-pad db-noprint" style={{ display: 'grid', gap: 10 }}>
            <RangePicker state={range} />
            <div className="db-chips">
              <button type="button" className="db-chip db-chip-sm" aria-pressed={selected.length === 0} onClick={() => setSelected([])}>All properties</button>
              {properties.map((p) => (
                <button key={p.id} type="button" className="db-chip db-chip-sm" aria-pressed={selected.includes(p.id)} onClick={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}><span className="db-dot" style={{ background: p.color }} />{p.name}</button>
              ))}
            </div>
          </div>
          <div className="db-card">
            <div className="db-card-head" style={{ padding: '14px 16px 0' }}>
              <div><h2 className="db-h2">Profit &amp; loss by property</h2><div className="db-sub">{rangeLabel(range.range)}</div></div>
              <div style={{ display: 'flex', gap: 6 }} className="db-noprint">
                <button type="button" className="db-btn db-btn-sm" onClick={exportPL}><Download /> CSV</button>
                <button type="button" className="db-btn db-btn-sm" onClick={() => window.print()}><Printer /> Print</button>
              </div>
            </div>
            <div className="db-table-wrap" style={{ marginTop: 10 }}>
              <table className="db-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Category</th>
                    {pl.columns.map((p) => <th key={p.id} className="num"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="db-dot" style={{ background: p.color }} />{p.name}</span></th>)}
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="db-section"><td className="sticky-col" colSpan={pl.columns.length + 2}>Income</td></tr>
                  {pl.incomeRows.map((r) => (
                    <tr key={r.category.id}><td className="sticky-col">{r.category.name}</td>{r.cells.map((c, i) => <Cell key={i} cents={c} />)}<Cell cents={r.total} strong /></tr>
                  ))}
                  <tr className="db-total"><td className="sticky-col">Total income</td>{pl.incomeTotals.map((c, i) => <Cell key={i} cents={c} strong tone="income" />)}<Cell cents={pl.grand.income} strong tone="income" /></tr>
                  <tr className="db-section"><td className="sticky-col" colSpan={pl.columns.length + 2}>Expenses</td></tr>
                  {pl.expenseRows.map((r) => (
                    <tr key={r.category.id}><td className="sticky-col">{r.category.name}{r.category.line ? <span className="db-faint" style={{ fontSize: 11, marginLeft: 6 }}>E{r.category.line}</span> : null}</td>{r.cells.map((c, i) => <Cell key={i} cents={c} />)}<Cell cents={r.total} strong /></tr>
                  ))}
                  <tr className="db-total"><td className="sticky-col">Total expenses</td>{pl.expenseTotals.map((c, i) => <Cell key={i} cents={c} strong tone="expense" />)}<Cell cents={pl.grand.expense} strong tone="expense" /></tr>
                  <tr className="db-total" style={{ fontSize: 15 }}><td className="sticky-col">Net operating income</td>{pl.noi.map((c, i) => <Cell key={i} cents={c} strong tone="noi" />)}<Cell cents={pl.grand.noi} strong tone="noi" /></tr>
                  {pl.belowRows.length > 0 && (
                    <>
                      <tr className="db-section"><td className="sticky-col" colSpan={pl.columns.length + 2}>Not on the P&amp;L (cash only)</td></tr>
                      {pl.belowRows.map((r) => {
                        const sign = r.category.kind === 'income' ? 1 : -1
                        return <tr key={r.category.id}><td className="sticky-col db-muted">{r.category.name}</td>{r.cells.map((c, i) => <Cell key={i} cents={sign * c} />)}<Cell cents={sign * r.total} strong /></tr>
                      })}
                      <tr className="db-total"><td className="sticky-col">Cash flow</td>{pl.cashflow.map((c, i) => <Cell key={i} cents={c} strong tone="noi" />)}<Cell cents={pl.grand.cashflow} strong tone="noi" /></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {pl.incomeRows.length + pl.expenseRows.length === 0 && <div className="db-faint" style={{ padding: 20, textAlign: 'center' }}>Nothing in this range yet.</div>}
          </div>
        </>
      )}

      {tab === 'schedule_e' && (
        <div className="db-card">
          <div className="db-card-head" style={{ padding: '14px 16px 0', flexWrap: 'wrap' }}>
            <div>
              <h2 className="db-h2">Schedule E (Form 1040), Part I</h2>
              <div className="db-sub">Each property is a column, exactly like the form. Hand this to your CPA.</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="db-noprint">
              <select className="db-select" style={{ width: 'auto', height: 34 }} value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} aria-label="Tax year">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" className="db-btn db-btn-sm" onClick={exportSE}><Download /> CSV</button>
              <button type="button" className="db-btn db-btn-sm" onClick={() => window.print()}><Printer /> Print</button>
            </div>
          </div>
          <div className="db-table-wrap" style={{ marginTop: 10 }}>
            <table className="db-table">
              <thead>
                <tr>
                  <th className="sticky-col" style={{ width: 40 }}>Line</th>
                  <th>Description</th>
                  {se.columns.map((p) => <th key={p.id} className="num">{p.name}</th>)}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {se.lines.map((l) => (
                  <tr key={l.line} style={l.line === 3 ? { fontWeight: 700 } : undefined}>
                    <td className="sticky-col db-num db-muted">{l.line}</td>
                    <td className="wrap">{l.label}</td>
                    {l.cells.map((c, i) => <Cell key={i} cents={c} tone={l.line === 3 ? 'income' : undefined} />)}
                    <Cell cents={l.total} strong tone={l.line === 3 ? 'income' : undefined} />
                  </tr>
                ))}
                <tr className="db-total"><td className="sticky-col db-num db-muted">20</td><td>Total expenses (add lines 5 through 19)</td>{se.totalExpenses.map((c, i) => <Cell key={i} cents={c} strong tone="expense" />)}<Cell cents={se.grand.expenses} strong tone="expense" /></tr>
                <tr className="db-total" style={{ fontSize: 15 }}><td className="sticky-col db-num db-muted">21</td><td>Income or (loss) (line 3 minus line 20)</td>{se.net.map((c, i) => <Cell key={i} cents={c} strong tone="noi" />)}<Cell cents={se.grand.net} strong tone="noi" /></tr>
              </tbody>
            </table>
          </div>
          <div className="db-help" style={{ padding: '10px 16px 14px' }}>Depreciation (line 18) is only included if you entered it. Capital improvements, mortgage principal and deposits are intentionally excluded &mdash; they are not Schedule E expenses.</div>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="db-card">
          <div className="db-card-head" style={{ padding: '14px 16px 0' }}>
            <div><h2 className="db-h2">Monthly trend</h2><div className="db-sub">Whole portfolio, last 12 months</div></div>
          </div>
          <div className="db-table-wrap" style={{ marginTop: 10 }}>
            <table className="db-table">
              <thead><tr><th className="sticky-col">Month</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">NOI</th><th className="num">Margin</th></tr></thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <td className="sticky-col">{monthLabel(m.month)}</td>
                    <Cell cents={m.income} tone="income" />
                    <Cell cents={m.expense} tone="expense" />
                    <Cell cents={m.noi} strong tone="noi" />
                    <td className="num db-muted">{m.income ? Math.round((m.noi / m.income) * 100) + '%' : '\u2014'}</td>
                  </tr>
                ))}
                <tr className="db-total">
                  <td className="sticky-col">Total</td>
                  <Cell cents={mTotals.income} strong tone="income" />
                  <Cell cents={mTotals.expense} strong tone="expense" />
                  <Cell cents={mTotals.noi} strong tone="noi" />
                  <td className="num" style={{ fontWeight: 800 }}>{mTotals.income ? Math.round((mTotals.noi / mTotals.income) * 100) + '%' : '\u2014'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
