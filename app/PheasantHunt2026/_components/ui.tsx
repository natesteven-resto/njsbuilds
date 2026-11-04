'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/* ── Section wrapper with reveal ─────────────────────────────────────────── */
export function Section({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-20 px-5 sm:px-8 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  )
}

export function SectionHead({ eyebrow, title, blurb, right }: { eyebrow: string; title: ReactNode; blurb?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Reveal>
          <div className="ph-eyebrow mb-3">{eyebrow}</div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="ph-display text-5xl sm:text-7xl leading-[0.9] text-[var(--ph-wheat)]">{title}</h2>
        </Reveal>
        {blurb && (
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-xl text-base sm:text-lg text-[var(--ph-muted)]">{blurb}</p>
          </Reveal>
        )}
      </div>
      {right && <Reveal delay={0.15}>{right}</Reveal>}
    </div>
  )
}

/* ── Scroll reveal ───────────────────────────────────────────────────────── */
export function Reveal({ children, delay = 0, y = 22, className = '', once = true }: { children: ReactNode; delay?: number; y?: number; className?: string; once?: boolean }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '-60px 0px -60px 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ── Count-up number ─────────────────────────────────────────────────────── */
export function CountUp({ value, duration = 1.1, className = '' }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [shown, setShown] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (!inView) return
    const from = prev.current
    const to = value
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / (duration * 1000))
      const e = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(from + (to - from) * e))
      if (k < 1) raf = requestAnimationFrame(tick)
      else prev.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, inView, duration])
  return <span ref={ref} className={className}>{shown}</span>
}

/* ── Progress ring ───────────────────────────────────────────────────────── */
export function Ring({ pct, size = 120, stroke = 8, label, sub }: { pct: number; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(241,230,203,0.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ph-ring-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * p) / 100 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(240,180,41,0.6))' }}
        />
        <defs>
          <linearGradient id="ph-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d9641e" />
            <stop offset="60%" stopColor="#f0b429" />
            <stop offset="100%" stopColor="#ffe9a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="ph-display leading-none text-[var(--ph-wheat)]" style={{ fontSize: size * 0.3 }}>{label ?? `${Math.round(p)}%`}</div>
        {sub && <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ph-muted)]">{sub}</div>}
      </div>
    </div>
  )
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
export function Bar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`ph-track ${className}`}>
      <div className="ph-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/* ── Feather burst on check ──────────────────────────────────────────────── */
export function FeatherBurst({ seed }: { seed: number }) {
  if (!seed) return null
  const feathers = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + (seed % 7) * 0.3
    const d = 26 + ((seed * (i + 3)) % 18)
    return { i, fx: Math.cos(a) * d, fy: Math.sin(a) * d - 14, fr: ((seed * (i + 1)) % 140) - 70 }
  })
  return (
    <span key={seed} className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {feathers.map((f) => (
        <svg
          key={f.i}
          className="ph-feather left-1/2 top-1/2 -ml-[6px] -mt-[8px]"
          style={{ '--fx': `${f.fx}px`, '--fy': `${f.fy}px`, '--fr': `${f.fr}deg` } as React.CSSProperties}
          width="12" height="16" viewBox="0 0 12 16"
        >
          <path d="M6 0 C10 4 11 10 6 16 C1 10 2 4 6 0 Z" fill={f.i % 2 ? '#f0b429' : '#d9641e'} />
          <path d="M6 2 L6 15" stroke="#1a1206" strokeWidth="0.8" />
        </svg>
      ))}
    </span>
  )
}

/* ── Check cell ──────────────────────────────────────────────────────────── */
export function Check({ on, na, onToggle, label }: { on: boolean; na?: boolean; onToggle: () => void; label: string }) {
  const [burst, setBurst] = useState(0)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      data-on={on ? 'true' : 'false'}
      data-na={na ? 'true' : 'false'}
      className="ph-check"
      onClick={() => {
        if (na) return
        if (!on) setBurst(Date.now())
        onToggle()
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5 L6.5 12 L13 4.5" />
      </svg>
      <FeatherBurst seed={burst} />
    </button>
  )
}

/* ── Pheasant mark (SVG, used in nav/footer) ─────────────────────────────── */
export function PheasantMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ph-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd36a" />
          <stop offset="100%" stopColor="#d9641e" />
        </linearGradient>
      </defs>
      <g fill="url(#ph-mark)">
        <path d="M4 46 C14 40 22 38 30 36 L22 44 L12 50 Z" />
        <path d="M6 52 C16 48 24 44 30 40 L26 48 L14 56 Z" opacity="0.8" />
        <ellipse cx="38" cy="34" rx="14" ry="8" />
        <path d="M47 30 C50 24 52 20 54 18 C58 16 60 18 60 20 L56 22 C56 26 54 30 50 34 Z" />
        <path d="M28 30 C32 22 40 18 46 22 C42 24 36 26 30 32 Z" opacity="0.85" />
      </g>
      <circle cx="56.5" cy="19.5" r="1.3" fill="#1a1206" />
    </svg>
  )
}
