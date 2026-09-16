'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Play, Pause, SkipBack, SkipForward,
  ChevronUp, ChevronDown, Trash2, Loader2, Film, AlertCircle, RefreshCw,
} from 'lucide-react'
import { SessionPlanner } from '@/app/filmroom/components/SessionPlanner'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import { PresentationMode } from '@/app/filmroom/components/PresentationMode'
import type { Playlist, PlaylistClip, Clip, Game, SessionPlan } from '@/types/filmroom'

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
                className="min-w-9 min-h-8 rounded disabled:opacity-20 transition-opacity"
                style={{ color: 'rgba(238,233,223,0.65)' }}
                aria-label={`Move "${clip?.title ?? 'clip'}" up`}>
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === clips.length - 1}
                className="min-w-9 min-h-8 rounded disabled:opacity-20 transition-opacity"
                style={{ color: 'rgba(238,233,223,0.65)' }}
                aria-label={`Move "${clip?.title ?? 'clip'}" down`}>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <span className="w-4 text-center text-xs tabular-nums shrink-0 ml-0.5"
              style={{ color: 'rgba(238,233,223,0.65)' }}>{i + 1}</span>

            <div className="flex-1 min-w-0 ml-1">
              <p className="text-xs font-medium truncate" style={{ color: '#eee9df' }}>
                {clip?.title ?? 'Untitled'}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(238,233,223,0.65)' }}>
                {clip?.game?.opponent ? `vs ${clip.game.opponent}` : ''}
                {clip ? ` · ${msToDisplay(clip.start_time_ms)}` : ''}
              </p>
            </div>

            <button onClick={e => { e.stopPropagation(); onRemove(pc.id) }}
              className="min-w-10 min-h-11 grid place-items-center rounded shrink-0 ml-1 transition-colors"
              style={{ color: 'rgba(238,233,223,0.65)' }}
              aria-label={`Remove "${clip?.title ?? 'clip'}" from playlist`}
              onPointerEnter={e => (e.currentTarget.style.color = '#f87171')}
              onPointerLeave={e => (e.currentTarget.style.color = 'rgba(238,233,223,0.65)')}>
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
  const videoRef=useRef<HTMLVideoElement>(null)
  const fired=useRef(false)
  const [playing,setPlaying]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [retry,setRetry]=useState(0)
  const [currentMs,setCurrentMs]=useState(startMs)
  useEffect(()=>{
    const video=videoRef.current
    if(!video)return
    const abort=new AbortController()
    let cancelled=false,busy=false,retried=false,meta:(()=>void)|null=null
    fired.current=false;setLoading(true);setError(null);setCurrentMs(startMs)
    const load=async(preserve:boolean)=>{
      if(busy||cancelled)return
      busy=true
      const time=preserve?video.currentTime:startMs/1000,play=preserve?!video.paused:true
      try {
        const response=await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`,{signal:abort.signal})
        const data=await response.json()
        if(!response.ok||typeof data.src!=='string')throw Error('Unable to load this clip. Please try again.')
        if(cancelled)return
        if(meta)video.removeEventListener('loadedmetadata',meta)
        meta=()=>{video.currentTime=Math.max(startMs/1000,Math.min(time,endMs/1000));setLoading(false);setError(null);if(play)video.play().catch(()=>setPlaying(false))}
        video.addEventListener('loadedmetadata',meta,{once:true})
        video.src=data.src;video.load()
      }catch(e){if(!cancelled){setLoading(false);setError(e instanceof Error?e.message:'Unable to load film.')}}finally{busy=false}
    }
    const mediaError=()=>{if(!retried){retried=true;void load(true)}else{setLoading(false);setError('Playback was interrupted. Try again.')}}
    video.addEventListener('error',mediaError)
    void load(false)
    const interval=setInterval(()=>void load(true),12*60*1000)
    return()=>{cancelled=true;abort.abort();clearInterval(interval);video.removeEventListener('error',mediaError);if(meta)video.removeEventListener('loadedmetadata',meta);video.pause();video.removeAttribute('src');video.load()}
  },[gameId,startMs,endMs,retry])
  const finish=()=>{if(fired.current)return;fired.current=true;videoRef.current?.pause();setPlaying(false);onEnded()}
  const toggle=()=>{const video=videoRef.current;if(!video||loading||error)return;if(video.paused){if(fired.current||video.currentTime*1000>=endMs-80){video.currentTime=startMs/1000;fired.current=false}video.play().catch(()=>setPlaying(false))}else video.pause()}
  return <div>
    <div className="relative aspect-video bg-black">
      <video ref={videoRef} playsInline className="w-full h-full object-contain" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={finish} onTimeUpdate={()=>{const ms=(videoRef.current?.currentTime??0)*1000;setCurrentMs(ms);if(ms>=endMs-80)finish()}} onClick={toggle}/>
      {loading&&!error&&<div className="absolute inset-0 grid place-items-center pointer-events-none"><Loader2 className="animate-spin text-[#c66a3e]" aria-label="Loading clip"/></div>}
      {error&&<div role="alert" className="absolute inset-0 flex flex-col justify-center items-center gap-3 px-5 text-center bg-black/80 text-sm"><p>{error}</p><button className="px-4 py-3 rounded-md bg-[#c66a3e] text-[#181917] font-semibold" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>}
    </div>
    <div className="flex items-center gap-3 px-4 py-3 bg-[#181917] border-t border-white/10">
      <button aria-label={playing?'Pause':'Play'} onClick={toggle} disabled={loading||!!error} className="p-3 rounded-full bg-[#c66a3e] text-[#181917] disabled:opacity-40">{playing?<Pause size={18}/>:<Play size={18}/>}</button>
      <input aria-label="Clip position" type="range" min={startMs} max={endMs} step={50} value={Math.max(startMs,Math.min(currentMs,endMs))} className="flex-1 min-w-0 accent-[#c66a3e]" onChange={e=>{const ms=Number(e.target.value);if(videoRef.current)videoRef.current.currentTime=ms/1000;fired.current=false;setCurrentMs(ms)}}/>
      <span className="text-xs text-white/65 tabular-nums">{msToDisplay(Math.max(0,currentMs-startMs))} / {msToDisplay(endMs-startMs)}</span>
    </div>
  </div>
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PlaylistDetailPage() {
  const { id } = useParams() as { id: string }
  const router  = useRouter()

  const [presenting,setPresenting]=useState(false)
  const mutationBusy=useRef(false)
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
        setPlaylist({ id: d.id as string, owner_id: d.owner_id as string, name: d.name as string, created_at: d.created_at as string, session_plan:d.session_plan as SessionPlan })
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
      if (presenting) return
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button,a,[contenteditable=true]')) return
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L')
        setActiveIdx(i => Math.min(clips.length - 1, i + 1))
      if (e.key === 'ArrowLeft'  || e.key === 'j' || e.key === 'J')
        setActiveIdx(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [clips.length,presenting])

  const removeClip = async (entryId:string) => {
    if(mutationBusy.current)return
    mutationBusy.current=true;setReorderError(null)
    try {
      const res=await fetch(`/api/filmroom/playlists/${id}/clips?entry_id=${entryId}`,{method:'DELETE'})
      if(!res.ok)throw Error('Unable to remove clip. Please try again.')
      setClips(prev=>{const next=prev.filter(c=>c.id!==entryId);setActiveIdx(cur=>Math.min(cur,Math.max(0,next.length-1)));return next})
    }catch(e){setReorderError(e instanceof Error?e.message:'Unable to remove clip.')}finally{mutationBusy.current=false}
  }

  // Reorder with optimistic update + rollback
  const reorder = useCallback(async (orderedIds: string[]) => {
    if(mutationBusy.current)return
    mutationBusy.current=true
    const snapshot  = clips
    const activeId  = clips[activeIdx]?.id
    const map       = new Map(clips.map(c => [c.id, c]))
    const reordered = orderedIds
      .map((eid, pos) => { const pc = map.get(eid); return pc ? { ...pc, position: pos } : null })
      .filter((x): x is PlaylistClip => x !== null)

    setClips(reordered)
    if (activeId) setActiveIdx(reordered.findIndex(c => c.id === activeId))
    setReorderError(null)

    try {
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

    }
    }catch{setClips(snapshot);if(activeId)setActiveIdx(snapshot.findIndex(c=>c.id===activeId));setReorderError('Unable to save order. Please try again.')}finally{mutationBusy.current=false}
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
      {presenting && <PresentationMode clips={clips.flatMap(pc=>pc.clip?[{clip:pc.clip,gameId:pc.clip.game_id,src:''}]:[])} initialIdx={activeIdx} onExit={()=>setPresenting(false)}/>}
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
          {!!clips.length && <button onClick={()=>{document.querySelectorAll('video').forEach(v=>v.pause());setPresenting(true)}} className="px-3 min-h-11 text-sm font-semibold text-[#e79568]">Present</button>}
          <AccountBar />
        </div>
      </header>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-48px)]">
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
                  <Link href={`/filmroom/game/${activeClip.game_id}?clip=${activeClip.id}`}
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
                <span className="text-xs tabular-nums" style={{ color: 'rgba(238,233,223,0.65)' }}>
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
                style={{ color: 'rgba(238,233,223,0.65)' }}>
                ← → or J / L to navigate
              </p>
            </div>
          )}
          {playlist&&<SessionPlanner key={playlist.id} playlistId={playlist.id} initial={playlist.session_plan} clips={clips} onSelect={setActiveIdx}/>}
        </div>

        {/* Clip list sidebar */}
        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'rgba(238,233,223,0.08)' }}>
          <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-widest shrink-0"
            style={{ borderColor: 'rgba(238,233,223,0.08)', color: 'rgba(238,233,223,0.65)' }}>
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
