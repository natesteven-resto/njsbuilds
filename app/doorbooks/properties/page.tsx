'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Sparkline } from '../_components/Charts'
import { EmptyState } from '../_components/EmptyState'
import { PropertyForm } from '../_components/PropertyForm'
import { lastNMonths, rangeFor } from '../_lib/dates'
import { fmtMoney } from '../_lib/money'
import { filterTx, monthlyRentRoll, monthlySeries, occupancy, totals } from '../_lib/reports'
import { useDB, useHydrated } from '../_lib/store'
import { PROPERTY_TYPES } from '../_lib/types'

export default function PropertiesPage() {
  const db = useDB()
  const hydrated = useHydrated()
  const [adding, setAdding] = useState(false)
  const properties = useMemo(() => db.properties.filter((p) => !p.archived), [db.properties])
  const ytd = useMemo(() => rangeFor('ytd'), [])
  const months12 = useMemo(() => lastNMonths(12), [])
  const ytdTx = useMemo(() => filterTx(db.transactions, { range: ytd }), [db.transactions, ytd])
  const doors = properties.reduce((a, p) => a + p.units.length, 0)
  const occupied = properties.reduce((a, p) => a + occupancy(p).occupied, 0)
  const roll = properties.reduce((a, p) => a + monthlyRentRoll(p), 0)

  if (!hydrated) return <div className="db-skel" style={{ height: 300 }} />
  if (properties.length === 0) return <EmptyState />

  return (
    <div className="db-page">
      <div className="db-head">
        <div>
          <h1 className="db-h1 db-display">Properties</h1>
          <div className="db-sub">{properties.length} {properties.length === 1 ? 'property' : 'properties'} &middot; {occupied}/{doors} doors occupied &middot; <span className="db-num">{fmtMoney(roll, { cents: false })}</span>/mo rent roll</div>
        </div>
        <button type="button" className="db-btn db-btn-primary" onClick={() => setAdding(true)}><Plus /> Add property</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {properties.map((p) => {
          const t = totals(ytdTx.filter((x) => x.propertyId === p.id))
          const spark = monthlySeries(db.transactions, months12, p.id).map((m) => m.noi)
          const occ = occupancy(p)
          const type = PROPERTY_TYPES.find((x) => x.id === p.type)?.label ?? p.type
          return (
            <Link key={p.id} href={'/doorbooks/properties/' + p.id} className="db-card db-prop">
              <span className="db-prop-stripe" style={{ background: p.color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="db-prop-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div className="db-prop-addr">{[p.address, p.city, p.state].filter(Boolean).join(', ')}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="db-pill db-pill-muted">{type}</span>
                    <span className={'db-pill ' + (occ.occupied === occ.total ? 'db-pill-income' : 'db-pill-expense')}>{occ.occupied}/{occ.total} occupied</span>
                    <span className="db-pill db-pill-muted db-num">{fmtMoney(monthlyRentRoll(p), { cents: false })}/mo</span>
                  </div>
                </div>
                <Sparkline values={spark} color={p.color} width={90} height={30} />
              </div>
              <div className="db-prop-stats">
                <div className="db-prop-stat"><b className="db-num db-income">{fmtMoney(t.income, { cents: false })}</b><span>Income YTD</span></div>
                <div className="db-prop-stat"><b className="db-num db-expense">{fmtMoney(t.expense, { cents: false })}</b><span>Expenses</span></div>
                <div className="db-prop-stat"><b className="db-num" style={{ color: t.noi >= 0 ? 'var(--db-brand2)' : 'var(--db-expense)' }}>{fmtMoney(t.noi, { cents: false })}</b><span>NOI</span></div>
              </div>
            </Link>
          )
        })}
      </div>

      {adding && <PropertyForm onClose={() => setAdding(false)} />}
    </div>
  )
}
