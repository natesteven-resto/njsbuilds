'use client'

import { useState, useEffect, useRef, CSSProperties } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const CONFIG = {
  momName: 'Sage',
  momAge: '6 years',
  momAKC: 'SS14491101',
  momDescription:
    'American-type Silver Lab — lean, athletic, and highly trainable with an incredibly gentle disposition. She loves water and adores children.',

  dadName: 'Duke',
  dadRegistration: 'AKC #SS23912504',
  dadDescription:
    'English-type Silver Lab — blocky build, calm temperament, and 85 lbs of pure Labrador personality. Bold, gentle, and built for the show ring.',

  expectedDate: 'May 30, 2026',
  goHomeDate: 'July 18, 2026',
  litterSize: '7 puppies',
  estimatedPuppies: 7,
  colors: ['Silver', 'Charcoal'],
  litter: [
    { color: 'Silver',   sex: 'Female', reserved: true,  collar: 'Gold',   collarHex: '#f59e0b' },
    { color: 'Silver',   sex: 'Female', reserved: true,  collar: 'Purple', collarHex: '#a855f7' },
    { color: 'Charcoal', sex: 'Male',   reserved: true,  collar: 'Blue',   collarHex: '#3b82f6' },
    { color: 'Charcoal', sex: 'Female', reserved: false, collar: '',        collarHex: '' },
    { color: 'Charcoal', sex: 'Female', reserved: false, collar: '',        collarHex: '' },
    { color: 'Charcoal', sex: 'Male',   reserved: false, collar: '',        collarHex: '' },
    { color: 'Charcoal', sex: 'Female', reserved: false, collar: '',        collarHex: '' },
  ],
  price: '$1,000',
  depositAmount: '$300',
  location: 'Kansas',
  contactPhone: '(316) 617-4855',

  // YouTube Live: channel ID auto-detects current live stream
  streamType: 'youtube' as 'youtube' | 'twitch' | 'none',
  youtubeVideoId: 'rdWdFNhNPJM',
  youtubeChannelId: 'UCL-gUi48gxBCadGyV-ujL7w',


}

// ─── HELPERS ──────────────────────────────────────────────────────────────────



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
        src={`https://www.youtube.com/embed/live_stream?channel=${CONFIG.youtubeChannelId}&autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&origin=https://njsbuilds.com`}
        className="w-full h-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}


// ─── GALLERY ─────────────────────────────────────────────────────────────────

// Add puppy photo paths here as they arrive, e.g. '/puppies/gallery/photo1.jpg'
const GALLERY_IMAGES: string[] = [
  '/puppies/gallery/gallery1.jpg',
  '/puppies/gallery/gallery2.jpg',
  '/puppies/gallery/gallery3.jpg',
  '/puppies/gallery/gallery4.jpg',
  '/puppies/gallery/gallery5.jpg',
]

