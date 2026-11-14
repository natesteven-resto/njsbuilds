'use client'

import { ArrowDownLeft, ArrowUpRight, Shuffle } from 'lucide-react'
import { categoryById } from '../_lib/categories'
import { fmtDate, monthKey, monthLabel } from '../_lib/dates'
import { fmtMoney } from '../_lib/money'
import { signed, sortByDateDesc, totals } from '../_lib/reports'
import type { Property, Transaction } from '../_lib/types'
import { useUI } from './ui'

export function TxList({ txs, properties, showProperty = true, groupByMonth = true, limit }: { txs: Transaction[]; properties: Property[]; showProperty?: boolean; groupByMonth?: boolean; limit?: number }) {
  const { openTx } = useUI()
  const propMap = new Map(properties.map((p) => [p.id, p]))
  const sorted = sortByDateDesc(txs)
  const shown = limit ? sorted.slice(0, limit) : sorted

  if (shown.length === 0) {
    return <div className="db-faint" style={{ padding: '26px 12px', textAlign: 'center' }}>No transactions here yet.</div>
  }

  const groups: { key: string; items: Transaction[] }[] = []
  for (const t of shown) {
    const key = groupByMonth ? monthKey(t.date) : 'all'
    const g = groups[groups.length - 1]
    if (g && g.key === key) g.items.push(t)
    else groups.push({ key, items: [t] })
  }

  const row = (t: Transaction) => {
    const c = categoryById(t.categoryId)
    const p = propMap.get(t.propertyId)
    const unit = p?.units.find((u) => u.id === t.unitId)
    const tone = !c.pl ? 'neutral' : t.kind
    const Icon = !c.pl ? Shuffle : t.kind === 'income' ? ArrowDownLeft : ArrowUpRight
    const amt = signed(t)
    return (
      <button key={t.id} type="button" className="db-tx" onClick={() => openTx({ edit: t })}>
        <span className={'db-tx-icon ' + tone}><Icon /></span>
        <span className="db-tx-main">
          <span className="db-tx-title">{t.payee || c.name}{t.payee && t.memo ? <span className="db-faint" style={{ fontWeight: 400 }}> &middot; {t.memo}</span> : !t.payee && t.memo ? <span className="db-faint" style={{ fontWeight: 400 }}> &middot; {t.memo}</span> : null}</span>
          <span className="db-tx-sub">
            {showProperty && p ? <><i className="db-dot" style={{ background: p.color }} />{p.name}{unit ? ' ' + unit.label : ''}<span className="db-faint">&middot;</span></> : unit ? <>{unit.label}<span className="db-faint">&middot;</span></> : null}
            {c.name}{!c.pl ? <span className="db-pill db-pill-muted" style={{ height: 18, fontSize: 10 }}>not on P&amp;L</span> : null}
          </span>
        </span>
        <span>
          <span className={'db-tx-amt db-num ' + (!c.pl ? 'db-muted' : t.kind === 'income' ? 'db-income' : '')} style={{ display: 'block' }}>{fmtMoney(amt, { sign: c.pl && t.kind === 'income' })}</span>
          <span className="db-tx-date db-num" style={{ display: 'block' }}>{fmtDate(t.date)}{t.account ? ' \u00b7 ' + t.account : ''}</span>
        </span>
      </button>
    )
  }

  return (
    <div>
      {groups.map((g) => {
        const t = totals(g.items)
        return (
          <div key={g.key}>
            {groupByMonth && (
              <div className="db-month-head">
                <h3>{monthLabel(g.key)}</h3>
                <span className="db-sub db-num" style={{ fontSize: 12.5 }}>
                  <span className="db-income">{fmtMoney(t.income, { cents: false })}</span>
                  <span className="db-faint"> in &middot; </span>
                  <span className="db-expense">{fmtMoney(t.expense, { cents: false })}</span>
                  <span className="db-faint"> out</span>
                </span>
              </div>
            )}
            <div className="db-card" style={{ overflow: 'hidden' }}>{g.items.map(row)}</div>
          </div>
        )
      })}
    </div>
  )
}
