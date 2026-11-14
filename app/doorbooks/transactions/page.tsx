'use client'

import { useMemo, useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import { EmptyState } from '../_components/EmptyState'
import { RangePicker, useRange } from '../_components/RangePicker'
import { TxList } from '../_components/TxList'
import { useUI } from '../_components/ui'
import { CATEGORIES, categoryById } from '../_lib/categories'
import { downloadText, toCSV } from '../_lib/csv'
import { fmtMoney } from '../_lib/money'
import { filterTx, sortByDateDesc, totals } from '../_lib/reports'
import { useDB, useHydrated } from '../_lib/store'
import type { TxKind } from '../_lib/types'

export default function TransactionsPage() {
  const db = useDB()
  const hydrated = useHydrated()
  const { openTx } = useUI()
  const range = useRange('all')
  const [q, setQ] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [kind, setKind] = useState<'' | TxKind>('')
  const [categoryId, setCategoryId] = useState('')

  const properties = useMemo(() => db.properties.filter((p) => !p.archived), [db.properties])
  const txs = useMemo(() => filterTx(db.transactions, { range: range.range, propertyId: propertyId || undefined, kind: kind || undefined, categoryId: categoryId || undefined, q }), [db.transactions, range.range, propertyId, kind, categoryId, q])
  const t = useMemo(() => totals(txs), [txs])
  const cats = CATEGORIES.filter((c) => !kind || c.kind === kind)

  const exportCSV = () => {
    const propMap = new Map(db.properties.map((p) => [p.id, p]))
    const rows: (string | number)[][] = [['Date', 'Property', 'Unit', 'Type', 'Category', 'Schedule E line', 'Amount', 'Payee', 'Memo', 'Account']]
    for (const x of sortByDateDesc(txs)) {
      const p = propMap.get(x.propertyId)
      const c = categoryById(x.categoryId)
      rows.push([x.date, p?.name ?? '', p?.units.find((u) => u.id === x.unitId)?.label ?? '', x.kind, c.name, c.line ?? '', ((x.kind === 'income' ? 1 : -1) * x.amount / 100).toFixed(2), x.payee, x.memo, x.account])
    }
    downloadText('doorbooks-transactions.csv', toCSV(rows), 'text/csv')
  }

  if (!hydrated) return <div className="db-skel" style={{ height: 300 }} />
  if (properties.length === 0) return <EmptyState />

  return (
    <div className="db-page" style={{ gap: 14 }}>
      <div className="db-head">
        <div>
          <h1 className="db-h1 db-display">Transactions</h1>
          <div className="db-sub db-num">{txs.length} shown &middot; <span className="db-income">{fmtMoney(t.income, { cents: false })}</span> in &middot; <span className="db-expense">{fmtMoney(t.expense, { cents: false })}</span> out &middot; NOI <span className="db-brandc">{fmtMoney(t.noi, { cents: false })}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="db-btn" onClick={exportCSV} disabled={txs.length === 0}><Download /> CSV</button>
          <button type="button" className="db-btn db-btn-primary" onClick={() => openTx()}><Plus /> New</button>
        </div>
      </div>

      <div className="db-card db-card-pad db-noprint" style={{ display: 'grid', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--db-faint)' }} />
          <input className="db-input" style={{ paddingLeft: 36 }} placeholder={'Search payee, memo, category\u2026'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" />
        </div>
        <RangePicker state={range} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="db-chips">
            <button type="button" className="db-chip db-chip-sm" aria-pressed={!propertyId} onClick={() => setPropertyId('')}>All properties</button>
            {properties.map((p) => (
              <button key={p.id} type="button" className="db-chip db-chip-sm" aria-pressed={propertyId === p.id} onClick={() => setPropertyId(propertyId === p.id ? '' : p.id)}><span className="db-dot" style={{ background: p.color }} />{p.name}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="db-seg" role="group" aria-label="Type">
            <button type="button" aria-pressed={kind === ''} onClick={() => { setKind(''); }}>All</button>
            <button type="button" aria-pressed={kind === 'income'} onClick={() => { setKind('income'); if (categoryId && categoryById(categoryId).kind !== 'income') setCategoryId('') }} className={kind === 'income' ? 'db-income' : ''}>Money in</button>
            <button type="button" aria-pressed={kind === 'expense'} onClick={() => { setKind('expense'); if (categoryId && categoryById(categoryId).kind !== 'expense') setCategoryId('') }} className={kind === 'expense' ? 'db-expense' : ''}>Money out</button>
          </div>
          <select className="db-select" style={{ width: 'auto', minWidth: 200, height: 38 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.line ? ' (line ' + c.line + ')' : ''}</option>)}
          </select>
          {(q || propertyId || kind || categoryId || range.preset !== 'all') && (
            <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={() => { setQ(''); setPropertyId(''); setKind(''); setCategoryId(''); range.setPreset('all') }}>Clear filters</button>
          )}
        </div>
      </div>

      <TxList txs={txs} properties={db.properties} />
    </div>
  )
}
