'use client'

import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { centsToInput, parseMoney } from '../_lib/money'
import { addProperty, uid, updateProperty, useDB } from '../_lib/store'
import { PROPERTY_COLORS, PROPERTY_TYPES, type Property, type PropertyType, type Unit } from '../_lib/types'
import { Modal } from './Modal'

interface UnitDraft { id: string; label: string; rent: string; tenant: string; leaseEnd: string }

interface Draft {
  name: string; address: string; city: string; state: string; zip: string; type: PropertyType; color: string
  purchasePrice: string; purchaseDate: string; units: UnitDraft[]
}

function fromProperty(p?: Property, nextColor?: string): Draft {
  return {
    name: p?.name ?? '', address: p?.address ?? '', city: p?.city ?? '', state: p?.state ?? '', zip: p?.zip ?? '',
    type: p?.type ?? 'single', color: p?.color ?? nextColor ?? PROPERTY_COLORS[0],
    purchasePrice: p?.purchasePrice ? centsToInput(p.purchasePrice) : '', purchaseDate: p?.purchaseDate ?? '',
    units: (p?.units ?? [{ id: uid(), label: 'Main', rent: 0, tenant: '' }]).map((u) => ({ id: u.id, label: u.label, rent: u.rent ? centsToInput(u.rent) : '', tenant: u.tenant, leaseEnd: u.leaseEnd ?? '' })),
  }
}

