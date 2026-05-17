'use client'

import { useState, useEffect, useRef, CSSProperties } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const CONFIG = {
  momName: 'Luna',
  momAge: '3 years',
  momWeight: '62 lbs',
  momDescription:
    'A stunning charcoal-silver Labrador with an incredibly gentle disposition. Luna is OFA-certified for hips, elbows, and eyes. She loves water, is highly trainable, and adores children.',

  dadName: 'Duke',
  dadRegistration: 'AKC Registered',
  dadDescription:
    'An AKC-registered silver Labrador with champion bloodlines. OFA Excellent hips, clear elbows and eyes. 85 lbs of pure Labrador personality.',

  expectedDate: 'May 30, 2026',
  litterSize: '8–10 puppies',
  colors: ['Silver', 'Charcoal', 'Champagne'],
  price: '$1,800',
  depositAmount: '$300',
  location: 'Kansas',
  contactPhone: '(316) 555-0100',

  // YouTube Live: paste your video ID here when ready
  streamType: 'youtube' as 'youtube' | 'twitch' | 'none',
  youtubeVideoId: '',

  puppies: [
    { id: 1, sex: 'M', color: 'Silver',    status: 'available' as const, name: '' },
    { id: 2, sex: 'M', color: 'Silver',    status: 'available' as const, name: '' },
    { id: 3, sex: 'M', color: 'Charcoal',  status: 'available' as const, name: '' },
    { id: 4, sex: 'M', color: 'Champagne', status: 'available' as const, name: '' },
    { id: 5, sex: 'F', color: 'Silver',    status: 'available' as const, name: '' },
    { id: 6, sex: 'F', color: 'Silver',    status: 'available' as const, name: '' },
    { id: 7, sex: 'F', color: 'Charcoal',  status: 'available' as const, name: '' },
    { id: 8, sex: 'F', color: 'Champagne', status: 'available' as const, name: '' },
  ],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

type Status = 'available' | 'reserved' | 'sold'

const colorDot: Record<string, string> = {
  Silver: 'bg-slate-300',
  Charcoal: 'bg-slate-500',
  Champagne: 'bg-amber-200',
}

const colorGlow: Record<string, string> = {
  Silver: 'shadow-slate-400/20',
  Charcoal: 'shadow-slate-600/20',
  Champagne: 'shadow-amber-300/20',
}

function statusInfo(s: Status) {
  if (s === 'available') return { label: 'Available', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' }
  if (s === 'reserved')  return { label: 'Reserved',  cls: 'text-amber-400  border-amber-500/40  bg-amber-500/10'  }
  return                        { label: 'Sold',       cls: 'text-red-400    border-red-500/40    bg-red-500/10'    }
}

// ─── REUSABLE REVEAL ──────────────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  y = 40,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, born: false })
  useEffect(() => {
    const target = new Date(targetDate).getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0, born: true }); return }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        born: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (t.born) return (
    <div className="text-center">
      <p className="text-4xl font-black text-emerald-400 tracking-tight">They&apos;re Here</p>
      <p className="text-slate-500 mt-2 text-sm tracking-widest uppercase">Watch the live feed</p>
    </div>
  )

  return (
    <div className="flex gap-4 justify-center">
      {[['Days', t.d], ['Hrs', t.h], ['Min', t.m], ['Sec', t.s]].map(([label, val]) => (
        <div key={label as string} className="flex flex-col items-center gap-1.5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm" />
            <span className="relative text-3xl font-black text-white tabular-nums">
              {String(val).padStart(2, '0')}
            </span>
          </div>
          <span className="text-slate-600 text-xs font-semibold tracking-[0.2em] uppercase">{label as string}</span>
        </div>
      ))}
    </div>
  )
}

// ─── STREAM EMBED ─────────────────────────────────────────────────────────────

