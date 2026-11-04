'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { Dog, Person } from '../_lib/data'
import type { HuntState, Updater } from '../_lib/store'
import { FeatherBurst, Reveal, Section, SectionHead } from './ui'

const LIMIT = 4

interface Props {
  people: Person[]
  dogs: Dog[]
  tally: HuntState['tally']
  log: HuntState['log']
  update: Updater
}

function Counter({ value, onChange, max, label, big }: { value: number; onChange: (v: number) => void; max?: number; label: string; big?: boolean }) {
  const [burst, setBurst] = useState(0)
  const [pop, setPop] = useState(0)
  const atMax = max !== undefined && value >= max
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="ph-btn ph-btn-ghost h-9 w-9 !p-0 text-lg" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Fewer ${label}`}>−</button>
      <div className={`relative flex items-center justify-center ${big ? 'w-16' : 'w-10'}`}>
        <span key={pop} className={`ph-display tabular-nums leading-none ${big ? 'text-6xl' : 'text-3xl'} ${atMax ? 'text-[var(--ph-gold)]' : 'text-[var(--ph-wheat)]'} ${pop ? 'ph-pop' : ''}`}>
          {value}
        </span>
        <FeatherBurst seed={burst} />
      </div>
      <button
        type="button"
        className={`ph-btn h-9 w-9 !p-0 text-lg ${atMax ? 'ph-btn-ghost opacity-40' : 'ph-btn-gold'}`}
        onClick={() => {
          if (atMax) return
          setBurst(Date.now())
          setPop(Date.now())
          onChange(value + 1)
        }}
        aria-label={`More ${label}`}
      >
        +
      </button>
    </div>
  )
}

export default function BirdBoard({ people, dogs, tally, log, update }: Props) {
  const totalToday = people.reduce((n, p) => n + (tally.roosters[p.id] ?? 0), 0)
  const totalTrip = log.reduce((n, d) => n + Object.values(d.roosters).reduce((a, b) => a + b, 0), 0) + totalToday
  const shotsToday = people.reduce((n, p) => n + (tally.shots[p.id] ?? 0), 0)
  const pctHit = shotsToday ? Math.round((totalToday / shotsToday) * 100) : null

  const setRooster = (id: string, v: number) => update((s) => ({ ...s, tally: { ...s.tally, roosters: { ...s.tally.roosters, [id]: v } } }))
  const setShots = (id: string, v: number) => update((s) => ({ ...s, tally: { ...s.tally, shots: { ...s.tally.shots, [id]: v } } }))
  const setDog = (id: string, k: 'flush' | 'retrieve', v: number) =>
    update((s) => {
      const cur = s.tally.dogs[id] ?? { flush: 0, retrieve: 0 }
      const next = k === 'flush' ? { flush: v, retrieve: cur.retrieve } : { flush: cur.flush, retrieve: v }
      return { ...s, tally: { ...s.tally, dogs: { ...s.tally.dogs, [id]: next } } }
    })

  const logDay = () => {
    if (totalToday === 0 && !window.confirm('No birds logged today. Log the day anyway?')) return
    update((s) => ({
      ...s,
      log: [...s.log, { date: new Date().toISOString().slice(0, 10), roosters: { ...s.tally.roosters } }],
      tally: { roosters: {}, shots: {}, dogs: {} },
    }))
  }
  const clearLog = () => {
    if (!window.confirm('Clear the whole trip log? This cannot be undone.')) return
    update((s) => ({ ...s, log: [] }))
  }

  return (
    <Section id="board">
      <SectionHead
        eyebrow="Bird Board"
        title={<>Roosters<br /><span className="ph-gold-text">in the bag.</span></>}
        blurb={`Daily limit is ${LIMIT} per hunter. The board knows. Dogs get credit too — they earned it.`}
        right={
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="ph-display text-6xl leading-none text-[var(--ph-gold)] tabular-nums">{totalToday}</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ph-muted)]">today</div>
            </div>
            <div className="text-center">
              <div className="ph-display text-6xl leading-none text-[var(--ph-wheat)] tabular-nums">{totalTrip}</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ph-muted)]">trip</div>
            </div>
            {pctHit !== null && (
              <div className="text-center">
                <div className="ph-display text-6xl leading-none text-[var(--ph-wheat)]/70 tabular-nums">{pctHit}%</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ph-muted)]">hit rate</div>
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {people.map((p, i) => {
          const r = tally.roosters[p.id] ?? 0
          const limited = r >= LIMIT
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className={`ph-card relative overflow-hidden p-5 ${limited ? 'border-[var(--ph-gold)]/70' : ''}`}
            >
              {limited && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-[var(--ph-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1206]">Limited out</div>
              )}
              <div className="ph-display text-4xl leading-none text-[var(--ph-wheat)]">{p.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ph-muted)]">{p.gun}</div>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <div className="ph-eyebrow text-[10px]">Roosters</div>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: LIMIT }, (_, k) => (
                      <span key={k} className={`h-2 w-6 rounded-full transition-colors ${k < r ? 'bg-[var(--ph-gold)] shadow-[0_0_10px_rgba(240,180,41,0.7)]' : 'bg-[rgba(241,230,203,0.12)]'}`} />
                    ))}
                  </div>
                </div>
                <Counter value={r} onChange={(v) => setRooster(p.id, v)} max={LIMIT} label="roosters" big />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--ph-border)] pt-4">
                <div className="ph-eyebrow text-[10px]">Shells fired</div>
                <Counter value={tally.shots[p.id] ?? 0} onChange={(v) => setShots(p.id, v)} label="shells" />
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {dogs.map((d, i) => {
          const t = tally.dogs[d.id] ?? { flush: 0, retrieve: 0 }
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.08 }}
              className="ph-card p-5"
            >
              <div className="flex items-baseline justify-between">
                <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">🐾 {d.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ph-muted)]">{d.pup ? 'rookie' : 'veteran'}</div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="ph-eyebrow text-[10px]">Flushes / points</div>
                <Counter value={t.flush} onChange={(v) => setDog(d.id, 'flush', v)} label="flushes" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="ph-eyebrow text-[10px]">Retrieves</div>
                <Counter value={t.retrieve} onChange={(v) => setDog(d.id, 'retrieve', v)} label="retrieves" />
              </div>
            </motion.div>
          )
        })}
      </div>

      <Reveal className="mt-6">
        <div className="ph-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">Trip log</div>
              <div className="mt-1 text-sm text-[var(--ph-muted)]">End of each day: log it, counters reset, the trip total keeps climbing.</div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="ph-btn ph-btn-gold ph-btn-sm" onClick={logDay}>Log today</button>
              {log.length > 0 && <button type="button" className="ph-btn ph-btn-ghost ph-btn-sm" onClick={clearLog}>Clear log</button>}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {log.length > 0 && (
              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 divide-y divide-[rgba(240,180,41,0.08)] overflow-hidden">
                {log.map((d, i) => {
                  const n = Object.values(d.roosters).reduce((a, b) => a + b, 0)
                  return (
                    <li key={`${d.date}-${i}`} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-[var(--ph-muted)]">Day {i + 1} · {d.date}</span>
                      <span className="flex gap-3">
                        {people.map((p) => (
                          <span key={p.id} className="text-[var(--ph-wheat)]/80">{p.name} <span className="ph-display text-lg text-[var(--ph-gold)]">{d.roosters[p.id] ?? 0}</span></span>
                        ))}
                        <span className="ph-display text-lg text-[var(--ph-wheat)]">= {n}</span>
                      </span>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
    </Section>
  )
}
