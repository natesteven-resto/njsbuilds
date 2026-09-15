'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X, SkipBack, SkipForward, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Clip } from '@/types/filmroom'
import { normalizeDrawingData } from '@/types/filmroom'
import type { DrawingData } from '@/app/filmroom/components/DrawingOverlay'

// ── Drawing replay on a read-only canvas ─────────────────────────────────────
// Renders saved DrawingData shapes scaled to current canvas size.
function DrawingReplay({ data, className }: { data: DrawingData; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.shapes.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = canvas.width  / (data.width  || 1280)
    const scaleY = canvas.height / (data.height || 720)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const s of data.shapes) {
      ctx.save()
      ctx.strokeStyle = s.color || '#FF3B30'
      ctx.fillStyle   = s.color || '#FF3B30'
      ctx.lineWidth   = (s.strokeWidth || 3) * Math.min(scaleX, scaleY)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'

      if (s.tool === 'freehand' && s.points && s.points.length >= 4) {
        ctx.beginPath()
        ctx.moveTo(s.points[0] * scaleX, s.points[1] * scaleY)
        for (let i = 2; i < s.points.length; i += 2) {
          ctx.lineTo(s.points[i] * scaleX, s.points[i + 1] * scaleY)
        }
        ctx.stroke()
      } else if ((s.tool === 'line' || s.tool === 'arrow') && s.x1 != null) {
        const x1 = s.x1 * scaleX, y1 = (s.y1 ?? 0) * scaleY
        const x2 = (s.x2 ?? 0) * scaleX, y2 = (s.y2 ?? 0) * scaleY
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        if (s.tool === 'arrow') {
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const head  = Math.min(20, (s.strokeWidth || 3) * 4) * Math.min(scaleX, scaleY)
          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
          ctx.closePath(); ctx.fill()
        }
      } else if (s.tool === 'circle' && s.x1 != null && s.x2 != null) {
        const rx = Math.abs((s.x2 - s.x1) / 2) * scaleX
        const ry = Math.abs(((s.y2 ?? 0) - (s.y1 ?? 0)) / 2) * scaleY
        const cx = (s.x1 + s.x2) / 2 * scaleX
        const cy = ((s.y1 ?? 0) + (s.y2 ?? 0)) / 2 * scaleY
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
      } else if (s.tool === 'text' && s.text && s.x1 != null) {
        ctx.font = `bold ${(14 + (s.strokeWidth || 3) * 2) * Math.min(scaleX, scaleY)}px sans-serif`
        ctx.fillText(s.text, s.x1 * scaleX, (s.y1 ?? 0) * scaleY)
      }
      ctx.restore()
    }
  }, [data])

  if (!data.shapes.length) return null
  return (
    <canvas ref={canvasRef} width={1280} height={720}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`}
      aria-hidden />
  )
}

// ── Presentation mode ────────────────────────────────────────────────────────
// Single-clip or playlist presentation: minimal chrome, coaching note,
// prev/next, keyboard + touch, optional drawing replay.
export interface PresentationClip {
  clip: Clip
  gameId: string
  src: string // pre-fetched signed URL
}

interface PresentationModeProps {
  clips: PresentationClip[]
  initialIdx?: number
  onExit: () => void
}

export function PresentationMode({ clips, initialIdx = 0, onExit }: PresentationModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [idx, setIdx]           = useState(initialIdx)
  const [playing, setPlaying]   = useState(false)
  const [showChrome, setShowChrome] = useState(true)
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const firedEndRef = useRef(false)

  const current = clips[idx]
  const clip    = current?.clip

  // Hide chrome after 3s of inactivity
  const resetChromeTimer = useCallback(() => {
    setShowChrome(true)
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current)
    chromeTimerRef.current = setTimeout(() => setShowChrome(false), 3000)
  }, [])

  useEffect(() => {
    resetChromeTimer()
    return () => { if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current) }
  }, [resetChromeTimer])

  // Load and seek when clip changes
  useEffect(() => {
    const v = videoRef.current
    if (!v || !current) return
    firedEndRef.current = false
    v.src = current.src
    v.load()
    const onMeta = () => {
      v.currentTime = clip.start_time_ms / 1000
      v.play().then(() => setPlaying(true)).catch(() => {})
    }
    v.addEventListener('loadedmetadata', onMeta)
    return () => v.removeEventListener('loadedmetadata', onMeta)
  }, [idx, current, clip?.start_time_ms])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !clip) return
    if (v.currentTime * 1000 >= clip.end_time_ms - 80 && !firedEndRef.current) {
      firedEndRef.current = true
      v.pause(); setPlaying(false)
      if (idx < clips.length - 1) setTimeout(() => setIdx(i => i + 1), 400)
    }
  }, [clip, idx, clips.length])

  const playPause = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }, [])

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIdx(i => Math.min(clips.length - 1, i + 1)), [clips.length])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      resetChromeTimer()
      switch (e.key) {
        case 'Escape': onExit(); break
        case ' ': e.preventDefault(); playPause(); break
        case 'ArrowLeft':  case 'j': case 'J': prev(); break
        case 'ArrowRight': case 'l': case 'L': next(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExit, playPause, prev, next, resetChromeTimer])

  // Touch swipe (horizontal)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) { resetChromeTimer(); return }
    if (dx < 0) next(); else prev()
  }

  const drawingData = clip?.drawing_data ? normalizeDrawingData(clip.drawing_data) : null

  if (!current || !clip) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onPointerMove={resetChromeTimer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={resetChromeTimer}
    >
      {/* Video + drawing overlay */}
      <div className="relative flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="max-h-full max-w-full object-contain"
          style={{ width: '100%', height: '100%' }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { if (idx < clips.length - 1) setIdx(i => i + 1) }}
          playsInline controls={false}
        />
        {/* Freeze-frame drawing replay — shown at clip start while seeking */}
        {drawingData && <DrawingReplay data={drawingData} />}

        {/* Tap-to-play overlay */}
        <div className="absolute inset-0" onClick={playPause} aria-hidden />
      </div>

      {/* Chrome overlay — fades out after inactivity */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{ opacity: showChrome ? 1 : 0 }}
        aria-hidden={!showChrome}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-4 py-3 pointer-events-auto"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
          <button onClick={onExit}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.80)' }} aria-label="Exit presentation">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-white">{clip.title}</p>
            {clip.coaching_note && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>{clip.coaching_note}</p>
            )}
          </div>
          <span className="text-xs tabular-nums shrink-0" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {idx + 1} / {clips.length}
          </span>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-5 pointer-events-auto"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
          <button onClick={prev} disabled={idx === 0}
            className="p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
            style={{ color: 'white' }} aria-label="Previous clip">
            <SkipBack className="w-6 h-6" />
          </button>
          <button onClick={playPause}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#c66a3e', color: '#181917' }}
            aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </button>
          <button onClick={next} disabled={idx === clips.length - 1}
            className="p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
            style={{ color: 'white' }} aria-label="Next clip">
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Swipe hint (touch) */}
        <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-8 pointer-events-none">
          {idx > 0 && <ChevronLeft className="w-5 h-5 opacity-30 text-white" />}
          {idx < clips.length - 1 && <ChevronRight className="w-5 h-5 opacity-30 text-white" />}
        </div>
      </div>
    </div>
  )
}
