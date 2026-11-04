'use client'

import { useMemo } from 'react'
import { CHECKLISTS, REGIONS } from '../_lib/data'
import { checkKey, useHuntStore } from '../_lib/store'
import { fmtDate, fmtTime, sunTimes } from '../_lib/sun'
import BirdBoard from './BirdBoard'
import Checklists, { applies, columnsFor } from './Checklists'
import Crew from './Crew'
import FieldNotes from './FieldNotes'
import GamePlan from './GamePlan'
import Hero from './Hero'
import Nav from './Nav'
import TheCode from './TheCode'
import { PheasantMark } from './ui'

export default function HuntApp() {
  const [state, update, hydrated] = useHuntStore()

  /* ── derived progress ──────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const listPct: Record<string, { done: number; total: number }> = {}
    const personCounts: Record<string, { done: number; total: number }> = {}
    const dogCounts: Record<string, { done: number; total: number }> = {}
    let done = 0
    let total = 0
    for (const list of CHECKLISTS) {
      const cols = columnsFor(list, state.people, state.dogs)
      const items = [...list.items, ...(state.custom[list.id] ?? []).map((c) => ({ id: c.id, label: c.label }))]
      let ld = 0
      let lt = 0
      for (const item of items) {
        for (const c of cols) {
          if (!applies(item, c)) continue
          lt++
          const on = !!state.checks[checkKey(list.id, item.id, c.id)]
          if (on) ld++
          if (list.kind === 'people') {
            const pc = (personCounts[c.id] ??= { done: 0, total: 0 })
            pc.total++
            if (on) pc.done++
          } else if (list.kind === 'dogs') {
            const dc = (dogCounts[c.id] ??= { done: 0, total: 0 })
            dc.total++
            if (on) dc.done++
          }
        }
      }
      listPct[list.id] = { done: ld, total: lt }
      done += ld
      total += lt
    }
    const pct = (o?: { done: number; total: number }) => (o && o.total ? (o.done / o.total) * 100 : 0)
    const personPct: Record<string, number> = {}
    const dogPct: Record<string, number> = {}
    for (const p of state.people) personPct[p.id] = pct(personCounts[p.id])
    for (const d of state.dogs) dogPct[d.id] = pct(dogCounts[d.id])
    return { listPct, personPct, dogPct, readyPct: total ? (done / total) * 100 : 0, done, total }
  }, [state.checks, state.custom, state.people, state.dogs])

  /* ── sun + countdown target ────────────────────────────────────────── */
  const region = REGIONS.find((r) => r.id === state.regionId) ?? REGIONS[0]
  const sun = useMemo(() => sunTimes(state.huntDate, region.lat, region.lon), [state.huntDate, region])
  const target = sun?.legalLight ?? null
  const daysLeft = hydrated && target ? Math.max(0, Math.floor((target.getTime() - Date.now()) / 86400000)) : null

  const crewNames = state.people.map((p) => p.name).filter(Boolean)
  const dogNames = state.dogs.map((d) => d.name).filter(Boolean)

  return (
    <main id="top" className="relative">
      <Nav readyPct={hydrated ? stats.readyPct : 0} daysLeft={daysLeft} />

      <Hero
        huntDate={state.huntDate}
        target={target}
        dateLabel={fmtDate(state.huntDate)}
        legalLightLabel={sun ? fmtTime(sun.legalLight) : null}
        locationName={state.locationName || 'Kansas · Opening Weekend'}
        readyPct={hydrated ? stats.readyPct : 0}
        crewNames={crewNames}
        dogNames={dogNames}
      />

      {/* intro strip */}
      <div className="relative border-y border-[var(--ph-border)] bg-[var(--ph-bg2)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-4 sm:px-8">
          {[
            { k: 'Hunters', v: String(state.people.length), s: crewNames.join(' · ') },
            { k: 'Dogs', v: String(state.dogs.length), s: dogNames.join(' · ') },
            { k: 'Boxes checked', v: `${hydrated ? stats.done : 0}/${stats.total}`, s: 'across five lists' },
            { k: 'Daily limit', v: '4', s: 'roosters per hunter · hens never' },
          ].map((c) => (
            <div key={c.k}>
              <div className="ph-eyebrow text-[10px]">{c.k}</div>
              <div className="ph-display mt-1 text-4xl leading-none text-[var(--ph-wheat)]">{c.v}</div>
              <div className="mt-1 text-xs text-[var(--ph-muted)]">{c.s}</div>
            </div>
          ))}
        </div>
      </div>

      <Crew people={state.people} dogs={state.dogs} update={update} personPct={stats.personPct} dogPct={stats.dogPct} />
      <div className="ph-horizon mx-auto max-w-6xl" />
      <Checklists state={state} update={update} listPct={stats.listPct} />
      <div className="ph-horizon mx-auto max-w-6xl" />
      <GamePlan huntDate={state.huntDate} locationName={state.locationName} regionId={state.regionId} sun={sun} update={update} />
      <div className="ph-horizon mx-auto max-w-6xl" />
      <TheCode people={state.people} rulesAck={state.rulesAck} update={update} />
      <div className="ph-horizon mx-auto max-w-6xl" />
      <FieldNotes />
      <div className="ph-horizon mx-auto max-w-6xl" />
      <BirdBoard people={state.people} dogs={state.dogs} tally={state.tally} log={state.log} update={update} />

      <footer className="relative overflow-hidden border-t border-[var(--ph-border)] px-5 py-14 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(240,180,41,0.1),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl">
          <PheasantMark size={44} className="mx-auto" />
          <div className="ph-display mt-4 text-4xl text-[var(--ph-wheat)]">
            Good luck, boys. <span className="ph-gold-text">Shoot straight.</span>
          </div>
          <div className="mt-2 text-sm text-[var(--ph-muted)]">Built by Dad · Everything on this page saves to this device only.</div>
          <button
            type="button"
            className="ph-no-print mt-6 text-xs uppercase tracking-[0.2em] text-[var(--ph-dim)] hover:text-[#ff9a5a]"
            onClick={() => {
              if (!window.confirm('Reset EVERYTHING — names, checklists, bird board, trip log?')) return
              update(() => {
                const fresh = JSON.parse(JSON.stringify({ ...state, checks: {}, custom: {}, tally: { roosters: {}, shots: {}, dogs: {} }, log: [], rulesAck: {} }))
                return fresh
              })
            }}
          >
            Reset all progress
          </button>
        </div>
      </footer>
    </main>
  )
}