function StreamEmbed() {
  const { streamType, youtubeVideoId } = CONFIG
  if (!youtubeVideoId || streamType === 'none') return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/5">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(100,116,139,0.08)_0%,_transparent_70%)]" />
        {/* scan lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)',
        }} />
      </div>
      <div className="relative z-10 text-center px-6">
        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-5 bg-white/5">
          <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <p className="text-slate-300 font-semibold text-lg mb-2">Puppy Cam — Coming Soon</p>
        <p className="text-slate-600 text-sm max-w-xs mx-auto">Goes live the moment they arrive. 24 hours a day, 7 days a week.</p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 text-slate-500 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Live stream · No subscription required
        </div>
      </div>
    </div>
  )

  if (streamType === 'twitch') return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
      <iframe
        src={`https://player.twitch.tv/?channel=${youtubeVideoId}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'restoreports.com'}&autoplay=true&muted=true`}
        className="w-full h-full" allowFullScreen
      />
    </div>
  )

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=1&modestbranding=1`}
        className="w-full h-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// ─── PUPPY CARD ───────────────────────────────────────────────────────────────

function PuppyCard({ puppy, index }: { puppy: typeof CONFIG.puppies[0]; index: number }) {
  const { label, cls } = statusInfo(puppy.status)
  const dot = colorDot[puppy.color] ?? 'bg-slate-400'
  const glow = colorGlow[puppy.color] ?? ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/20 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 shadow-xl ${glow}`}
    >
      {/* color swatch */}
      <div className={`w-full h-24 rounded-xl ${dot} opacity-20 group-hover:opacity-30 transition-opacity`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-bold text-lg leading-none">
            {puppy.name || `Puppy ${puppy.id}`}
          </p>
          <p className="text-slate-500 text-sm mt-1">{puppy.sex === 'M' ? 'Male' : 'Female'} · {puppy.color}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
      </div>

      {puppy.status === 'available' && (
        <a
          href={`sms:${CONFIG.contactPhone.replace(/\D/g, '')}`}
          className="mt-auto w-full text-center py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-semibold text-sm transition-all"
        >
          Inquire →
        </a>
      )}
    </motion.div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Reveal delay={index * 0.05}>
      <div className="border-b border-white/[0.06] last:border-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between py-5 text-left group"
        >
          <span className="text-slate-200 font-medium group-hover:text-white transition-colors pr-6">{q}</span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-500 text-2xl leading-none flex-shrink-0"
          >
            +
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="pb-5 text-slate-500 text-sm leading-relaxed">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

// ─── CONTACT MODAL ────────────────────────────────────────────────────────────

function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('Inquiry:', form)
    setSent(true)
    setTimeout(() => onClose(), 3000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }}
        className="bg-slate-950 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        {sent ? (
          <div className="text-center py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-5xl mb-5">✅</motion.div>
            <h3 className="text-2xl font-black mb-2">Message Received</h3>
            <p className="text-slate-500">We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black">Reserve a Puppy</h3>
                <p className="text-slate-500 text-sm mt-1">{CONFIG.depositAmount} deposit holds your spot</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { key: 'name', label: 'Your name', type: 'text', required: true },
                { key: 'phone', label: 'Phone number', type: 'tel', required: true },
                { key: 'email', label: 'Email (optional)', type: 'email', required: false },
              ].map(f => (
                <input
                  key={f.key}
                  required={f.required}
                  type={f.type}
                  placeholder={f.label}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all"
                />
              ))}
              <textarea
                rows={3}
                placeholder="Any preferences? (male/female, color, questions…)"
                value={form.message}
                onChange={e => setForm(s => ({ ...s, message: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all resize-none"
              />
              <button
                type="submit"
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-colors text-base tracking-wide mt-2"
              >
                Send Inquiry
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PuppiesPage() {
  const [contactOpen, setContactOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'M' | 'F'>('all')
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const available = CONFIG.puppies.filter(p => p.status === 'available').length
  const filtered = CONFIG.puppies.filter(p => tab === 'all' || p.sex === tab)

  return (
    <div className="min-h-screen bg-[#070809] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">

        {/* deep atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050607] via-[#0a0d12] to-[#070809]" />

        {/* radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_rgba(148,163,184,0.07)_0%,_transparent_70%)]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />

        {/* giant background word */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <span className="text-[20vw] font-black text-white/[0.02] tracking-tighter whitespace-nowrap">
            SILVER
          </span>
        </motion.div>

        {/* horizontal lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-full border-t border-white/[0.02]" style={{ top: `${(i + 1) * (100 / 7)}%` }} />
          ))}
        </div>

        {/* hero content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center max-w-4xl mx-auto px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-12 bg-amber-500/50" />
            <span className="text-amber-500/80 text-xs font-bold tracking-[0.4em] uppercase">
              AKC Registered · {CONFIG.location}
            </span>
            <div className="h-px w-12 bg-amber-500/50" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-8xl font-black tracking-tight leading-none mb-6"
          >
            Silver Lab
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-amber-200 to-slate-300">
              Puppies
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="text-slate-400 text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Health-tested. Champion bloodlines. Raised in our home with love.<br />
            <span className="text-slate-500">Arriving {CONFIG.expectedDate}.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => setContactOpen(true)}
              className="group px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-full transition-all duration-300 text-base tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02]"
            >
              Reserve a Puppy
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </button>
            <a
              href="#live"
              className="px-10 py-4 border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-semibold rounded-full transition-all duration-300 backdrop-blur-sm bg-white/[0.03] hover:bg-white/[0.07]"
            >
              Watch Live 🎥
            </a>
          </motion.div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-slate-700 text-xs tracking-[0.3em] uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── STATS TICKER ─────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] py-4 overflow-hidden bg-white/[0.01]">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex gap-12 whitespace-nowrap w-max"
        >
          {[...Array(2)].map((_, copy) => (
            <div key={copy} className="flex gap-12 text-slate-600 text-xs tracking-widest uppercase font-medium">
              {[
                `✦ AKC Registered`,
                `✦ OFA Health Tested`,
                `✦ ${CONFIG.price}`,
                `✦ ${CONFIG.depositAmount} Deposit`,
                `✦ ${available} Spots Available`,
                `✦ 2-Year Health Guarantee`,
                `✦ ${CONFIG.location}`,
                `✦ 24/7 Live Puppy Cam`,
                `✦ Arriving ${CONFIG.expectedDate}`,
              ].map(item => <span key={item}>{item}</span>)}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── COUNTDOWN ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-slate-600 text-xs tracking-[0.4em] uppercase mb-8">Estimated arrival</p>
            <CountdownTimer targetDate={CONFIG.expectedDate} />
          </Reveal>
        </div>
      </section>

      {/* ── LIVE CAM ─────────────────────────────────────────────────────── */}
      <section id="live" className="py-10 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-8">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">Live Feed</p>
                <h2 className="text-4xl font-black tracking-tight">Puppy Cam</h2>
              </div>
              {CONFIG.youtubeVideoId && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/50">
              {/* broadcast overlay UI */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
                <div className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded border border-white/10 text-white/50 text-xs font-mono">
                  CAM 01 · WHELPING BOX
                </div>
              </div>
              <StreamEmbed />
            </div>
            <p className="text-slate-700 text-xs text-center mt-4 tracking-wide">
              Stream runs 24 hours a day · No login required
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── PARENTS ──────────────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent" />
        <div className="max-w-5xl mx-auto px-6 relative">
          <Reveal className="mb-14">
            <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">Bloodline</p>
            <h2 className="text-4xl font-black tracking-tight">Meet the Parents</h2>
            <p className="text-slate-500 mt-2">Health-tested. Temperament-tested. Raised in our home.</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                role: 'Mother',
                roleColor: 'text-rose-400',
                name: CONFIG.momName,
                sub: `${CONFIG.momAge} · ${CONFIG.momWeight}`,
                desc: CONFIG.momDescription,
                certs: ['OFA Hips', 'OFA Elbows', 'CAER Eyes'],
                delay: 0,
              },
              {
                role: 'Father',
                roleColor: 'text-sky-400',
                name: CONFIG.dadName,
                sub: CONFIG.dadRegistration,
                desc: CONFIG.dadDescription,
                certs: ['OFA Excellent', 'Clear Elbows', 'CAER Clear'],
                delay: 0.1,
              },
            ].map(parent => (
              <Reveal key={parent.name} delay={parent.delay}>
                <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.14] rounded-3xl p-7 transition-all duration-500 overflow-hidden">
                  {/* glow */}
                  <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-amber-500/5" />

                  {/* photo placeholder */}
                  <div className="w-full h-52 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 overflow-hidden">
                    <span className="text-6xl opacity-20">🐕</span>
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs font-black uppercase tracking-[0.25em] ${parent.roleColor}`}>{parent.role}</span>
                      <h3 className="text-2xl font-black mt-1">{parent.name}</h3>
                      <p className="text-slate-600 text-sm mt-0.5">{parent.sub}</p>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed mb-5">{parent.desc}</p>

                  <div className="flex flex-wrap gap-2">
                    {parent.certs.map(c => (
                      <span key={c} className="text-xs px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-slate-400">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AVAILABILITY ─────────────────────────────────────────────────── */}
      <section id="availability" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">The Litter</p>
                <h2 className="text-4xl font-black tracking-tight">Availability</h2>
                <p className="text-slate-500 mt-2">{available} of {CONFIG.puppies.length} spots open · {CONFIG.depositAmount} holds your puppy</p>
              </div>
              <div className="flex gap-2 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                {(['all', 'M', 'F'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      tab === t ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'M' ? 'Males' : 'Females'}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((p, i) => <PuppyCard key={p.id} puppy={p} index={i} />)}
          </div>

          <div className="flex flex-wrap gap-5 justify-center mt-10">
            {CONFIG.colors.map(c => (
              <div key={c} className="flex items-center gap-2.5 text-slate-500 text-sm">
                <span className={`w-3 h-3 rounded-full ${colorDot[c]} opacity-70`} />
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-14">
            <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">Why Choose Us</p>
            <h2 className="text-4xl font-black tracking-tight">What You Get</h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🏆', title: 'AKC Registered', desc: 'Full AKC registration included. Champion bloodlines on both sides.' },
              { icon: '🩺', title: '2-Year Health Guarantee', desc: 'We guarantee against genetic defects for 2 years. OFA-certified parents.' },
              { icon: '🏡', title: 'Home Raised', desc: 'Raised in our home from day one — exposed to children, sounds, and real life.' },
              { icon: '💉', title: 'Vet Checked & Vaccinated', desc: 'Age-appropriate vaccinations, deworming, and vet check before going home.' },
              { icon: '🤝', title: 'Lifetime Support', desc: "Questions about training, health, or food — we're always a call away." },
              { icon: '📦', title: 'Full Puppy Pack', desc: "Starter food, vet records, AKC paperwork, and a blanket with mom's scent." },
            ].map(({ icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-300 h-full">
                  <div className="text-3xl mb-4">{icon}</div>
                  <h3 className="font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-6">
          <Reveal className="mb-12 text-center">
            <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">FAQ</p>
            <h2 className="text-4xl font-black tracking-tight">Common Questions</h2>
          </Reveal>

          <div>
            {[
              { q: 'How do I reserve a puppy?', a: `A ${CONFIG.depositAmount} non-refundable deposit holds your puppy. Contact us by phone or use the inquiry form. Deposits are taken in order of inquiry.` },
              { q: 'When can puppies go home?', a: 'Puppies go home at 8 weeks old — that would be around late July 2026.' },
              { q: 'Do you ship?', a: 'We prefer in-person pickup so you can meet the parents. Nanny flights may be considered on a case-by-case basis.' },
              { q: 'Are silver Labs actually purebred?', a: "Yes. Silver Labradors are dilute chocolate Labs — a recessive gene that's always existed in the breed. Our dogs are AKC-registered as Chocolate Labrador Retrievers." },
              { q: 'Can I visit before the puppies arrive?', a: 'Absolutely. We encourage it. Contact us to schedule a time to meet Luna.' },
              { q: 'What does the price include?', a: 'AKC registration, first vet check, age-appropriate vaccines, deworming, microchip, and the full puppy pack.' },
            ].map((item, i) => <FAQItem key={i} {...item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,_rgba(245,158,11,0.06)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-transparent to-[#070809]" />

        <Reveal className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="w-16 h-px bg-amber-500/40 mx-auto mb-10" />
          <h2 className="text-5xl font-black tracking-tight mb-4">
            Ready to Bring<br />One Home?
          </h2>
          <p className="text-slate-500 mb-10 text-lg">
            {available > 0
              ? `${available} puppies still available. Spots go fast.`
              : 'Join the waitlist for our next litter.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setContactOpen(true)}
              className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-full transition-all duration-300 text-base shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02]"
            >
              Reserve a Puppy →
            </button>
            <a
              href={`tel:${CONFIG.contactPhone.replace(/\D/g, '')}`}
              className="px-10 py-4 border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-semibold rounded-full transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.05]"
            >
              📞 {CONFIG.contactPhone}
            </a>
          </div>
          <div className="w-16 h-px bg-amber-500/40 mx-auto mt-10" />
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-white/[0.04] text-center text-slate-700 text-sm">
        <p className="tracking-wide">Silver Lab Puppies · {CONFIG.location}</p>
        <p className="mt-1">{CONFIG.contactPhone}</p>
        <p className="mt-3 text-slate-800">© {new Date().getFullYear()} — All rights reserved</p>
      </footer>

      {/* ── MODAL ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
