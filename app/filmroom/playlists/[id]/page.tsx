'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Play, Pause, SkipBack, SkipForward,
  ChevronUp, ChevronDown, Trash2, Loader2, Film, AlertCircle, RefreshCw,
} from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import type { Playlist, PlaylistClip, Clip, Game } from '@/types/filmroom'

function msToDisplay(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Clip list: up/down + drag reorder, rollback on failure ───────────────────
function ClipList({ clips, activeIdx, onSelect, onRemove, onReorder, reorderError }: {
  clips: PlaylistClip[]
  activeIdx: number
  onSelect: (i: number) => void
  onRemove: (entryId: string) => void
  onReorder: (orderedIds: string[]) => Promise<void>
  reorderError: string | null
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver]         = useState<number | null>(null)

  const move = async (from: number, dir: -1 | 1) => {
    const to = from + dir
    if (to < 0 || to >= clips.length) return
    const ids = clips.map(c => c.id)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await onReorder(ids)
    onSelect(to)
  }

  const applyDrop = (from: number, to: number) => {
    if (from === to) return
    const ids = clips.map(c => c.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    onReorder(ids)
  }

  return (
    <div className="space-y-1" role="list">
      {reorderError && (
        <p className="text-xs px-2 py-1.5 rounded mb-1"
          style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>
          {reorderError}
        </p>
      )}
      {clips.map((pc, i) => {
        const clip     = pc.clip as (Clip & { game?: Game }) | undefined
        const isActive  = activeIdx === i
        const isDragOver = over === i && dragging !== null && dragging !== i
        return (
          <div key={pc.id} role="listitem"
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(i) }}
            onDragOver={e => { e.preventDefault(); setOver(i) }}
            onDrop={() => { if (dragging !== null) applyDrop(dragging, i); setDragging(null); setOver(null) }}
            onDragEnd={() => { setDragging(null); setOver(null) }}
            className="flex items-center gap-1 px-1.5 py-2 rounded-lg select-none"
            style={{
              background: isActive ? 'rgba(198,106,62,0.12)' : undefined,
              border: isActive   ? '1px solid rgba(198,106,62,0.35)'
                : isDragOver ? '1px solid #c66a3e'
                : '1px solid transparent',
              cursor: 'pointer',
            }}
            onClick={() => onSelect(i)}
            tabIndex={0}
            aria-label={`Clip ${i + 1}: ${clip?.title ?? 'Untitled'}`}
            aria-pressed={isActive}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i) } }}
          >
            {/* Up / down — keyboard- and touch-accessible reorder controls */}
            <div className="flex flex-col shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="p-0.5 rounded disabled:opacity-20 transition-opacity"
                style={{ color: 'rgba(238,233,223,0.45)' }}
                aria-label={`Move "${clip?.title ?? 'clip'}" up`}>
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === clips.length - 1}
                className="p-0.5 rounded disabled:opacity-20 transition-opacity"
                style={{ color: 'rgba(238,233,223,0.45)' }}
                aria-label={`Move "${clip?.title ?? 'clip'}" down`}>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <span className="w-4 text-center text-xs tabular-nums shrink-0 ml-0.5"
              style={{ color: 'rgba(238,233,223,0.40)' }}>{i + 1}</span>

            <div className="flex-1 min-w-0 ml-1">
              <p className="text-xs font-medium truncate" style={{ color: '#eee9df' }}>
                {clip?.title ?? 'Untitled'}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(238,233,223,0.48)' }}>
                {clip?.game?.opponent ? `vs ${clip.game.opponent}` : ''}
                {clip ? ` · ${msToDisplay(clip.start_time_ms)}` : ''}
              </p>
            </div>

            <button onClick={e => { e.stopPropagation(); onRemove(pc.id) }}
              className="p-1 rounded shrink-0 ml-1 transition-colors"
              style={{ color: 'rgba(238,233,223,0.30)' }}
              aria-label={`Remove "${clip?.title ?? 'clip'}" from playlist`}
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

// ── Bounded clip player ───────────────────────────────────────────────────────
// Token refresh preserves position/paused state.
// endFiredRef deduplicates both timeupdate-threshold and onEnded events.
// key prop on parent causes full remount on clip change → cancels effects/timers.
function ClipPlayer({ gameId, startMs, endMs, onEnded }: {
  gameId: string; startMs: number; endMs: number; onEnded: () => void
}) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [currentMs, setCurrentMs] = useState(startMs)
  const endFiredRef   = useRef(false)
  const refreshTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    endFiredRef.current = false

    async function loadToken() {
      try {
        const res = await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`)
        if (!res.ok || cancelled) return
        const { src: s, refreshAfterSeconds } = await res.json() as { src: string; refreshAfterSeconds?: number }
        if (cancelled) return
        setSrc(s)

        if (refreshAfterSeconds && refreshAfterSeconds > 30) {
          refreshTimer.current = setTimeout(async () => {
            if (cancelled) return
            const v = videoRef.current
            const savedTime = v ? v.currentTime : startMs / 1000
            const wasPaused = v ? v.paused : true
            try {
              const r = await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`)
              if (!r.ok || cancelled) return
              const { src: newSrc } = await r.json() as { src: string }
              if (cancelled) return
              setSrc(newSrc)
              if (v) {
                const restore = () => {
                  v.currentTime = savedTime
                  if (!wasPaused) v.play().catch(() => {})
                  v.removeEventListener('loadedmetadata', restore)
                }
                v.addEventListener('loadedmetadata', restore)
                v.src = newSrc; v.load()
              }
            } catch { /* keep playing on refresh failure */ }
          }, (refreshAfterSeconds - 20) * 1000)
        }
      } catch { /* stays on spinner */ }
    }
    loadToken()
    return () => { cancelled = true; if (refreshTimer.current) clearTimeout(refreshTimer.current) }
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

  // Stable fireEnd — deduplicated via ref
  const fireEnd = useCallback(() => {
    if (endFiredRef.current) return
    endFiredRef.current = true
    videoRef.current?.pause()
    setPlaying(false)
    onEnded()
  }, [onEnded])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current; if (!v) return
    const ms = v.currentTime * 1000
    setCurrentMs(ms)
    if (ms >= endMs - 80) fireEnd()
  }, [endMs, fireEnd])

  const playPause = () => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  const pct = endMs > startMs
    ? Math.min(1, Math.max(0, (currentMs - startMs) / (endMs - startMs))) : 0

  return (
    <div>
      {!src
        ? <div className="aspect-video flex items-center justify-center" style={{ background: '#111' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c66a3e' }} />
          </div>
        : <video ref={videoRef} className="w-full aspect-video object-contain bg-black"
            onTimeUpdate={handleTimeUpdate} onEnded={fireEnd}
            playsInline controls={false} />
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
          <div className="h-full rounded-full transition-none"
            style={{ width: `${pct * 100}%`, background: '#c66a3e' }} />
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
  const router  = useRouter()

  const [playlist,      setPlaylist]      = useState<Playlist | null>(null)
  const [clips,         setClips]         = useState<PlaylistClip[]>([])
  const [loading,       setLoading]       = useState(true)
  const [pageError,     setPageError]     = useState<string | null>(null)
  const [reorderError,  setReorderError]  = useState<string | null>(null)
  const [activeIdx,     setActiveIdx]     = useState(0)
  const [retryKey,      setRetryKey]      = useState(0)

  // Load — abort on id/retry change, reset all state
  useEffect(() => {
    setLoading(true); setPageError(null); setClips([]); setPlaylist(null); setActiveIdx(0)
    const ctrl = new AbortController()

    fetch(`/api/filmroom/playlists/${id}`, { signal: ctrl.signal })
      .then(r => {
        if (r.status === 401) { router.replace('/filmroom/login'); return null }
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? `Error ${r.status}`) })
        return r.json()
      })
      .then((d: Record<string, unknown> | null) => {
        if (!d || ctrl.signal.aborted) return
        setPlaylist({ id: d.id as string, owner_id: d.owner_id as string, name: d.name as string, created_at: d.created_at as string })
        setClips(Array.isArray(d.clips) ? d.clips as PlaylistClip[] : [])
        setLoading(false)
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return
        setPageError(e.message || 'Failed to load playlist')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [id, router, retryKey])

  // Keyboard navigation — guard input elements
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L')
        setActiveIdx(i => Math.min(clips.length - 1, i + 1))
      if (e.key === 'ArrowLeft'  || e.key === 'j' || e.key === 'J')
        setActiveIdx(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [clips.length])

  const removeClip = async (entryId: string) => {
    const res = await fetch(
      `/api/filmroom/playlists/${id}/clips?entry_id=${entryId}`,
      { method: 'DELETE' }
    )
    if (res.ok || res.status === 204) {
      setClips(prev => {
        const next = prev.filter(c => c.id !== entryId)
        setActiveIdx(cur => Math.min(cur, Math.max(0, next.length - 1)))
        return next
      })
    }
  }

  // Reorder with optimistic update + rollback
  const reorder = useCallback(async (orderedIds: string[]) => {
    const snapshot  = clips
    const activeId  = clips[activeIdx]?.id
    const map       = new Map(clips.map(c => [c.id, c]))
    const reordered = orderedIds
      .map((eid, pos) => { const pc = map.get(eid); return pc ? { ...pc, position: pos } : null })
      .filter((x): x is PlaylistClip => x !== null)

    setClips(reordered)
    if (activeId) setActiveIdx(reordered.findIndex(c => c.id === activeId))
    setReorderError(null)

    const res = await fetch(`/api/filmroom/playlists/${id}/clips`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      setClips(snapshot)
      if (activeId) setActiveIdx(snapshot.findIndex(c => c.id === activeId))
      const msg = err.error ?? 'Reorder failed — rolled back'
      setReorderError(msg)
      setTimeout(() => setReorderError(null), 5000)
    }
  }, [clips, activeIdx, id])

  // Auto-advance: last clip stays (no loop), dedup handled inside ClipPlayer
  const handleEnded = useCallback(() => {
    setActiveIdx(i => (i >= clips.length - 1 ? i : i + 1))
  }, [clips.length])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#181917' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c66a3e' }} />
    </div>
  )

  if (pageError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: '#181917', color: '#eee9df' }}>
      <AlertCircle className="w-10 h-10" style={{ color: 'rgba(248,113,113,0.60)' }} />
      <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(238,233,223,0.70)' }}>
        {pageError}
      </p>
      <div className="flex gap-2">
        <button onClick={() => setRetryKey(k => k + 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#c66a3e', color: '#181917' }}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <Link href="/filmroom/playlists"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'rgba(238,233,223,0.15)', color: 'rgba(238,233,223,0.70)' }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    </div>
  )

  const activePC   = clips[activeIdx]
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
          <span className="font-bold text-sm truncate" style={{ color: '#eee9df' }}>
            {playlist?.name ?? 'Playlist'}
          </span>
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
              <Link href="/filmroom" className="text-sm underline" style={{ color: '#c66a3e' }}>
                Browse library →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {activeClip && (
                /* key remounts fully on clip change — cancels all timers/effects */
                <ClipPlayer
                  key={`${activeClip.game_id}-${activeClip.start_time_ms}-${activeIdx}`}
                  gameId={activeClip.game_id}
                  startMs={activeClip.start_time_ms}
                  endMs={activeClip.end_time_ms}
                  onEnded={handleEnded}
                />
              )}

              <div className="px-4 py-3 space-y-1 border-b shrink-0"
                style={{ borderColor: 'rgba(238,233,223,0.08)' }}>
                <p className="font-bold text-sm" style={{ color: '#eee9df' }}>
                  {activeClip?.title ?? ''}
                </p>
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

              <div className="flex items-center justify-center gap-6 py-4 shrink-0">
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
              <p className="text-center text-[10px] shrink-0 pb-2"
                style={{ color: 'rgba(238,233,223,0.30)' }}>
                ← → or J / L to navigate
              </p>
            </div>
          )}
        </div>

        {/* Clip list sidebar */}
        <div className="w-72 shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'rgba(238,233,223,0.08)' }}>
          <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-widest shrink-0"
            style={{ borderColor: 'rgba(238,233,223,0.08)', color: 'rgba(238,233,223,0.50)' }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ClipList
              clips={clips} activeIdx={activeIdx}
              onSelect={setActiveIdx} onRemove={removeClip} onReorder={reorder}
              reorderError={reorderError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
