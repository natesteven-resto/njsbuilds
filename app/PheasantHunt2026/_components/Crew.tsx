'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Dog, Person } from '../_lib/data'
import type { Updater } from '../_lib/store'
import { Bar, Reveal, Section, SectionHead } from './ui'

interface Props {
  people: Person[]
  dogs: Dog[]
  update: Updater
  personPct: Record<string, number>
  dogPct: Record<string, number>
}

const HUNTER_ART = ['🧔', '🧢', '🧢']
const DOG_ART = ['🐕', '🐕', '🐶']

function TiltCard({ children, delay = 0, accent }: { children: React.ReactNode; delay?: number; accent: string }) {
  const [t, setT] = useState({ x: 0, y: 0 })
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div
        className="ph-card relative overflow-hidden p-5 sm:p-6 transition-transform duration-300 will-change-transform"
        style={{ transform: `perspective(900px) rotateX(${t.y}deg) rotateY(${t.x}deg)` }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return
          const r = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          setT({ x: x * 8, y: -y * 8 })
        }}
        onPointerLeave={() => setT({ x: 0, y: 0 })}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: accent }} />
        {children}
      </div>
    </motion.div>
  )
}

export default function Crew({ people, dogs, update, personPct, dogPct }: Props) {
  const [editing, setEditing] = useState(false)

  const setPerson = (id: string, patch: Partial<Person>) =>
    update((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const setDog = (id: string, patch: Partial<Dog>) =>
    update((s) => ({ ...s, dogs: s.dogs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))

  return (
    <Section id="crew">
      <SectionHead
        eyebrow="The Crew"
        title={<>Three guns.<br /><span className="ph-gold-text">Three noses.</span></>}
        blurb="Who is walking the line and who is finding the birds. Tap edit to fix names, ages, gauges — whatever Dad got wrong."
        right={
          <button type="button" className={`ph-btn ph-btn-sm ${editing ? 'ph-btn-gold' : 'ph-btn-ghost'}`} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Edit crew'}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {people.map((p, i) => (
          <TiltCard key={p.id} delay={i * 0.08} accent="#f0b429">
            <div className="flex items-start justify-between">
              <div className="ph-float text-4xl" style={{ animationDelay: `${i * 0.7}s` }}>{HUNTER_ART[i]}</div>
              <div className="rounded-full border border-[var(--ph-border2)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ph-gold)]">
                Hunter {i + 1}
              </div>
            </div>
            {editing ? (
              <div className="mt-4 grid gap-2">
                <input className="ph-input" value={p.name} onChange={(e) => setPerson(p.id, { name: e.target.value })} placeholder="Name" />
                <div className="grid grid-cols-2 gap-2">
                  <input className="ph-input" value={p.age} onChange={(e) => setPerson(p.id, { age: e.target.value })} placeholder="Age" />
                  <input className="ph-input" value={p.gun} onChange={(e) => setPerson(p.id, { gun: e.target.value })} placeholder="Gauge" />
                </div>
                <input className="ph-input" value={p.shells} onChange={(e) => setPerson(p.id, { shells: e.target.value })} placeholder="Shells" />
                <input className="ph-input" value={p.role} onChange={(e) => setPerson(p.id, { role: e.target.value })} placeholder="Role" />
              </div>
            ) : (
              <>
                <div className="ph-display mt-4 text-5xl leading-none text-[var(--ph-wheat)]">{p.name || '—'}</div>
                <div className="mt-1 text-sm text-[var(--ph-muted)]">
                  {p.age && <span>{/^\d+$/.test(p.age) ? `${p.age} yrs` : p.age} · </span>}
                  {p.role}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-black/30 px-2.5 py-1 text-xs font-semibold text-[var(--ph-wheat)]">🔫 {p.gun}</span>
                  <span className="rounded-lg bg-black/30 px-2.5 py-1 text-xs font-semibold text-[var(--ph-wheat)]">🟠 Blaze orange</span>
                  <span className="rounded-lg bg-black/30 px-2.5 py-1 text-xs font-semibold text-[var(--ph-wheat)]">🧨 {p.shells}</span>
                </div>
              </>
            )}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--ph-muted)]">
                <span>Packed</span>
                <span className="text-[var(--ph-gold)]">{Math.round(personPct[p.id] ?? 0)}%</span>
              </div>
              <Bar pct={personPct[p.id] ?? 0} />
            </div>
          </TiltCard>
        ))}
      </div>

      <Reveal className="my-8">
        <div className="ph-horizon" />
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-3">
        {dogs.map((d, i) => (
          <TiltCard key={d.id} delay={0.1 + i * 0.08} accent={d.pup ? '#d9641e' : '#8fa36a'}>
            <div className="flex items-start justify-between">
              <div className="ph-float text-4xl" style={{ animationDelay: `${0.4 + i * 0.7}s` }}>{DOG_ART[i]}</div>
              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${d.pup ? 'border-[#d9641e]/60 text-[#ff9a5a]' : 'border-[#8fa36a]/60 text-[#b7c98f]'}`}>
                {d.pup ? 'Rookie' : 'Veteran'}
              </div>
            </div>
            {editing ? (
              <div className="mt-4 grid gap-2">
                <input className="ph-input" value={d.name} onChange={(e) => setDog(d.id, { name: e.target.value })} placeholder="Name" />
                <div className="grid grid-cols-2 gap-2">
                  <input className="ph-input" value={d.age} onChange={(e) => setDog(d.id, { age: e.target.value })} placeholder="Age" />
                  <input className="ph-input" value={d.breed} onChange={(e) => setDog(d.id, { breed: e.target.value })} placeholder="Breed" />
                </div>
                <input className="ph-input" value={d.role} onChange={(e) => setDog(d.id, { role: e.target.value })} placeholder="Role" />
                <label className="flex items-center gap-2 text-xs text-[var(--ph-muted)]">
                  <input type="checkbox" checked={d.pup} onChange={(e) => setDog(d.id, { pup: e.target.checked })} /> Puppy — exposure only
                </label>
              </div>
            ) : (
              <>
                <div className="ph-display mt-4 text-5xl leading-none text-[var(--ph-wheat)]">{d.name || '—'}</div>
                <div className="mt-1 text-sm text-[var(--ph-muted)]">{d.breed} · {/^\d+$/.test(d.age) ? `${d.age} yrs` : d.age}</div>
                <div className="mt-3 text-sm text-[var(--ph-wheat)]/85">{d.role}</div>
              </>
            )}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--ph-muted)]">
                <span>Kit ready</span>
                <span className="text-[var(--ph-gold)]">{Math.round(dogPct[d.id] ?? 0)}%</span>
              </div>
              <Bar pct={dogPct[d.id] ?? 0} />
            </div>
          </TiltCard>
        ))}
      </div>
    </Section>
  )
}
