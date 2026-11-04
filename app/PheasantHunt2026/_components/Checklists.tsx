'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CHECKLISTS, type Checklist, type Dog, type ListItem, type Person } from '../_lib/data'
import { checkKey, type HuntState, type Updater } from '../_lib/store'
import { Bar, Check, Reveal, Section, SectionHead } from './ui'

interface Props {
  state: HuntState
  update: Updater
  listPct: Record<string, { done: number; total: number }>
}

type Col = { id: string; label: string; adult?: boolean; pup?: boolean }

export function columnsFor(list: Checklist, people: Person[], dogs: Dog[]): Col[] {
  if (list.kind === 'people') return people.map((p) => ({ id: p.id, label: p.name || '—', adult: p.adult }))
  if (list.kind === 'dogs') return dogs.map((d) => ({ id: d.id, label: d.name || '—', pup: d.pup }))
  return [{ id: 'x', label: '' }]
}

export function applies(item: ListItem, col: Col): boolean {
  const w = item.who ?? 'all'
  if (w === 'all') return true
  if (w === 'adult') return !!col.adult
  if (w === 'kids') return col.adult === false
  if (w === 'pup') return !!col.pup
  if (w === 'grown') return col.pup === false
  return true
}

export default function Checklists({ state, update, listPct }: Props) {
  const [tab, setTab] = useState(CHECKLISTS[0].id)
  const [draft, setDraft] = useState('')
  const list = CHECKLISTS.find((l) => l.id === tab) ?? CHECKLISTS[0]
  const cols = useMemo(() => columnsFor(list, state.people, state.dogs), [list, state.people, state.dogs])
  const custom = state.custom[list.id] ?? []
  const pct = listPct[list.id] ?? { done: 0, total: 1 }

  const toggle = (itemId: string, colId: string) =>
    update((s) => {
      const k = checkKey(list.id, itemId, colId)
      const next = { ...s.checks }
      if (next[k]) delete next[k]
      else next[k] = true
      return { ...s, checks: next }
    })

  const addCustom = () => {
    const label = draft.trim()
    if (!label) return
    update((s) => ({
      ...s,
      custom: { ...s.custom, [list.id]: [...(s.custom[list.id] ?? []), { id: `c${Date.now().toString(36)}`, label }] },
    }))
    setDraft('')
  }

  const removeCustom = (id: string) =>
    update((s) => {
      const checks = { ...s.checks }
      for (const k of Object.keys(checks)) if (k.startsWith(`${list.id}|${id}|`)) delete checks[k]
      return { ...s, checks, custom: { ...s.custom, [list.id]: (s.custom[list.id] ?? []).filter((c) => c.id !== id) } }
    })

  const resetList = () => {
    if (!window.confirm(`Uncheck everything in ${list.title}?`)) return
    update((s) => {
      const checks = { ...s.checks }
      for (const k of Object.keys(checks)) if (k.startsWith(`${list.id}|`)) delete checks[k]
      return { ...s, checks }
    })
  }

  const rows: { item: ListItem; isCustom: boolean }[] = [
    ...list.items.map((item) => ({ item, isCustom: false })),
    ...custom.map((c) => ({ item: { id: c.id, label: c.label }, isCustom: true })),
  ]

  const gridCols = list.kind === 'single' ? '1fr 44px' : `1fr repeat(${cols.length}, 52px)`

  return (
    <Section id="gear">
      <SectionHead
        eyebrow="Gear & Logistics"
        title={<>Pack it.<br /><span className="ph-gold-text">Check it.</span></>}
        blurb="Five lists. Per-hunter and per-dog columns where it matters. Saves on this device automatically — the boys can check their own column from their phones."
        right={
          <button type="button" className="ph-btn ph-btn-ghost ph-btn-sm ph-no-print" onClick={() => window.print()}>
            Print lists
          </button>
        }
      />

      {/* tabs */}
      <Reveal>
        <div className="ph-scrollx -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {CHECKLISTS.map((l) => {
            const p = listPct[l.id] ?? { done: 0, total: 1 }
            const on = l.id === tab
            const full = p.total > 0 && p.done >= p.total
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setTab(l.id)}
                className={`relative shrink-0 rounded-2xl border px-4 py-3 text-left transition-all ${
                  on ? 'border-[var(--ph-gold)] bg-[rgba(240,180,41,0.1)]' : 'border-[var(--ph-border)] bg-[var(--ph-card)] hover:border-[var(--ph-border2)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{l.icon}</span>
                  <span className="ph-display text-xl leading-none text-[var(--ph-wheat)]">{l.title}</span>
                  {full && <span className="text-[var(--ph-gold)]">✓</span>}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--ph-muted)]">
                  {p.done}/{p.total}
                </div>
                {on && <motion.div layoutId="ph-tab" className="absolute inset-x-3 -bottom-px h-[2px] bg-[var(--ph-gold)]" />}
              </button>
            )
          })}
        </div>
      </Reveal>

      <AnimatePresence mode="wait">
        <motion.div
          key={list.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="ph-card mt-5 overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-b border-[var(--ph-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">{list.icon} {list.title}</div>
              <div className="mt-1 text-sm text-[var(--ph-muted)]">{list.blurb}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-36">
                <Bar pct={pct.total ? (pct.done / pct.total) * 100 : 0} />
              </div>
              <div className="ph-display text-2xl leading-none text-[var(--ph-gold)] tabular-nums">{pct.done}<span className="text-[var(--ph-muted)]">/{pct.total}</span></div>
              <button type="button" className="ph-btn ph-btn-ghost ph-btn-sm ph-no-print" onClick={resetList}>Reset</button>
            </div>
          </div>

          {/* header row */}
          {list.kind !== 'single' && (
            <div className="grid items-end gap-2 px-5 pt-3 pb-1" style={{ gridTemplateColumns: gridCols }}>
              <div />
              {cols.map((c) => (
                <div key={c.id} className="ph-display truncate text-center text-base leading-none text-[var(--ph-gold)]" title={c.label}>
                  {c.label}
                </div>
              ))}
            </div>
          )}

          <ul className="divide-y divide-[rgba(240,180,41,0.08)]">
            {rows.map(({ item, isCustom }, i) => {
              const allOn = cols.every((c) => !applies(item, c) || state.checks[checkKey(list.id, item.id, c.id)])
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.025, 0.5) }}
                  className={`grid items-center gap-2 px-5 py-2.5 transition-colors ${allOn ? 'bg-[rgba(240,180,41,0.04)]' : ''}`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="min-w-0 pr-2">
                    <div className={`text-[15px] leading-snug ${allOn ? 'text-[var(--ph-muted)] line-through decoration-[var(--ph-gold)]/50' : 'text-[var(--ph-wheat)]'}`}>
                      {item.label}
                      {isCustom && (
                        <button type="button" className="ph-no-print ml-2 text-xs text-[var(--ph-dim)] hover:text-[#ff9a5a]" onClick={() => removeCustom(item.id)} aria-label="Remove item">
                          remove
                        </button>
                      )}
                    </div>
                    {item.note && <div className="text-xs text-[var(--ph-dim)]">{item.note}</div>}
                  </div>
                  {cols.map((c) => {
                    const na = !applies(item, c)
                    const k = checkKey(list.id, item.id, c.id)
                    return (
                      <div key={c.id} className="flex justify-center">
                        <Check on={!!state.checks[k]} na={na} onToggle={() => toggle(item.id, c.id)} label={`${item.label}${c.label ? ` — ${c.label}` : ''}`} />
                      </div>
                    )
                  })}
                </motion.li>
              )
            })}
          </ul>

          <div className="ph-no-print flex items-center gap-2 border-t border-[var(--ph-border)] px-5 py-4">
            <input
              className="ph-input"
              placeholder={`Add to ${list.title}…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
            />
            <button type="button" className="ph-btn ph-btn-gold ph-btn-sm" onClick={addCustom}>Add</button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Section>
  )
}
