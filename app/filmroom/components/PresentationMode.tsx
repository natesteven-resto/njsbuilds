'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X, SkipBack, SkipForward, Play, Pause, Loader2, AlertCircle, Pencil } from 'lucide-react'
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
  const dialogRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chromeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)
  const [idx, setIdx] = useState(Math.min(initialIdx, clips.length - 1))
  const [playing, setPlaying] = useState(false)
  const [showChrome, setShowChrome] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [showDrawing, setShowDrawing] = useState(true)
  const [ratio, setRatio] = useState(16 / 9)
  const [box, setBox] = useState({width:0,height:0})
  const touchX = useRef<number | null>(null)
  const current = clips[idx]
  const clip = current?.clip
  const drawing = clip?.drawing_data ? normalizeDrawingData(clip.drawing_data) : null
  const clearAdvance = useCallback(() => { if (advanceRef.current) clearTimeout(advanceRef.current); advanceRef.current = null }, [])
  const go = useCallback((offset:number) => { clearAdvance(); setIdx(i => Math.max(0, Math.min(clips.length - 1, i + offset))) }, [clearAdvance,clips.length])
  const wake = useCallback(() => {
    setShowChrome(true)
    if (chromeRef.current) clearTimeout(chromeRef.current)
    chromeRef.current = setTimeout(() => setShowChrome(false), 3500)
  }, [])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const node = boxRef.current
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; setBox({width:r.width,height:r.height}) })
    if (node) observer.observe(node)
    return () => { observer.disconnect(); clearAdvance(); if (chromeRef.current) clearTimeout(chromeRef.current); document.body.style.overflow = overflow; previous?.focus() }
  }, [clearAdvance])

  // Obtain every URL as the current user. Refresh long sessions without losing position.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !clip || !current) return
    const controller = new AbortController()
    let cancelled = false, refreshing = false, failureRefreshUsed = false
    let pendingMeta: (()=>void) | null = null
    clearAdvance(); endedRef.current = false; setPlaying(false); setLoading(true); setError(null); setShowDrawing(true); wake()
    const load = async (preserve:boolean) => {
      if (refreshing || cancelled) return
      refreshing = true
      const position = preserve ? v.currentTime : clip.start_time_ms / 1000
      const shouldPlay = preserve ? !v.paused : !(clip.drawing_data && normalizeDrawingData(clip.drawing_data)?.shapes.length)
      try {
        const r = await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(current.gameId)}`, {signal:controller.signal})
        const data = await r.json()
        if (!r.ok || typeof data.src !== 'string') throw new Error('Unable to load this film. Please try again.')
        if (cancelled) return
        if (pendingMeta) v.removeEventListener('loadedmetadata',pendingMeta)
        pendingMeta = () => {
          if (cancelled) return
          v.currentTime = Math.max(clip.start_time_ms/1000,Math.min(position,clip.end_time_ms/1000))
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
          setLoading(false); setError(null)
          if (shouldPlay) v.play().catch(() => setPlaying(false))
        }
        v.addEventListener('loadedmetadata',pendingMeta,{once:true})
        v.src = data.src; v.load()
      } catch (e) { if (!cancelled) { setError(e instanceof Error ? e.message : 'Unable to load this film.'); setLoading(false) } }
      finally { refreshing = false }
    }
    const mediaError = () => {
      if (!failureRefreshUsed) {failureRefreshUsed = true; void load(true)}
      else { setError('Playback was interrupted. Try loading the clip again.'); setLoading(false) }
    }
    v.addEventListener('error',mediaError)
    void load(false)
    const refresh = setInterval(() => void load(true), 12 * 60 * 1000)
    return () => { cancelled = true; controller.abort(); clearInterval(refresh); clearAdvance(); v.removeEventListener('error',mediaError); if(pendingMeta) v.removeEventListener('loadedmetadata',pendingMeta); v.pause(); v.removeAttribute('src'); v.load() }
  }, [clip?.id,current?.gameId,clip?.start_time_ms,clip?.end_time_ms,retry,clearAdvance,wake])

  const finish = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true; videoRef.current?.pause(); setPlaying(false)
    if (idx < clips.length - 1) advanceRef.current = setTimeout(() => {advanceRef.current = null; setIdx(i => Math.min(i+1,clips.length-1))},400)
    else wake()
  }, [idx,clips.length,wake])
  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v || !clip || loading || error) return
    clearAdvance(); wake()
    if (v.paused) {
      if (endedRef.current || v.currentTime * 1000 >= clip.end_time_ms - 80) {v.currentTime = clip.start_time_ms / 1000; endedRef.current = false}
      v.play().catch(() => setPlaying(false))
    } else v.pause()
  }, [clip,loading,error,clearAdvance,wake])
  useEffect(() => {
    const key = (e:KeyboardEvent) => {
      if (e.key==='Tab') {
        const items = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (items?.length) { const first=items[0],last=items[items.length-1]; if(e.shiftKey && (document.activeElement===first || document.activeElement===dialogRef.current)){e.preventDefault();last.focus()} else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus()} }
        wake(); return
      }
      if (!['Escape',' ','ArrowLeft','ArrowRight','j','J','l','L'].includes(e.key)) return
      e.preventDefault(); e.stopImmediatePropagation(); wake()
      if(e.key==='Escape') onExit()
      else if(e.key===' ') togglePlay()
      else go(['ArrowLeft','j','J'].includes(e.key)?-1:1)
    }
    window.addEventListener('keydown',key,true)
    return () => window.removeEventListener('keydown',key,true)
  },[go,onExit,togglePlay,wake])
  if (!clip) return null
  const width = Math.min(box.width,box.height*ratio)
  const height = width/ratio
  const visible = showChrome || !playing || !!error || loading
  return <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Film presentation" className="fixed inset-0 z-[100] bg-black text-[#eee9df] outline-none" onPointerMove={wake} onFocusCapture={wake}
    onTouchStart={e=>{touchX.current=e.touches[0].clientX}}
    onTouchEnd={e=>{const dx=touchX.current===null?0:e.changedTouches[0].clientX-touchX.current;touchX.current=null;if(Math.abs(dx)>60)go(dx<0?1:-1);wake()}}>
    <div ref={boxRef} className="absolute inset-0 flex items-center justify-center">
      <div className="relative" style={{width:width||'100%',height:height||'100%'}}>
        <video ref={videoRef} playsInline className="w-full h-full object-contain" onClick={togglePlay} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={finish} onTimeUpdate={()=>{if((videoRef.current?.currentTime??0)*1000>=clip.end_time_ms-80)finish()}}/>
        {drawing && showDrawing && !playing && !loading && <DrawingReplay data={drawing}/>}
      </div>
    </div>
    {loading && !error && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="animate-spin" aria-label="Loading film"/></div>}
    {error && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center"><AlertCircle/><p>{error}</p><button onClick={()=>setRetry(n=>n+1)} className="px-5 py-3 bg-[#c66a3e] text-[#181917] rounded-md font-semibold">Try again</button></div>}
    <div className="absolute inset-x-0 top-0 flex items-start gap-3 p-4 bg-gradient-to-b from-black/85 to-transparent transition-opacity" style={{opacity:visible?1:0}}>
      <button onClick={onExit} aria-label="Exit presentation" className="p-3 hover:bg-white/10 rounded-md"><X size={22}/></button>
      <div className="flex-1 min-w-0 pt-2"><h2 className="font-semibold text-base">{clip.title}</h2>{clip.coaching_note && <p className="text-sm text-white/75 mt-1 max-w-3xl whitespace-pre-wrap max-h-32 overflow-auto">{clip.coaching_note}</p>}</div>
      <span className="py-3 text-sm tabular-nums">{idx+1} / {clips.length}</span>
    </div>
    <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-5 bg-gradient-to-t from-black/85 to-transparent transition-opacity" style={{opacity:visible?1:0}}>
      <button onClick={()=>go(-1)} disabled={idx===0} aria-label="Previous clip" className="p-3 disabled:opacity-30 hover:bg-white/10 rounded-md"><SkipBack/></button>
      <button onClick={togglePlay} disabled={loading||!!error} aria-label={playing?'Pause':'Play'} className="p-4 rounded-full bg-[#c66a3e] text-[#181917] disabled:opacity-40">{playing?<Pause/>:<Play/>}</button>
      <button onClick={()=>go(1)} disabled={idx===clips.length-1} aria-label="Next clip" className="p-3 disabled:opacity-30 hover:bg-white/10 rounded-md"><SkipForward/></button>
      {drawing && <button onClick={()=>{videoRef.current?.pause();setShowDrawing(s=>!s)}} aria-label="Show saved drawing" aria-pressed={showDrawing} className="p-3 hover:bg-white/10 rounded-md"><Pencil/></button>}
    </div>
  </div>
}
