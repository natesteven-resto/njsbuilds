'use client'

import { motion, useScroll } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PheasantMark } from './ui'

const LINKS = [
  { id: 'crew', label: 'Crew' },
  { id: 'gear', label: 'Gear' },
  { id: 'plan', label: 'Game plan' },
  { id: 'code', label: 'The Code' },
  { id: 'field', label: 'Field notes' },
  { id: 'board', label: 'Bird board' },
]

export default function Nav({ readyPct, daysLeft }: { readyPct: number; daysLeft: number | null }) {
  const { scrollY } = useScroll()
  const [shown, setShown] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setShown(v > window.innerHeight * 0.75))
    return () => unsub()
  }, [scrollY])

  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <motion.header
      className="ph-no-print fixed inset-x-0 top-0 z-50"
      initial={false}
      animate={{ y: shown ? 0 : -90, opacity: shown ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="border-b border-[var(--ph-border)] bg-[#0e0b08]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2 shrink-0">
            <PheasantMark size={26} />
            <span className="ph-display text-xl leading-none text-[var(--ph-wheat)]">PH<span className="text-[var(--ph-gold)]">26</span></span>
          </a>
          <nav className="ph-scrollx flex flex-1 items-center gap-1 overflow-x-auto">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                  active === l.id ? 'bg-[var(--ph-gold)] text-[#1a1206]' : 'text-[var(--ph-muted)] hover:text-[var(--ph-wheat)]'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] uppercase tracking-[0.18em] text-[var(--ph-muted)]">
            {daysLeft !== null && (
              <span>
                <span className="ph-display text-lg text-[var(--ph-gold)] align-middle">{daysLeft}</span> days
              </span>
            )}
            <span className="h-4 w-px bg-[var(--ph-border2)]" />
            <span>
              <span className="ph-display text-lg text-[var(--ph-wheat)] align-middle">{Math.round(readyPct)}%</span> packed
            </span>
          </div>
        </div>
        <div className="h-[2px] w-full bg-[rgba(241,230,203,0.06)]">
          <div className="h-full bg-gradient-to-r from-[#d9641e] via-[#f0b429] to-[#ffe9a6] transition-[width] duration-700" style={{ width: `${readyPct}%` }} />
        </div>
      </div>
    </motion.header>
  )
}
