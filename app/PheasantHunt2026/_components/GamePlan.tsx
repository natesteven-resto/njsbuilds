'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { REGIONS, TIMELINE } from '../_lib/data'
import { fmtDate, fmtTime, type SunTimes } from '../_lib/sun'
import type { Updater } from '../_lib/store'
import { Reveal, Section, SectionHead } from './ui'

interface Props {
  huntDate: string
  locationName: string
  regionId: string
  sun: SunTimes | null
  update: Updater
}

export default function GamePlan({ huntDate, locationName, regionId, sun, update }: Props) {
  const lineRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: lineRef, offset: ['start 70%', 'end 70%'] })
  const lineH = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  const stopTime = (t: string, key?: 'light' | 'sunset') => {
    if (!sun) return t
    if (key === 'light') return fmtTime(sun.legalLight)
    if (key === 'sunset') return fmtTime(sun.sunset)
    return t
  }

  return (
    <Section id="plan">
      <SectionHead
        eyebrow="Game Plan"
        title={<>Opening day,<br /><span className="ph-gold-text">hour by hour.</span></>}
        blurb="Set the date and the part of the state and the legal-light / sunset stops update themselves."
      />

      {/* settings strip */}
      <Reveal>
        <div className="ph-card mb-10 grid gap-4 p-5 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-end">
          <div>
            <label className="ph-eyebrow mb-2 block text-[10px]">Hunt date</label>
            <input type="date" className="ph-input" value={huntDate} onChange={(e) => update((s) => ({ ...s, huntDate: e.target.value || s.huntDate }))} />
            <div className="mt-1.5 text-xs text-[var(--ph-muted)]">{fmtDate(huntDate)}</div>
          </div>
          <div>
            <label className="ph-eyebrow mb-2 block text-[10px]">Where</label>
            <input className="ph-input" value={locationName} onChange={(e) => update((s) => ({ ...s, locationName: e.target.value }))} placeholder="Kansas · Opening Weekend" />
            <div className="mt-1.5 text-xs text-[var(--ph-muted)]">Shows in the hero.</div>
          </div>
          <div>
            <label className="ph-eyebrow mb-2 block text-[10px]">Sun times for</label>
            <select className="ph-input" value={regionId} onChange={(e) => update((s) => ({ ...s, regionId: e.target.value }))}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <div className="mt-1.5 text-xs text-[var(--ph-muted)]">
              {sun ? (
                <>Legal light <span className="text-[var(--ph-gold)]">{fmtTime(sun.legalLight)}</span> · Sunrise {fmtTime(sun.sunrise)} · Sunset <span className="text-[var(--ph-gold)]">{fmtTime(sun.sunset)}</span></>
              ) : 'Pick a valid date'}
            </div>
          </div>
        </div>
      </Reveal>

      {/* timeline */}
      <div ref={lineRef} className="relative pl-10 sm:pl-14">
        <div className="absolute left-[15px] sm:left-[23px] top-2 bottom-2 w-[2px] bg-[rgba(241,230,203,0.08)]">
          <motion.div className="w-full bg-gradient-to-b from-[#f0b429] via-[#d9641e] to-[#f0b429]" style={{ height: lineH, boxShadow: '0 0 14px rgba(240,180,41,0.6)' }} />
        </div>
        <ol className="space-y-6">
          {TIMELINE.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="ph-timeline-dot absolute -left-10 sm:-left-14 top-5 translate-x-[9px] sm:translate-x-[17px]" />
              <div className={`ph-card p-5 ${s.key ? 'border-[var(--ph-border2)]' : ''}`}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <div className={`ph-display text-2xl leading-none ${s.key ? 'text-[var(--ph-gold)]' : 'text-[var(--ph-wheat)]/70'}`}>{stopTime(s.time, s.key)}</div>
                  <div className="ph-display text-3xl leading-none text-[var(--ph-wheat)]">
                    <span className="mr-2">{s.icon}</span>{s.title}
                  </div>
                  {s.key === 'light' && <span className="rounded-full bg-[var(--ph-gold)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1206]">Legal light</span>}
                </div>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[var(--ph-muted)]">{s.detail}</p>
                <div className="sr-only">Stop {i + 1}</div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
