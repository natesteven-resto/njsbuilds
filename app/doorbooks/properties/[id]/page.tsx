'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Legend, MonthlyBars } from '../../_components/Charts'
import { Money } from '../../_components/Money'
import { PropertyForm } from '../../_components/PropertyForm'
import { RangePicker, useRange } from '../../_components/RangePicker'
import { TxList } from '../../_components/TxList'
import { useUI } from '../../_components/ui'
import { fmtDate, lastNMonths, rangeLabel, today } from '../../_lib/dates'
import { fmtMoney, pct } from '../../_lib/money'
import { expenseBreakdown, filterTx, monthlyRentRoll, monthlySeries, occupancy, rentStatus, totals } from '../../_lib/reports'
import { deleteProperty, useDB, useHydrated } from '../../_lib/store'
import { PROPERTY_TYPES } from '../../_lib/types'

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const db = useDB()
  const hydrated = useHydrated()
  const range = useRange('ytd')
  const { openTx, toast } = useUI()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const property = db.properties.find((p) => p.id === params.id)
  const txs = useMemo(() => db.transactions.filter((t) => t.propertyId === params.id), [db.transactions, params.id])
  const inRangeTx = useMemo(() => filterTx(txs, { range: range.range }), [txs, range.range])
  const t = useMemo(() => totals(inRangeTx), [inRangeTx])
  const months12 = useMemo(() => lastNMonths(12), [])
  const series = useMemo(() => monthlySeries(txs, months12), [txs, months12])
  const breakdown = useMemo(() => expenseBreakdown(inRangeTx).slice(0, 8), [inRangeTx])
  const thisMonth = today().slice(0, 7)
  const rent = useMemo(() => rentStatus(db, thisMonth).byProperty.find((r) => r.property.id === params.id), [db, thisMonth, params.id])

  if (!hydrated) return <div className="db-skel" style={{ height: 300 }} />
  if (!property) {
    return (
      <div className="db-hero">
        <h1 className="db-display">Property not found</h1>
        <p>It may have been deleted, or this link came from another device.</p>
        <Link href="/doorbooks/properties" className="db-btn">All properties</Link>
      </div>
    )
  }

  const occ = occupancy(property)
  const type = PROPERTY_TYPES.find((x) => x.id === property.type)?.label ?? property.type
  const roll = monthlyRentRoll(property)
  const annualNOI = series.reduce((a, m) => a + m.noi, 0)
  const capRate = property.purchasePrice ? (annualNOI / property.purchasePrice) * 100 : null

  const remove = () => {
    deleteProperty(property.id)
    toast('Deleted ' + property.name + ' and its ' + txs.length + ' transactions')
    router.push('/doorbooks/properties')
  }

  return (
    <div className="db-page">
      <div>
        <Link href="/doorbooks/properties" className="db-btn db-btn-ghost db-btn-sm" style={{ marginLeft: -10, marginBottom: 6 }}><ChevronLeft /> Properties</Link>
        <div className="db-head">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 10, alignSelf: 'stretch', borderRadius: 6, background: property.color, flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <h1 className="db-h1 db-display" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property.name}</h1>
              <div className="db-sub">{[property.address, property.city, property.state, property.zip].filter(Boolean).join(', ')} &middot; {type}{property.purchaseDate ? ' \u00b7 bought ' + fmtDate(property.purchaseDate, { year: true }) : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="db-btn db-btn-primary" onClick={() => openTx({ prefill: { propertyId: property.id } })}><Plus /> Transaction</button>
            <button type="button" className="db-btn" onClick={() => setEditing(true)}><Pencil /> Edit</button>
            {!confirm ? (
              <button type="button" className="db-btn db-btn-ghost db-btn-icon" aria-label="Delete property" onClick={() => setConfirm(true)}><Trash2 /></button>
            ) : (
              <button type="button" className="db-btn db-btn-danger" onClick={remove}>Delete property + {txs.length} transactions</button>
            )}
          </div>
        </div>
      </div>

      <RangePicker state={range} compact />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div className="db-card db-kpi"><span className="db-kpi-label">Income</span><span className="db-kpi-value db-num db-income">{fmtMoney(t.income, { cents: false })}</span><span className="db-kpi-foot">{rangeLabel(range.range)}</span></div>
        <div className="db-card db-kpi"><span className="db-kpi-label">Expenses</span><span className="db-kpi-value db-num db-expense">{fmtMoney(t.expense, { cents: false })}</span><span className="db-kpi-foot">{breakdown[0] ? 'Biggest: ' + breakdown[0].category.name : '\u2014'}</span></div>
        <div className="db-card db-kpi" style={{ borderColor: 'rgba(240,180,41,0.35)' }}><span className="db-kpi-label">NOI</span><span className="db-kpi-value db-num db-brandc">{fmtMoney(t.noi, { cents: false })}</span><span className="db-kpi-foot">{t.income ? Math.round((t.noi / t.income) * 100) + '% margin' : '\u2014'}</span></div>
        <div className="db-card db-kpi"><span className="db-kpi-label">Cash flow</span><span className="db-kpi-value db-num">{fmtMoney(t.cashflow, { cents: false })}</span><span className="db-kpi-foot">After principal &amp; capex</span></div>
        {capRate !== null && <div className="db-card db-kpi"><span className="db-kpi-label">Cap rate</span><span className="db-kpi-value db-num">{capRate.toFixed(1)}%</span><span className="db-kpi-foot">Trailing 12-mo NOI / {fmtMoney(property.purchasePrice ?? 0, { cents: false })}</span></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="db-card db-card-pad" style={{ minWidth: 0 }}>
          <div className="db-card-head"><h2 className="db-h2">Last 12 months</h2><Legend /></div>
          <MonthlyBars data={series} />
        </div>
        <div className="db-card db-card-pad" style={{ minWidth: 0 }}>
          <div className="db-card-head">
            <h2 className="db-h2">Rent roll</h2>
            <span className={'db-pill ' + (occ.occupied === occ.total ? 'db-pill-income' : 'db-pill-expense')}>{occ.occupied}/{occ.total} occupied &middot; <span className="db-num">{fmtMoney(roll, { cents: false })}</span>/mo</span>
          </div>
          {rent && rent.expected > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span className="db-muted">This month</span><span className="db-num">{fmtMoney(rent.collected, { cents: false })} <span className="db-faint">/ {fmtMoney(rent.expected, { cents: false })}</span></span></div>
              <div className="db-progress"><div style={{ width: Math.min(100, pct(rent.collected, rent.expected)) + '%' }} /></div>
            </div>
          )}
          <div className="db-table-wrap">
            <table className="db-table">
              <thead><tr><th>Unit</th><th>Tenant</th><th className="num">Rent</th><th>Lease ends</th></tr></thead>
              <tbody>
                {property.units.map((u) => (
                  <tr key={u.id} className="db-row-click" onClick={() => openTx({ prefill: { propertyId: property.id, unitId: u.id, kind: 'income', categoryId: 'rent', amount: u.rent, payee: u.tenant } })} title="Record rent for this unit">
                    <td style={{ fontWeight: 700 }}>{u.label}</td>
                    <td className={u.tenant ? '' : 'db-expense'}>{u.tenant || 'Vacant'}</td>
                    <td className="num"><Money cents={u.rent} noCents /></td>
                    <td className="db-muted db-num">{u.leaseEnd ? fmtDate(u.leaseEnd, { year: true }) : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="db-help" style={{ marginTop: 8 }}>Tap a unit to record its rent.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 16 }} className="db-detail-grid">
        <div style={{ minWidth: 0 }}>
          <div className="db-card-head" style={{ marginBottom: 6 }}><h2 className="db-h2">Transactions</h2><span className="db-sub">{inRangeTx.length} in range</span></div>
          <TxList txs={inRangeTx} properties={db.properties} showProperty={false} />
        </div>
        <div className="db-card db-card-pad" style={{ alignSelf: 'start', minWidth: 0 }}>
          <div className="db-card-head"><h2 className="db-h2">Expenses by category</h2></div>
          {breakdown.length === 0 ? <div className="db-faint">No expenses in this range.</div> : breakdown.map((b) => (
            <div key={b.category.id} className="db-bar-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.category.name}{b.category.line ? <span className="db-faint"> &middot; line {b.category.line}</span> : null}</span><span className="db-faint db-num">{Math.round(b.share * 100)}%</span></div>
                <div className="db-bar-track"><div className="db-bar-fill" style={{ width: Math.max(2, b.share * 100) + '%' }} /></div>
              </div>
              <Money cents={b.amount} noCents />
            </div>
          ))}
        </div>
      </div>

      {editing && <PropertyForm edit={property} onClose={() => setEditing(false)} />}
    </div>
  )
}
