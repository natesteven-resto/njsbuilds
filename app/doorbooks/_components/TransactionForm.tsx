'use client'

import { useMemo, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { categoriesFor, categoryById } from '../_lib/categories'
import { today } from '../_lib/dates'
import { centsToInput, parseMoney } from '../_lib/money'
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction, useDB } from '../_lib/store'
import type { Transaction, TxKind } from '../_lib/types'
import { Modal } from './Modal'
import { useUI, type TxPrefill } from './ui'

interface Draft {
  kind: TxKind
  amount: string
  date: string
  propertyId: string
  unitId: string
  categoryId: string
  payee: string
  memo: string
  account: string
}

export function TransactionForm({ edit, prefill, onClose }: { edit?: Transaction; prefill?: TxPrefill; onClose: () => void }) {
  const db = useDB()
  const { toast } = useUI()
  const properties = useMemo(() => db.properties.filter((p) => !p.archived), [db.properties])

  const initial = useMemo<Draft>(() => {
    const src = edit ?? prefill ?? {}
    const propertyId = src.propertyId ?? db.settings.lastPropertyId ?? properties[0]?.id ?? ''
    return {
      kind: src.kind ?? 'expense',
      amount: edit ? centsToInput(edit.amount) : src.amount ? centsToInput(src.amount) : '',
      date: src.date ?? today(),
      propertyId,
      unitId: src.unitId ?? '',
      categoryId: src.categoryId ?? '',
      payee: src.payee ?? '',
      memo: src.memo ?? '',
      account: src.account ?? db.settings.lastAccount ?? db.settings.accounts[0] ?? '',
    }
  }, [edit, prefill, db.settings, properties])

  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  const property = properties.find((p) => p.id === d.propertyId)
  const units = property?.units ?? []
  const cats = categoriesFor(d.kind)
  const plCats = cats.filter((c) => c.pl)
  const otherCats = cats.filter((c) => !c.pl)

  // Payee suggestions, most-used first.
  const payees = useMemo(() => {
    const count = new Map<string, number>()
    for (const t of db.transactions) if (t.payee.trim()) count.set(t.payee.trim(), (count.get(t.payee.trim()) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 60)
  }, [db.transactions])

  // Memorized transaction: when a known payee is typed and no category chosen, reuse the last one.
  const onPayeeChange = (payee: string) => {
    const next: Partial<Draft> = { payee }
    if (!d.categoryId && payee.trim()) {
      const last = [...db.transactions].reverse().find((t) => t.payee.trim().toLowerCase() === payee.trim().toLowerCase())
      if (last) {
        next.categoryId = last.categoryId
        next.kind = last.kind
        if (!d.amount && last.amount) next.amount = centsToInput(last.amount)
      }
    }
    patch(next)
  }

  const setKind = (kind: TxKind) => {
    const keep = d.categoryId && categoryById(d.categoryId).kind === kind
    patch({ kind, categoryId: keep ? d.categoryId : '' })
  }

  const validate = (): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> | null => {
    const amount = parseMoney(d.amount)
    if (amount === null || amount <= 0) { setError('Enter an amount greater than zero.'); return null }
    if (!d.propertyId) { setError('Pick a property.'); return null }
    if (!d.categoryId) { setError('Pick a category.'); return null }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { setError('Pick a date.'); return null }
    setError('')
    return {
      kind: d.kind, amount, date: d.date, propertyId: d.propertyId, unitId: d.unitId || undefined,
      categoryId: d.categoryId, payee: d.payee.trim(), memo: d.memo.trim(), account: d.account,
    }
  }

  const save = (another: boolean) => {
    const v = validate()
    if (!v) return
    if (edit) {
      updateTransaction(edit.id, v)
      toast('Transaction updated')
      onClose()
      return
    }
    addTransaction(v)
    if (another) {
      setSavedCount((c) => c + 1)
      setD((x) => ({ ...x, amount: '', payee: '', memo: '', categoryId: '' }))
      const el = document.querySelector<HTMLInputElement>('[data-autofocus]')
      el?.focus()
    } else {
      toast('Saved')
      onClose()
    }
  }

  const doDelete = () => {
    if (!edit) return
    const removed = deleteTransaction(edit.id)
    onClose()
    if (removed) toast('Transaction deleted', { label: 'Undo', onClick: () => restoreTransaction(removed) })
  }

  const title = edit ? 'Edit transaction' : savedCount ? 'New transaction (' + savedCount + ' saved)' : 'New transaction'

  return (
    <Modal title={title} onClose={onClose}>
      <form className="db-form" onSubmit={(e) => { e.preventDefault(); save(false) }}>
        <div className="db-seg" style={{ alignSelf: 'flex-start' }} role="group" aria-label="Type">
          <button type="button" aria-pressed={d.kind === 'income'} onClick={() => setKind('income')} className={d.kind === 'income' ? 'db-income' : ''}>Money in</button>
          <button type="button" aria-pressed={d.kind === 'expense'} onClick={() => setKind('expense')} className={d.kind === 'expense' ? 'db-expense' : ''}>Money out</button>
        </div>

        <div className="db-field">
          <label className="db-label" htmlFor="tx-amount">Amount</label>
          <div className="db-amount-wrap">
            <span className="db-amount-sym">$</span>
            <input id="tx-amount" data-autofocus className="db-input db-amount db-num" inputMode="decimal" placeholder="0.00" value={d.amount} onChange={(e) => patch({ amount: e.target.value })} autoComplete="off" />
          </div>
        </div>

        <div className="db-field">
          <span className="db-label">Property</span>
          <div className="db-chips">
            {properties.map((p) => (
              <button key={p.id} type="button" className="db-chip" aria-pressed={d.propertyId === p.id} onClick={() => patch({ propertyId: p.id, unitId: '' })}>
                <span className="db-dot" style={{ background: p.color }} />{p.name}
              </button>
            ))}
          </div>
          {units.length > 1 && (
            <div className="db-chips" style={{ marginTop: 8 }}>
              <button type="button" className="db-chip db-chip-sm" aria-pressed={!d.unitId} onClick={() => patch({ unitId: '' })}>Whole property</button>
              {units.map((u) => (
                <button key={u.id} type="button" className="db-chip db-chip-sm" aria-pressed={d.unitId === u.id} onClick={() => patch({ unitId: u.id })}>{u.label}{u.tenant ? ' \u00b7 ' + u.tenant.split(' ')[0] : ''}</button>
              ))}
            </div>
          )}
        </div>

        <div className="db-field">
          <span className="db-label">Category {d.kind === 'expense' ? <span className="db-faint" style={{ fontWeight: 500 }}>(Schedule E line)</span> : null}</span>
          <div className="db-chips">
            {plCats.map((c) => (
              <button key={c.id} type="button" className="db-chip db-chip-sm" aria-pressed={d.categoryId === c.id} onClick={() => patch({ categoryId: c.id })} title={c.hint}>
                {c.name}{c.line && c.kind === 'expense' ? <span className="db-faint" style={{ fontSize: 11 }}>{c.line}</span> : null}
              </button>
            ))}
          </div>
          <div className="db-help" style={{ margin: '8px 0 6px' }}>Not on the P&amp;L (cash only)</div>
          <div className="db-chips">
            {otherCats.map((c) => (
              <button key={c.id} type="button" className="db-chip db-chip-sm" aria-pressed={d.categoryId === c.id} onClick={() => patch({ categoryId: c.id })} title={c.hint}>{c.name}</button>
            ))}
          </div>
          {d.categoryId && categoryById(d.categoryId).hint ? <div className="db-help" style={{ marginTop: 6 }}>{categoryById(d.categoryId).hint}</div> : null}
        </div>

        <div className="db-grid2">
          <div className="db-field">
            <label className="db-label" htmlFor="tx-date">Date</label>
            <input id="tx-date" type="date" className="db-input db-num" value={d.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="db-field">
            <label className="db-label" htmlFor="tx-account">Paid {d.kind === 'income' ? 'into' : 'from'}</label>
            <select id="tx-account" className="db-select" value={d.account} onChange={(e) => patch({ account: e.target.value })}>
              {db.settings.accounts.map((a) => <option key={a} value={a}>{a}</option>)}
              {d.account && !db.settings.accounts.includes(d.account) ? <option value={d.account}>{d.account}</option> : null}
            </select>
          </div>
        </div>

        <div className="db-grid2 db-stack">
          <div className="db-field">
            <label className="db-label" htmlFor="tx-payee">{d.kind === 'income' ? 'From' : 'Payee'}</label>
            <input id="tx-payee" className="db-input" list="db-payees" value={d.payee} onChange={(e) => onPayeeChange(e.target.value)} placeholder={d.kind === 'income' ? 'Tenant name' : 'Who got paid'} autoComplete="off" />
            <datalist id="db-payees">{payees.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="db-field">
            <label className="db-label" htmlFor="tx-memo">Memo</label>
            <input id="tx-memo" className="db-input" value={d.memo} onChange={(e) => patch({ memo: e.target.value })} placeholder="Optional note" autoComplete="off" />
          </div>
        </div>

        {error && <div className="db-error" role="alert">{error}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="db-btn db-btn-primary" style={{ flex: '1 1 160px', height: 44 }}><Check /> {edit ? 'Save changes' : 'Save'}</button>
          {!edit && <button type="button" className="db-btn" style={{ height: 44 }} onClick={() => save(true)}>Save &amp; add another</button>}
          {edit && !confirmDelete && <button type="button" className="db-btn db-btn-ghost" style={{ height: 44 }} onClick={() => setConfirmDelete(true)} aria-label="Delete"><Trash2 /> Delete</button>}
          {edit && confirmDelete && <button type="button" className="db-btn db-btn-danger" style={{ height: 44 }} onClick={doDelete}>Yes, delete it</button>}
        </div>
      </form>
    </Modal>
  )
}
