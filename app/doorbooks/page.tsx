'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Legend, MonthlyBars, Sparkline } from './_components/Charts'
import { EmptyState } from './_components/EmptyState'
import { Money } from './_components/Money'
import { RangePicker, useRange } from './_components/RangePicker'
import { TxList } from './_components/TxList'
import { useUI } from './_components/ui'
import { lastNMonths, monthLabel, rangeLabel, today } from './_lib/dates'
import { fmtMoney, pct } from './_lib/money'
import { expenseBreakdown, filterTx, monthlySeries, occupancy, rentStatus, totals } from './_lib/reports'
import { useDB, useHydrated } from './_lib/store'

export default function DashboardPage() {
  const db = useDB()
  const hydrated = useHydrated()
  const range = useRange('ytd')
  const { openTx } = useUI()

  const properties = useMemo(() => db.properties.filter((p) => !p.archived), [db.properties])
  const inRangeTx = useMemo(() => filterTx(db.transactions, { range: range.range }), [db.transactions, range.range])
  const t = useMemo(() => totals(inRangeTx), [inRangeTx])
  const months12 = useMemo(() => lastNMonths(12), [])
  const series = useMemo(() => monthlySeries(db.transactions, months12), [db.transactions, months12])
  const thisMonth = today().slice(0, 7)
  const rent = useMemo(() => rentStatus(db, thisMonth), [db, thisMonth])
  const breakdown = useMemo(() => expenseBreakdown(inRangeTx).slice(0, 6), [inRangeTx])
  const margin = t.income ? Math.round((t.noi / t.income) * 100) : 0

  if (!hydrated) {
    return <div style={{ display: 'grid', gap: 12 }}><div className="db-skel" style={{ height: 36, width: 220 }} /><div className="db-skel" style={{ height: 110 }} /><div className="db-skel" style={{ height: 260 }} /></div>
  }
  if (properties.length === 0) return <EmptyState />

  return (
    <div className="db-page">
      <div className="db-head">
        <div>
          <h1 className="db-h1 db-display">{db.settings.businessName}</h1>
          <div className="db-sub">{properties.length} {properties.length === 1 ? 'property' : 'properties'} &middot; {properties.reduce((a, p) => a + p.units.length, 0)} doors &middot; {rangeLabel(range.range)}</div>
        </div>
        <RangePicker state={range} compact />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div className="db-card db-kpi"><span className="db-kpi-label">Income</span><span className="db-kpi-value db-num db-income">{fmtMoney(t.income, { cents: false })}</span><span className="db-kpi-foot">{inRangeTx.filter((x) => x.kind === 'income').length} deposits</span></div>
        <div className="db-card db-kpi"><span className="db-kpi-label">Expenses</span><span className="db-kpi-value db-num db-expense">{fmtMoney(t.expense, { cents: false })}</span><span className="db-kpi-foot">{breakdown[0] ? 'Biggest: ' + breakdown[0].category.name : 'Deductible only'}</span></div>
        <div className="db-card db-kpi" style={{ borderColor: 'rgba(240,180,41,0.35)' }}><span className="db-kpi-label">Net operating income</span><span className="db-kpi-value db-num db-brandc">{fmtMoney(t.noi, { cents: false })}</span><span className="db-kpi-foot">{margin}% margin</span></div>
        <div className="db-card db-kpi"><span className="db-kpi-label">Cash flow</span><span className="db-kpi-value db-num">{fmtMoney(t.cashflow, { cents: false })}</span><span className="db-kpi-foot">After principal &amp; capex</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="db-card db-card-pad" style={{ gridColumn: 'span 1', minWidth: 0 }}>
          <div className="db-card-head"><h2 className="db-h2">Last 12 months</h2><Legend /></div>
          <MonthlyBars data={series} />
        </div>
        <div className="db-card db-card-pad" style={{ minWidth: 0 }}>
          <div className="db-card-head">
            <h2 className="db-h2">Rent &middot; {monthLabel(thisMonth, { year: false })}</h2>
            <span className="db-pill db-pill-brand">{rent.unitsPaid}/{rent.unitsExpected} units paid</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span className="db-kpi-value db-num" style={{ fontSize: 28 }}>{fmtMoney(rent.collected, { cents: false })}</span>
            <span className="db-sub db-num">of {fmtMoney(rent.expected, { cents: false })} expected</span>
          </div>
          <div className="db-progress" aria-label="Rent collected"><div style={{ width: Math.min(100, pct(rent.collected, rent.expected)) + '%' }} /></div>
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            {rent.byProperty.map((r) => (
              <div key={r.property.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><i className="db-dot" style={{ background: r.property.color }} />{r.property.name}</span>
                <span className="db-num" style={{ whiteSpace: 'nowrap' }}>
                  <span className={r.collected >= r.expected && r.expected > 0 ? 'db-income' : r.collected > 0 ? 'db-brandc' : 'db-expense'}>{fmtMoney(r.collected, { cents: false })}</span>
                  <span className="db-faint"> / {fmtMoney(r.expected, { cents: false })}</span>
                </span>
              </div>
            ))}
            {rent.expected === 0 && <div className="db-help">Set rent + tenant on each unit to track collections.</div>}
          </div>
          {rent.unitsPaid < rent.unitsExpected && (
            <button type="button" className="db-btn db-btn-sm" style={{ marginTop: 12 }} onClick={() => openTx({ prefill: { kind: 'income', categoryId: 'rent' } })}><Plus /> Record a rent payment</button>
          )}
        </div>
      </div>

      <div>
        <div className="db-card-head" style={{ marginBottom: 10 }}>
          <h2 className="db-h2">Properties</h2>
          <Link href="/doorbooks/properties" className="db-btn db-btn-ghost db-btn-sm">All properties <ChevronRight /></Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {properties.map((p) => {
            const pt = totals(inRangeTx.filter((x) => x.propertyId === p.id))
            const spark = monthlySeries(db.transactions, months12, p.id).map((m) => m.noi)
            const occ = occupancy(p)
            return (
              <Link key={p.id} href={'/doorbooks/properties/' + p.id} className="db-card db-prop">
                <span className="db-prop-stripe" style={{ background: p.color }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="db-prop-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div className="db-prop-addr">{p.address}{p.city ? ', ' + p.city : ''} &middot; {occ.occupied}/{occ.total} occupied</div>
                  </div>
                  <Sparkline values={spark} color={p.color} width={90} height={30} />
                </div>
                <div className="db-prop-stats">
                  <div className="db-prop-stat"><b className="db-num db-income">{fmtMoney(pt.income, { cents: false })}</b><span>Income</span></div>
                  <div className="db-prop-stat"><b className="db-num db-expense">{fmtMoney(pt.expense, { cents: false })}</b><span>Expenses</span></div>
                  <div className="db-prop-stat"><b className="db-num" style={{ color: pt.noi >= 0 ? 'var(--db-brand2)' : 'var(--db-expense)' }}>{fmtMoney(pt.noi, { cents: false })}</b><span>NOI</span></div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="db-card-head" style={{ marginBottom: 10 }}>
            <h2 className="db-h2">Recent activity</h2>
            <Link href="/doorbooks/transactions" className="db-btn db-btn-ghost db-btn-sm">Register <ChevronRight /></Link>
          </div>
          <TxList txs={db.transactions} properties={properties} groupByMonth={false} limit={8} />
        </div>
        <div className="db-card db-card-pad" style={{ alignSelf: 'start', minWidth: 0 }}>
          <div className="db-card-head"><h2 className="db-h2">Where the money goes</h2><span className="db-sub">{rangeLabel(range.range)}</span></div>
          {breakdown.length === 0 ? <div className="db-faint">No expenses in this range.</div> : breakdown.map((b) => (
            <div key={b.category.id} className="db-bar-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.category.name}</span><span className="db-faint db-num">{Math.round(b.share * 100)}%</span></div>
                <div className="db-bar-track"><div className="db-bar-fill" style={{ width: Math.max(2, b.share * 100) + '%' }} /></div>
              </div>
              <Money cents={b.amount} noCents className="db-num" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
