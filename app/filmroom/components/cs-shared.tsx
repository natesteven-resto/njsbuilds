'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Film, ListVideo, Users, Loader2 } from 'lucide-react'

export function gameSeason(date: string): string {
  const d = new Date(date.slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return 'Unassigned'
  const y = d.getFullYear()
  return d.getMonth() >= 8 ? `${y}–${String(y + 1).slice(2)}` : `${y - 1}–${String(y).slice(2)}`
}
export function formatGameDate(date: string): string {
  const d = new Date(date.slice(0, 10) + 'T12:00:00')
  return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Frames come from the caller's authorized signed stream. They stay in this
// mounted canvas only, with no persistent cache or public thumbnail URL.
export function VideoThumbnail({ gameId, className }: { gameId: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const abort = new AbortController()
    let started = false, cancelled = false, media: HTMLVideoElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    setState('idle')
    const release = () => {
      clearTimeout(timer)
      if (media) {
        media.onloadedmetadata = null; media.onseeked = null; media.onerror = null
        media.pause(); media.removeAttribute('src'); media.load(); media = null
      }
    }
    const fail = () => { if (!cancelled) setState('error'); release() }
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || started) return
      started = true; observer.disconnect(); setState('loading')
      try {
        const r = await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`, { signal: abort.signal })
        if (!r.ok) throw new Error('Thumbnail unavailable')
        const data = await r.json()
        if (cancelled) return
        if (typeof data.src !== 'string') throw new Error('No source')
        media = document.createElement('video')
        media.preload = 'metadata'; media.muted = true; media.playsInline = true
        media.crossOrigin = 'anonymous'
        media.onloadedmetadata = () => {
          if (!media || !Number.isFinite(media.duration) || media.duration <= 0) { fail(); return }
          media.currentTime = Math.min(4, media.duration * .15)
        }
        media.onseeked = () => {
          const canvas = canvasRef.current
          if (!cancelled && canvas && media && media.videoWidth > 0) {
            canvas.width = Math.min(960, media.videoWidth)
            canvas.height = Math.round(canvas.width * media.videoHeight / media.videoWidth)
            const context = canvas.getContext('2d')
            if (!context) { fail(); return }
            context.drawImage(media, 0, 0, canvas.width, canvas.height)
            setState('done')
          }
          release()
        }
        media.onerror = fail
        timer = setTimeout(fail, 25000)
        media.src = data.src; media.load()
      } catch { if (!cancelled) fail() }
    }, { rootMargin: '100px' })
    observer.observe(el)
    return () => { cancelled = true; abort.abort(); observer.disconnect(); release() }
  }, [gameId])
  return <div ref={containerRef} className={`relative overflow-hidden bg-[#111210] ${className ?? ''}`}>
    <canvas ref={canvasRef} className="h-full w-full object-cover" style={{ visibility: state === 'done' ? 'visible' : 'hidden' }} aria-hidden />
    {state !== 'done' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#aaa89f]">
      {state === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <Film className="h-7 w-7" aria-hidden />}
      <span className="text-xs">{state === 'loading' ? 'Loading preview' : 'Film ready'}</span>
    </div>}
  </div>
}

export function CsNav({ active }: { active: 'library' | 'playlists' | 'players' | 'clips' }) {
  return <nav className="flex items-center gap-1" aria-label="Film Room navigation">
    {([
      ['library', '/filmroom', 'Library', Film],
      ['playlists', '/filmroom/playlists', 'Playlists', ListVideo],
      ['players', '/filmroom/players', 'Players', Users],
      ['clips', '/filmroom/clips', 'Clips', Film],
    ] as const).map(([key, href, label, Icon]) => <Link key={key} href={href} aria-current={active === key ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-1 border-b-2 px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e49269] ${active === key ? 'border-[#c66a3e] text-[#eee9df]' : 'border-transparent text-[#aaa89f] hover:text-[#eee9df]'}`}>
      <Icon className="h-4 w-4" aria-hidden />{label}
    </Link>)}
  </nav>
}
export function CsHeader({ active, right }: { active: 'library' | 'playlists' | 'players' | 'clips'; right?: React.ReactNode }) {
  return <header className="sticky top-0 z-40 border-b border-[#eee9df]/10 bg-[#181917]">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 px-4 py-2 sm:px-8">
      <Link href="/filmroom" className="order-1 flex min-h-11 shrink-0 items-center gap-2 text-[#eee9df] focus-visible:outline-2 focus-visible:outline-[#e49269]">
        <Film className="h-6 w-6 text-[#c66a3e]" aria-hidden />
        <span className="text-2xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-bc, sans-serif)' }}>Film Room</span>
      </Link>
      <div className="order-3 w-full md:order-2 md:w-auto"><CsNav active={active} /></div>
      <div className="order-2 ml-auto flex min-w-0 items-center md:order-3">{right}</div>
    </div>
  </header>
}
