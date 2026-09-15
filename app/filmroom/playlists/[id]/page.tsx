'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Play, Pause, SkipBack, SkipForward,
  GripVertical, Trash2, Loader2, Film,
} from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import type { Playlist, PlaylistClip, Clip, Game } from '@/types/filmroom'

function msToDisplay(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Clip list with drag-reorder and keyboard focus ───────────────────────────
function ClipList({ clips, activeIdx, onSelect, onRemove, onReorder }: {
  clips: PlaylistClip[]
  activeIdx: number
  onSelect: (i: number) => void
  onRemove: (entryId: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const applyDrop = (from: number, to: number) => {
    if (from === to) return
    const ids = clips.map(c => c.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorder(ids)
  }

  return (
    <div className="space-y-1" role="list">
      {clips.map((pc, i) => {
        const clip = pc.clip as (Clip & { game?: Game }) | undefined
        const opponent = clip?.game?.opponent ?? ''
        const isActive = activeIdx === i
        const isDragOver = over === i && dragging !== null && dragging !== i
        return (
          <div key={pc.id} role="listitem"
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(i) }}
            onDragOver={e => { e.preventDefault(); setOver(i) }}
            onDrop={() => { if (dragging !== null) applyDrop(dragging, i); setDragging(null); setOver(null) }}
            onDragEnd={() => { setDragging(null); setOver(null) }}
            className="flex items-center gap-2 px-2 py-2 rounded-lg select-none transition-colors"
            style={{
              background: isActive ? 'rgba(198,106,62,0.12)' : undefined,
              border: isActive ? '1px solid rgba(198,106,62,0.35)'
                : isDragOver ? '1px solid #c66a3e'
                : '1px solid transparent',
              cursor: 'pointer',
            }}
            onClick={() => onSelect(i)}
            tabIndex={0} aria-label={`Clip ${i + 1}: ${clip?.title ?? 'Untitled'}`}
            aria-pressed={isActive}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i) } }}
          >
            <GripVertical className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(238,233,223,0.22)', cursor: 'grab' }} aria-hidden />
            <span className="w-5 text-center text-xs tabular-nums shrink-0" style={{ color: 'rgba(238,233,223,0.38)' }}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#eee9df' }}>{clip?.title ?? 'Untitled'}</p>
              <p className="text-[10px]" style={{ color: 'rgba(238,233,223,0.48)' }}>
                {opponent ? `vs ${opponent}` : ''}{clip ? ` · ${msToDisplay(clip.start_time_ms)}` : ''}
              </p>
            </div>
            <button onClick={e => { e.stopPropagation(); onRemove(pc.id) }}
              className="p-1 rounded shrink-0 transition-colors"
              style={{ color: 'rgba(238,233,223,0.30)' }}
              aria-label={`Remove ${clip?.title ?? 'clip'} from playlist`}
              onPointerEnter={e => (e.currentTarget.style.color = '#f87171')}
              onPointerLeave={e => (e.currentTarget.style.color = 'rgba(238,233,223,0.30)')}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Bounded clip player: auto-advances at clip end ───────────────────────────
function ClipPlayer({ gameId, startMs, endMs, onEnded }: {
  gameId: string; startMs: number; endMs: number; onEnded: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(startMs)
  const firedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    firedRef.current = false
    setSrc(null); setPlaying(false); setCurrentMs(startMs)
    fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ src: s }: { src: string }) => { if (!cancelled) setSrc(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [gameId, startMs, endMs])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !src) return
    v.src = src; v.load()
    const onMeta = () => {
      v.currentTime = startMs / 1000
      v.play().then(() => setPlaying(true)).catch(() => {})
    }
    v.addEventListener('loadedmetadata', onMeta)
    return () => v.removeEventListener('loadedmetadata', onMeta)
  }, [src, startMs])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current; if (!v) return
    const ms = v.currentTime * 1000
    setCurrentMs(ms)
    if (ms >= endMs - 80 && !firedRef.current) {
      firedRef.current = true; v.pause(); setPlaying(false); onEnded()
    }
  }, [endMs, onEnded])

  const playPause = () => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  const pct = endMs > startMs ? Math.min(1, Math.max(0, (currentMs - startMs) / (endMs - startMs))) : 0

  return (
    <div>
      {!src
        ? <div className="aspect-video flex items-center justify-center" style={{ background: '#111' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} />
          </div>
        : <video ref={videoRef} className="w-full aspect-video object-contain bg-black"
            onTimeUpdate={handleTimeUpdate} onEnded={onEnded} playsInline controls={false} />
      }
      <div className="px-3 py-2 flex items-center gap-3"
        style={{ background: '#181917', borderTop: '1px solid rgba(238,233,223,0.08)' }}>
        <button onClick={playPause}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: '#c66a3e', color: '#181917' }}
          aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(238,233,223,0.10)' }}>
          <div className="h-full rounded-full transition-none" style={{ width: `${pct * 100}%`, background: '#c66a3e' }} />
        </div>
        <span className="text-xs tabular-nums shrink-0" style={{ color: 'rgba(238,233,223,0.50)' }}>
          {msToDisplay(Math.max(0, currentMs - startMs))} / {msToDisplay(endMs - startMs)}
        </span>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PlaylistDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [clips, setClips] = useState<PlaylistClip[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    setLoading(true); setNotFound(false)
    fetch(`/api/filmroom/playlists/${id}`)
      .then(r => {
        if (r.status === 401) { router.replace('/filmroom/login'); return null }
        if (r.status === 403 || r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.ok ? r.json() : null
      })
      .then(d => {
        if (!d) return
        setPlaylist({ id: d.id, owner_id: d.owner_id, name: d.name, created_at: d.created_at })
        setClips(Array.isArray(d.clips) ? d.clips : [])
        setActiveIdx(0); setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id, router])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L')
        setActiveIdx(i => Math.min(clips.length - 1, i + 1))
      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J')
        setActiveIdx(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clips.length])

  const removeClip = async (entryId: string) => {
    const res = await fetch(`/api/filmroom/playlists/${id}/clips?entry_id=${entryId}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setClips(prev => {
        const next = prev.filter(c => c.id !== entryId)
        setActiveIdx(cur => Math.min(cur, Math.max(0, next.length - 1)))
        return next
      })
    }
  }

  const reorder = async (orderedIds: string[]) => {
    const map = new Map(clips.map(c => [c.id, c]))
    const reordered = orderedIds.map((eid, pos) => {
      const pc = map.get(eid)
      return pc ? { ...pc, position: pos } : null
    }).filter(Boolean) as PlaylistClip[]
    const activeId = clips[activeIdx]?.id
    setClips(reordered)
    if (activeId) setActiveIdx(reordered.findIndex(c => c.id === activeId))
    await fetch(`/api/filmroom/playlists/${id}/clips`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#181917' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#181917', color: '#eee9df' }}>
      <Film className="w-10 h-10" style={{ color: 'rgba(238,233,223,0.20)' }} />
      <p style={{ color: 'rgba(238,233,223,0.60)' }}>Playlist not found or access denied.</p>
      <Link href="/filmroom/playlists"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
        style={{ background: '#c66a3e', color: '#181917' }}>
        <ChevronLeft className="w-4 h-4" /> Back to Playlists
      </Link>
    </div>
  )

  const activePC = clips[activeIdx]
  const activeClip = activePC?.clip as (Clip & { game?: Game }) | undefined

  return (
    <div className="cs min-h-screen" style={{ background: '#181917', color: '#eee9df' }}>
      <header className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(24,25,23,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(238,233,223,0.10)' }}>
        <div className="px-4 h-12 flex items-center gap-3">
          <Link href="/filmroom/playlists"
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(238,233,223,0.60)' }} aria-label="Back to Playlists">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-sm truncate" style={{ color: '#eee9df' }}>{playlist?.name ?? 'Playlist'}</span>
          <div className="flex-1" />
          <AccountBar />
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
        {/* Player column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {clips.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Film className="w-10 h-10" style={{ color: 'rgba(238,233,223,0.15)' }} />
              <p style={{ color: 'rgba(238,233,223,0.60)' }}>No clips yet — add them from a game page.</p>
              <Link href="/filmroom" className="text-sm underline" style={{ color: '#c66a3e' }}>Browse library →</Link>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {activeClip && (
                <ClipPlayer
                  key={`${activeClip.game_id}-${activeClip.start_time_ms}-${activeIdx}`}
                  gameId={activeClip.game_id}
                  startMs={activeClip.start_time_ms}
                  endMs={activeClip.end_time_ms}
                  onEnded={() => setActiveIdx(i => Math.min(i + 1, clips.length - 1))}
                />
              )}

              {/* Clip metadata */}
              <div className="px-4 py-3 space-y-1 border-b" style={{ borderColor: 'rgba(238,233,223,0.08)' }}>
                <p className="font-bold text-sm" style={{ color: '#eee9df' }}>{activeClip?.title ?? ''}</p>
                {activeClip?.coaching_note && (
                  <p className="text-xs italic" style={{ color: 'rgba(238,233,223,0.60)' }}>
                    {activeClip.coaching_note}
                  </p>
                )}
                {activeClip?.game && (
                  <Link href={`/filmroom/game/${activeClip.game_id}`}
                    className="text-xs underline" style={{ color: '#c66a3e' }}>
                    vs {activeClip.game.opponent} — open in Film Room →
                  </Link>
                )}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center justify-center gap-6 py-4" role="navigation" aria-label="Clip navigation">
                <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="p-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-30"
                  style={{ color: '#eee9df' }} aria-label="Previous clip">
                  <SkipBack className="w-5 h-5" />
                </button>
                <span className="text-xs tabular-nums" style={{ color: 'rgba(238,233,223,0.50)' }}>
                  {activeIdx + 1} / {clips.length}
                </span>
                <button onClick={() => setActiveIdx(i => Math.min(clips.length - 1, i + 1))}
                  disabled={activeIdx === clips.length - 1}
                  className="p-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-30"
                  style={{ color: '#eee9df' }} aria-label="Next clip">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-[10px] pb-2" style={{ color: 'rgba(238,233,223,0.28)' }}>
                ← → or J / L to navigate
              </p>
            </div>
          )}
        </div>

        {/* Clip list sidebar */}
        <div className="w-72 shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'rgba(238,233,223,0.08)' }}>
          <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: 'rgba(238,233,223,0.08)', color: 'rgba(238,233,223,0.50)' }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} · drag to reorder
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ClipList clips={clips} activeIdx={activeIdx}
              onSelect={setActiveIdx} onRemove={removeClip} onReorder={reorder} />
          </div>
        </div>
      </div>
    </div>
  )
}
