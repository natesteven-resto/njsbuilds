'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import PrairieCanvas, { type PrairieHandle } from './PrairieCanvas'
import { Ring } from './ui'

interface Props {
  huntDate: string
  target: Date | null
  dateLabel: string
  legalLightLabel: string | null
  locationName: string
  readyPct: number
  crewNames: string[]
  dogNames: string[]
}

const T1 = 'PHEASANT'
const T2 = 'HUNT'

const subscribeTick = (cb: () => void) => {
  const id = window.setInterval(cb, 1000)
  return () => window.clearInterval(id)
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000
const getServerNow = () => null

function useCountdown(target: Date | null) {
  const now = useSyncExternalStore(subscribeTick, getNow, getServerNow)
  if (!target || now === null) return null
  const diff = target.getTime() - now
  const past = diff <= 0
  const abs = Math.abs(diff)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  return { d, h, m, s, past }
}

function Letters({ text, start }: { text: string; start: number }) {
  return (
    <span className="inline-block whitespace-nowrap">
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 60, rotateX: -60, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: start + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

export default function Hero(p: Props) {
  const prairie = useRef<PrairieHandle>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const textO = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const cd = useCountdown(p.target)
  const [flushes, setFlushes] = useState(0)

  const cells = useMemo(() => {
    if (!cd) return null
    return [
      { v: cd.d, l: 'days' },
      { v: cd.h, l: 'hrs' },
      { v: cd.m, l: 'min' },
      { v: cd.s, l: 'sec' },
    ]
  }, [cd])

  return (
    <div ref={wrap} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <PrairieCanvas ref={prairie} className="absolute inset-0 h-full w-full cursor-crosshair touch-manipulation" onFlush={() => setFlushes((n) => n + 1)} />
      <div className="ph-grain" />

      {/* content */}
      <motion.div style={{ y: textY, opacity: textO }} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-16 sm:pb-0 text-center">
        <motion.div
          className="ph-eyebrow mb-5 flex items-center gap-3"
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.32em' }}
          transition={{ duration: 1.2, delay: 0.2 }}
        >
          <span className="h-px w-8 bg-[var(--ph-gold)]/70" />
          {p.locationName}
          <span className="h-px w-8 bg-[var(--ph-gold)]/70" />
        </motion.div>

        <h1 className="ph-display leading-[0.82] text-[var(--ph-wheat)] drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)]" style={{ perspective: 800, fontSize: 'clamp(4.4rem, 14vw, 11.5rem)' }}>
          <Letters text={T1} start={0.35} />
          <br />
          <span className="inline-flex items-baseline gap-[0.18em]">
            <Letters text={T2} start={0.75} />
            <motion.span
              className="ph-gold-text"
              initial={{ opacity: 0, scale: 0.6, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            >
              2026
            </motion.span>
          </span>
        </h1>

        <motion.p
          className="mt-6 max-w-xl text-base sm:text-xl text-[var(--ph-wheat)]/90 [text-shadow:0_2px_18px_rgba(0,0,0,0.75)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.4 }}
        >
          <span className="font-semibold">{p.crewNames.join(' · ')}</span>
          <span className="text-[var(--ph-muted)]"> — and </span>
          <span className="font-semibold">{p.dogNames.join(', ')}</span>
          <span className="text-[var(--ph-muted)]">. Three hunters. Three dogs. One opening weekend.</span>
        </motion.p>

        {/* countdown */}
        <motion.div
          className="mt-8 flex items-end gap-3 sm:gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.7 }}
        >
          {cells ? (
            cells.map((c, i) => (
              <div key={c.l} className="flex items-end gap-3 sm:gap-5">
                <div className="flex flex-col items-center">
                  <div className="ph-display text-5xl sm:text-7xl leading-none text-[var(--ph-wheat)] tabular-nums">
                    {String(c.v).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[var(--ph-gold)]">{c.l}</div>
                </div>
                {i < 3 && <div className="ph-display mb-5 text-3xl sm:text-5xl text-[var(--ph-gold)]/60 ph-pulse">:</div>}
              </div>
            ))
          ) : (
            <div className="ph-display text-5xl sm:text-7xl text-[var(--ph-wheat)]/40">—— : —— : —— : ——</div>
          )}
        </motion.div>
        <motion.div
          className="mt-3 text-xs sm:text-sm uppercase tracking-[0.22em] text-[var(--ph-muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 2 }}
        >
          {cd?.past ? 'Season is on · get after it' : `until legal light · ${p.dateLabel}${p.legalLightLabel ? ` · ${p.legalLightLabel}` : ''}`}
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.1 }}
        >
          <a href="#gear" className="ph-btn ph-btn-gold">Start packing</a>
          <a href="#plan" className="ph-btn ph-btn-ghost">The game plan</a>
          <a href="#board" className="ph-btn ph-btn-ghost">Bird board</a>
        </motion.div>
      </motion.div>

      {/* readiness ring — bottom left */}
      <motion.div
        className="pointer-events-auto absolute bottom-7 left-5 sm:left-8 flex items-center gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 2.3 }}
      >
        <Ring pct={p.readyPct} size={88} stroke={7} sub="packed" />
        <div className="hidden sm:block">
          <div className="ph-eyebrow">Readiness</div>
          <div className="text-sm text-[var(--ph-muted)]">Every box, every hunter, every dog.</div>
        </div>
      </motion.div>

      {/* scroll cue + flush hint */}
      <motion.div
        className="pointer-events-none absolute bottom-7 right-5 sm:right-8 flex flex-col items-end gap-2 text-right"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.6 }}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--ph-muted)]">
          {flushes > 0 ? `${flushes} flushed · tap the grass` : 'tap the grass · flush a rooster'}
        </div>
        <div className="ph-bob flex items-center gap-2 text-[var(--ph-gold)]">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="14" height="22" rx="7" />
            <path d="M8 6v5" strokeLinecap="round" />
          </svg>
        </div>
      </motion.div>
    </div>
  )
}