function GalleryLightbox({ images, index, onClose, onPrev, onNext }: {
  images: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all text-2xl z-10"
      >×</button>

      {/* Prev */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/60 hover:text-white hover:border-white/30 transition-all text-xl z-10"
      >‹</button>

      {/* Image */}
      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        src={images[index]}
        alt={`Puppy photo ${index + 1}`}
        className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
      />

      {/* Next */}
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/60 hover:text-white hover:border-white/30 transition-all text-xl z-10"
      >›</button>

      {/* Counter */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-slate-600 text-xs tracking-widest">
        {index + 1} / {images.length}
      </p>
    </motion.div>
  )
}

function PuppyGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (GALLERY_IMAGES.length === 0) return null

  const open = (i: number) => setLightboxIndex(i)
  const close = () => setLightboxIndex(null)
  const prev = () => setLightboxIndex(i => i === null ? null : (i - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)
  const next = () => setLightboxIndex(i => i === null ? null : (i + 1) % GALLERY_IMAGES.length)

  return (
    <section className="py-10 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal className="mb-8">
          <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">Photos</p>
          <h2 className="text-4xl font-black tracking-tight">The Litter</h2>
          <p className="text-slate-500 mt-2 text-sm">{GALLERY_IMAGES.length} photos · Click to enlarge</p>
        </Reveal>

        <div className="columns-2 sm:columns-3 gap-3 space-y-3">
          {GALLERY_IMAGES.map((src, i) => (
            <Reveal key={src} delay={i * 0.03}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative cursor-pointer rounded-2xl overflow-hidden border border-white/[0.06] break-inside-avoid"
                onClick={() => open(i)}
              >
                <img
                  src={src}
                  alt={`Puppy ${i + 1}`}
                  className="w-full object-cover"
                  style={{ display: 'block' }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200" />
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <GalleryLightbox
            images={GALLERY_IMAGES}
            index={lightboxIndex}
            onClose={close}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

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
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    sexPref: 'Either', colorPref: 'No preference', notes: ''
  })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/puppies/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setSent(true)
      setTimeout(() => onClose(), 4000)
    } catch {
      setError('Something went wrong. Please try again or call us directly.')
    }
    setLoading(false)
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
        className="bg-slate-950 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {sent ? (
          <div className="text-center py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-5xl mb-5">🐾</motion.div>
            <h3 className="text-2xl font-black mb-2">You&apos;re on the list!</h3>
            <p className="text-slate-500">We&apos;ll reach out once the puppies arrive. Thank you!</p>
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
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="text"
                  placeholder="First name *"
                  value={form.firstName}
                  onChange={e => setForm(s => ({ ...s, firstName: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={e => setForm(s => ({ ...s, lastName: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <input
                required
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.sexPref}
                  onChange={e => setForm(s => ({ ...s, sexPref: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                >
                  <option value="Either">Either sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select
                  value={form.colorPref}
                  onChange={e => setForm(s => ({ ...s, colorPref: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                >
                  <option value="No preference">Any color</option>
                  <option value="Silver">Silver</option>
                  <option value="Charcoal">Charcoal</option>
                </select>
              </div>
              <textarea
                rows={3}
                placeholder="Any questions or notes? (optional)"
                value={form.notes}
                onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black rounded-xl transition-colors text-base tracking-wide mt-2"
              >
                {loading ? 'Submitting...' : 'Reserve My Spot →'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

// ─── KEN BURNS SLIDESHOW ─────────────────────────────────────────────────────

const HERO_IMAGES = Array.from({ length: 14 }, (_, i) => `/puppies/hero${i + 1}.jpg`)

const KB_ANIMATIONS = [
  { from: 'scale(1.08) translate(-2%, -1%)',  to: 'scale(1.0) translate(0%, 0%)' },
  { from: 'scale(1.0) translate(0%, 0%)',    to: 'scale(1.08) translate(2%, 1%)' },
  { from: 'scale(1.06) translate(2%, -1%)',  to: 'scale(1.0) translate(-1%, 1%)' },
  { from: 'scale(1.0) translate(-1%, 1%)',   to: 'scale(1.07) translate(1%, -1%)' },
  { from: 'scale(1.05) translate(0%, 2%)',   to: 'scale(1.0) translate(0%, -1%)' },
]

const SLIDE_DURATION = 7000
const FADE_DURATION = 2000

function KenBurnsHero({ onReserve }: { onReserve: () => void }) {
  const [index, setIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(1)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setNextIndex(i => (i + 1) % HERO_IMAGES.length)
      setTransitioning(true)
      setTimeout(() => {
        setIndex(i => (i + 1) % HERO_IMAGES.length)
        setTransitioning(false)
      }, FADE_DURATION)
    }, SLIDE_DURATION)
    return () => clearInterval(id)
  }, [])

  const kb = (idx: number) => KB_ANIMATIONS[idx % KB_ANIMATIONS.length]

  return (
    <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: '100svh' }}>
      {/* Base image — always visible, Ken Burns */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <img
          key={`base-${index}`}
          src={HERO_IMAGES[index]}
          alt="Silver Lab Puppies"
          className="absolute inset-0 w-full h-full object-cover object-[center_65%]"
          style={{ animation: `kenburns-${index % KB_ANIMATIONS.length} ${SLIDE_DURATION + FADE_DURATION}ms ease-in-out forwards` }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Next image — fades in on top */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 2,
          opacity: transitioning ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <img
          key={`next-${nextIndex}`}
          src={HERO_IMAGES[nextIndex]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_65%]"
          style={{ animation: `kenburns-${nextIndex % KB_ANIMATIONS.length} ${SLIDE_DURATION + FADE_DURATION}ms ease-in-out forwards` }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      <style>{`
        ${KB_ANIMATIONS.map((kb, i) => `
          @keyframes kenburns-${i} {
            from { transform: ${kb.from}; }
            to   { transform: ${kb.to}; }
          }
        `).join('')}
      `}</style>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 3 }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" style={{ zIndex: 3 }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" style={{ zIndex: 3 }} />

      {/* Hero content */}
      <motion.div
        style={{ zIndex: 10 }}
        className="relative text-center max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="h-px w-12 bg-amber-500/50" />
          <span className="text-amber-400/90 text-xs font-bold tracking-[0.4em] uppercase">
            AKC Registered · {CONFIG.location}
          </span>
          <div className="h-px w-12 bg-amber-500/50" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-8xl font-black tracking-tight leading-none mb-6"
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
          className="text-slate-300 text-base sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Family raised. AKC registered.<br />
          <span className="text-slate-400">Born {CONFIG.expectedDate} · {CONFIG.estimatedPuppies} Healthy Puppies</span>
          <br />
          <span className="text-amber-400/80">Goes home {CONFIG.goHomeDate}</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={onReserve}
            className="group w-full sm:w-auto px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-full transition-all duration-300 text-base tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02]"
          >
            Reserve a Puppy
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </button>
          <a
            href="#live"
            className="w-full sm:w-auto px-10 py-4 border border-white/20 hover:border-white/40 text-slate-200 hover:text-white font-semibold rounded-full transition-all duration-300 backdrop-blur-sm bg-white/[0.05] hover:bg-white/[0.10]"
          >
            Watch Live 🎥
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ zIndex: 10 }}
      >
        <span className="text-white/40 text-xs tracking-[0.3em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
        />
      </motion.div>

      {/* Image counter dots */}
      <div className="absolute bottom-10 right-8 flex gap-1.5" style={{ zIndex: 10 }}>
        {HERO_IMAGES.slice(0, 8).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full transition-all duration-500"
            style={{ background: i === index % 8 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}
          />
        ))}
      </div>
    </section>
  )
}

export default function PuppiesPage() {
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#070809] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <KenBurnsHero onReserve={() => setContactOpen(true)} />



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
                `✦ $1,000`,
                `✦ ${CONFIG.depositAmount} Deposit`,
                `✦ ${CONFIG.estimatedPuppies} Puppies Born`,
                `✦ ${CONFIG.location}`,
                `✦ 24/7 Live Puppy Cam`,
                `✦ Born ${CONFIG.expectedDate}`,
                `✦ Goes Home ${CONFIG.goHomeDate}`,
                `✦ 2 Silver Reserved · 1 Charcoal Reserved · 4 Charcoal Available`,`
              ].map(item => <span key={item}>{item}</span>)}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── COUNTDOWN ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-slate-600 text-xs tracking-[0.4em] uppercase mb-8">Born</p>
            <div className="text-center">
              <p className="text-4xl font-black text-emerald-400 tracking-tight">They&apos;re Here</p>
              <p className="text-slate-500 mt-2 text-sm tracking-widest uppercase">Born {CONFIG.expectedDate} · Watch the live feed</p>
              <p className="text-amber-400/70 mt-3 text-sm font-semibold tracking-widest uppercase">Goes home {CONFIG.goHomeDate}</p>
            </div>
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

      {/* ── GALLERY */}
      <PuppyGallery />

      {/* ── PARENTS — MMA POSTER ─────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        {/* Section header */}
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <Reveal className="mb-14">
            <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">Bloodline</p>
            <h2 className="text-4xl font-black tracking-tight">Meet the Parents</h2>
            <p className="text-slate-500 mt-2">AKC registered. Raised in our home.</p>
          </Reveal>
        </div>

        {/* Parent Cards */}
        <Reveal delay={0.1}>
          <div className="relative mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── SAGE ── */}
              <div className="flex flex-col">
                <div className="relative rounded-t-3xl overflow-hidden" style={{ height: 'clamp(300px, 75vw, 520px)' }}>
                  <img
                    src="/puppies/sage/sage_hero.jpg"
                    alt="Sage"
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.75) contrast(1.08)', transform: 'scaleX(-1)', objectPosition: '50% 30%' }}
                  />
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to right, rgba(4,5,6,0.92) 0%, transparent 55%), linear-gradient(to bottom, rgba(4,5,6,0.55) 0%, transparent 25%, rgba(4,5,6,0.75) 100%)'
                  }} />
                </div>
                <div className="bg-[#0a0c10] border border-white/[0.06] rounded-b-3xl px-6 py-5">
                  <p className="text-rose-400 text-xs font-black uppercase tracking-[0.4em] mb-1">Mother</p>
                  <h3 className="text-white font-black tracking-tight text-3xl" style={{ lineHeight: 1 }}>{CONFIG.momName}</h3>
                  <p className="text-slate-500 text-sm mt-1.5">Born Sept 15, 2019 · 6 years old · AKC #{CONFIG.momAKC}</p>

                  <p className="text-slate-500 text-sm leading-relaxed mt-4">{CONFIG.momDescription}</p>
                </div>
              </div>

              {/* ── DUKE ── */}
              <div className="flex flex-col">
                <div className="relative rounded-t-3xl overflow-hidden" style={{ height: 'clamp(300px, 75vw, 520px)' }}>
                  <img
                    src="/puppies/duke/duke_hero.jpg"
                    alt="Duke"
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.75) contrast(1.08)', objectPosition: '50% 48%' }}
                  />
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to left, rgba(4,5,6,0.92) 0%, transparent 55%), linear-gradient(to bottom, rgba(4,5,6,0.55) 0%, transparent 25%, rgba(4,5,6,0.75) 100%)'
                  }} />
                </div>
                <div className="bg-[#0a0c10] border border-white/[0.06] rounded-b-3xl px-6 py-5">
                  <p className="text-sky-400 text-xs font-black uppercase tracking-[0.4em] mb-1">Father</p>
                  <h3 className="text-white font-black tracking-tight text-3xl" style={{ lineHeight: 1 }}>{CONFIG.dadName}</h3>
                  <p className="text-slate-500 text-sm mt-1.5">Born Dec 9, 2020 · 5 years old · {CONFIG.dadRegistration}</p>

                  <p className="text-slate-500 text-sm leading-relaxed mt-4">{CONFIG.dadDescription}</p>
                </div>
              </div>

            </div>
          </div>
        </Reveal>
      </section>

      {/* ── AVAILABILITY ─────────────────────────────────────────────────── */}
      <section id="availability" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-10">
            <p className="text-slate-600 text-xs tracking-[0.3em] uppercase mb-2">The Litter</p>
            <h2 className="text-4xl font-black tracking-tight">Availability</h2>
            <p className="text-slate-500 mt-2">{CONFIG.estimatedPuppies} puppies · {CONFIG.depositAmount} holds your spot</p>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CONFIG.litter.map((pup, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div className={`border rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all ${
                  pup.reserved
                    ? 'bg-white/[0.01] border-white/[0.03] opacity-50'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}>
                  {/* Collar color dot */}
                  {pup.collar ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full ring-1 ring-white/20"
                        style={{ background: pup.collarHex }}
                      />
                      <span className="text-xs font-semibold" style={{ color: pup.collarHex }}>
                        {pup.collar} Collar
                      </span>
                    </div>
                  ) : (
                    <div className="h-[18px]" /> /* spacer so cards align */
                  )}
                  <span className="text-3xl">{pup.sex === 'Female' ? '🎀' : '🐾'}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    pup.reserved ? 'text-rose-400' : 'text-emerald-400'
                  }`}>{pup.reserved ? 'Reserved' : 'Available'}</span>
                  <span className="text-white text-sm font-semibold">{pup.color}</span>
                  <span className="text-slate-500 text-xs">{pup.sex}</span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="text-slate-600 text-xs text-center mt-8">
              2 Silver · 1 Charcoal Male (reserved) · 4 Charcoal available · {CONFIG.depositAmount} deposit reserves your spot
            </p>
          </Reveal>
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
              { icon: '🏆', title: 'AKC Registered', desc: 'Full AKC registration included with every puppy.' },
              { icon: '🏡', title: 'Home Raised', desc: 'Raised in our home from day one — exposed to children, sounds, and real life.' },
              { icon: '💉', title: 'Vet Checked & Vaccinated', desc: 'Age-appropriate vaccinations, deworming, and vet check before going home.' },

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
              { q: 'When can puppies go home?', a: `Puppies go home at 7 weeks old — ${CONFIG.goHomeDate}.` },
              { q: 'Do you ship?', a: 'No. In-person pickup only so you can meet the parents.' },
              { q: 'Are silver Labs actually purebred?', a: "Yes. Silver Labradors are dilute chocolate Labs — a recessive gene that's always existed in the breed. AKC registers them as Black or Chocolate Labrador Retrievers depending on the lineage." },
              { q: 'Can I visit before the puppies arrive?', a: 'Absolutely. We encourage it. Contact us to schedule a time to meet the parents.' },
              { q: 'Are these American or English Labs?', a: "Both — and that\'s intentional. Mom (Sage) is American-type: lean, athletic, and highly trainable. Dad (Duke) is English-type: blocky, calm, and easygoing. Crossing the two tends to produce puppies that carry the best of both — calmer temperament with the athleticism and drive that make Labs great family dogs and hunters." },
              { q: 'What does the price include?', a: 'AKC registration, first vet check, age-appropriate vaccines, and deworming.' },
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
            {`${CONFIG.estimatedPuppies} puppies born. Spots go fast.`}
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