export function PropertyForm({ edit, onClose, onSaved }: { edit?: Property; onClose: () => void; onSaved?: (p: Property) => void }) {
  const db = useDB()
  const [d, setD] = useState<Draft>(() => fromProperty(edit, PROPERTY_COLORS[db.properties.length % PROPERTY_COLORS.length]))
  const [error, setError] = useState('')
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const patchUnit = (id: string, p: Partial<UnitDraft>) => setD((x) => ({ ...x, units: x.units.map((u) => (u.id === id ? { ...u, ...p } : u)) }))

  const addUnit = () => setD((x) => ({ ...x, units: [...x.units, { id: uid(), label: 'Unit ' + String.fromCharCode(65 + x.units.length), rent: '', tenant: '', leaseEnd: '' }] }))
  const removeUnit = (id: string) => setD((x) => ({ ...x, units: x.units.filter((u) => u.id !== id) }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!d.name.trim()) { setError('Give the property a name.'); return }
    if (d.units.length === 0) { setError('Add at least one unit.'); return }
    const units: Unit[] = d.units.map((u) => {
      const existing = edit?.units.find((x) => x.id === u.id)
      return { id: u.id, label: u.label.trim() || 'Unit', rent: parseMoney(u.rent) ?? 0, tenant: u.tenant.trim(), leaseStart: existing?.leaseStart, leaseEnd: u.leaseEnd || undefined }
    })
    const price = parseMoney(d.purchasePrice)
    const payload = {
      name: d.name.trim(), address: d.address.trim(), city: d.city.trim(), state: d.state.trim().toUpperCase(), zip: d.zip.trim(),
      type: d.type, color: d.color, units, purchasePrice: price && price > 0 ? price : undefined, purchaseDate: d.purchaseDate || undefined,
    }
    if (edit) {
      updateProperty(edit.id, payload)
      onSaved?.({ ...edit, ...payload })
    } else {
      const p = addProperty(payload)
      onSaved?.(p)
    }
    onClose()
  }

  return (
    <Modal title={edit ? 'Edit property' : 'Add property'} onClose={onClose} wide>
      <form className="db-form" onSubmit={submit}>
        <div className="db-field">
          <label className="db-label" htmlFor="p-name">Name</label>
          <input id="p-name" data-autofocus className="db-input" value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Maple St Duplex" autoComplete="off" />
        </div>
        <div className="db-field">
          <label className="db-label" htmlFor="p-address">Street address</label>
          <input id="p-address" className="db-input" value={d.address} onChange={(e) => patch({ address: e.target.value })} placeholder="412 Maple St" autoComplete="off" />
        </div>
        <div className="db-grid2" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          <div className="db-field"><label className="db-label" htmlFor="p-city">City</label><input id="p-city" className="db-input" value={d.city} onChange={(e) => patch({ city: e.target.value })} /></div>
          <div className="db-field"><label className="db-label" htmlFor="p-state">State</label><input id="p-state" className="db-input" value={d.state} maxLength={2} onChange={(e) => patch({ state: e.target.value })} /></div>
          <div className="db-field"><label className="db-label" htmlFor="p-zip">ZIP</label><input id="p-zip" className="db-input db-num" inputMode="numeric" value={d.zip} onChange={(e) => patch({ zip: e.target.value })} /></div>
        </div>
        <div className="db-grid2">
          <div className="db-field">
            <label className="db-label" htmlFor="p-type">Type</label>
            <select id="p-type" className="db-select" value={d.type} onChange={(e) => patch({ type: e.target.value as PropertyType })}>
              {PROPERTY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="db-field">
            <span className="db-label">Color</span>
            <div className="db-chips" style={{ gap: 6 }}>
              {PROPERTY_COLORS.map((c) => (
                <button key={c} type="button" aria-label={'Color ' + c} aria-pressed={d.color === c} onClick={() => patch({ color: c })}
                  style={{ width: 26, height: 26, borderRadius: 8, background: c, border: d.color === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="db-grid2">
          <div className="db-field">
            <label className="db-label" htmlFor="p-price">Purchase price <span className="db-faint" style={{ fontWeight: 500 }}>(optional)</span></label>
            <input id="p-price" className="db-input db-num" inputMode="decimal" value={d.purchasePrice} onChange={(e) => patch({ purchasePrice: e.target.value })} placeholder="185,000" />
          </div>
          <div className="db-field">
            <label className="db-label" htmlFor="p-date">Purchase date</label>
            <input id="p-date" type="date" className="db-input db-num" value={d.purchaseDate} onChange={(e) => patch({ purchaseDate: e.target.value })} />
          </div>
        </div>

        <div className="db-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="db-label" style={{ margin: 0 }}>Units &amp; rent roll</span>
            <button type="button" className="db-btn db-btn-sm" onClick={addUnit}><Plus /> Add unit</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.units.map((u) => (
              <div key={u.id} className="db-card" style={{ padding: 10, display: 'grid', gridTemplateColumns: 'minmax(70px, 1fr) minmax(90px, 1fr) minmax(120px, 2fr) auto auto', gap: 8, alignItems: 'end', background: 'var(--db-bg2)' }}>
                <div className="db-field"><span className="db-label" style={{ fontSize: 11 }}>Unit</span><input className="db-input" style={{ height: 38 }} value={u.label} onChange={(e) => patchUnit(u.id, { label: e.target.value })} aria-label="Unit label" /></div>
                <div className="db-field"><span className="db-label" style={{ fontSize: 11 }}>Rent / mo</span><input className="db-input db-num" style={{ height: 38 }} inputMode="decimal" value={u.rent} onChange={(e) => patchUnit(u.id, { rent: e.target.value })} placeholder="1,200" aria-label="Monthly rent" /></div>
                <div className="db-field"><span className="db-label" style={{ fontSize: 11 }}>Tenant</span><input className="db-input" style={{ height: 38 }} value={u.tenant} onChange={(e) => patchUnit(u.id, { tenant: e.target.value })} placeholder="Vacant" aria-label="Tenant" /></div>
                <div className="db-field"><span className="db-label" style={{ fontSize: 11 }}>Lease ends</span><input type="date" className="db-input db-num" style={{ height: 38, width: 150 }} value={u.leaseEnd} onChange={(e) => patchUnit(u.id, { leaseEnd: e.target.value })} aria-label="Lease end" /></div>
                <button type="button" className="db-btn db-btn-ghost db-btn-icon" style={{ height: 38 }} onClick={() => removeUnit(u.id)} aria-label="Remove unit" disabled={d.units.length === 1}><Trash2 /></button>
              </div>
            ))}
          </div>
          <div className="db-help" style={{ marginTop: 6 }}>Rent + tenant here powers the rent-collected gauge. Leave tenant blank for a vacant unit.</div>
        </div>

        {error && <div className="db-error" role="alert">{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="db-btn db-btn-primary" style={{ flex: 1, height: 44 }}><Check /> {edit ? 'Save changes' : 'Add property'}</button>
          <button type="button" className="db-btn" style={{ height: 44 }} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}
