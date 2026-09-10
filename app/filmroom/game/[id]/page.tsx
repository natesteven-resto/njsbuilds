'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft,
  Scissors, Bookmark, Star, MessageSquare,
  Users, BarChart2, Pencil, X, Check,
  Plus, Trash2, Loader2, ChevronDown, ChevronUp, Upload,
  ZoomIn, AlertCircle, CheckCircle2,
} from 'lucide-react'
import type { Game, Clip, Player, ClipCategory, ClipComment } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS, TEST_TEAM_ID } from '@/types/filmroom'
import { DrawingOverlay, type DrawingData } from '@/app/filmroom/components/DrawingOverlay'

// ─── Utilities ───────────────────────────────────────────────────────────────

function msToTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const frames = Math.floor((ms % 1000) / 33) // ~30fps
  return `${m}:${String(s).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}

function formatDuration(startMs: number, endMs: number): string {
  const dur = endMs - startMs
  const s = Math.floor(dur / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ─── Video Upload Zone ───────────────────────────────────────────────────────

type UploadState =
  | { phase: 'idle' }
  | { phase: 'signing' }
  | { phase: 'uploading'; progress: number; method: 'stream' | 'r2' }
  | { phase: 'processing'; videoId?: string }
  | { phase: 'done'; url: string; videoId?: string }
  | { phase: 'error'; message: string }

function VideoUploadZone({
  gameId,
  onComplete,
}: {
  gameId: string
  onComplete: (url: string, videoId?: string) => void
}) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setState({ phase: 'signing' })
    try {
      // 1. Get upload URL from our API
      const signRes = await fetch('/api/filmroom/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          gameId,
          fileSizeBytes: file.size,
        }),
      })
      if (!signRes.ok) throw new Error(`Sign error ${signRes.status}: ${await signRes.text()}`)
      const sign = await signRes.json()

      setState({ phase: 'uploading', progress: 0, method: sign.method })

      if (sign.method === 'stream') {
        // Cloudflare Stream TUS upload
        await tusUpload(file, sign.uploadUrl, (p) =>
          setState({ phase: 'uploading', progress: p, method: 'stream' })
        )
        setState({ phase: 'processing', videoId: sign.videoId })
        // Poll until ready
        await pollStreamReady(sign.videoId)
        const hlsUrl = `https://videodelivery.net/${sign.videoId}/manifest/video.m3u8`
        onComplete(hlsUrl, sign.videoId)
        setState({ phase: 'done', url: hlsUrl, videoId: sign.videoId })
      } else {
        // R2 presigned PUT
        await xhrUpload(file, sign.uploadUrl, (p) =>
          setState({ phase: 'uploading', progress: p, method: 'r2' })
        )
        onComplete(sign.playbackUrl)
        setState({ phase: 'done', url: sign.playbackUrl })
      }
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) upload(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  if (state.phase === 'done') return null // Player takes over

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full aspect-video bg-[#0e1015] rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer group"
      onClick={() => state.phase === 'idle' && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

      {state.phase === 'idle' && (
        <>
          <div className="w-16 h-16 rounded-2xl bg-white/4 group-hover:bg-white/6 flex items-center justify-center transition-colors">
            <Upload className="w-7 h-7 text-white/30" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/50 font-medium">Drop game film here</p>
            <p className="text-xs text-white/25 mt-1">or click to browse · MP4, MOV, MKV</p>
          </div>
        </>
      )}

      {state.phase === 'signing' && (
        <>
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-white/50">Preparing upload…</p>
        </>
      )}

      {state.phase === 'uploading' && (
        <div className="w-full max-w-xs px-6 text-center">
          <div className="mb-3">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin mx-auto" />
          </div>
          <p className="text-sm text-white/70 mb-3">
            Uploading via {state.method === 'stream' ? 'Cloudflare Stream' : 'R2'}… {state.progress}%
          </p>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === 'processing' && (
        <>
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-white/50">Processing video…</p>
          <p className="text-xs text-white/25">Cloudflare is transcoding. This takes about 30–60s.</p>
        </>
      )}

      {state.phase === 'error' && (
        <div className="text-center px-6">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300 mb-1">Upload failed</p>
          <p className="text-xs text-red-400/60 mb-3 max-w-xs">{state.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setState({ phase: 'idle' }) }}
            className="px-4 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs text-white/60 transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// Simple XHR upload with progress for R2 presigned PUTs
function xhrUpload(file: File, url: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`R2 PUT ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

// Minimal TUS client for Cloudflare Stream
async function tusUpload(
  file: File,
  uploadUrl: string,
  onProgress: (p: number) => void,
  chunkSize = 50 * 1024 * 1024 // 50 MB chunks
): Promise<void> {
  // PATCH in chunks
  let offset = 0
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    const res = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
      },
      body: chunk,
    })
    if (!res.ok) throw new Error(`TUS PATCH ${res.status}: ${await res.text()}`)
    offset += chunk.size
    onProgress(Math.round((offset / file.size) * 100))
  }
}

// Poll Stream until video is ready to stream
async function pollStreamReady(videoId: string, maxWaitMs = 120_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch(`/api/filmroom/upload?videoId=${videoId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.readyToStream) return
    }
  }
  throw new Error('Video took too long to process')
}

// ─── Video Player Component ───────────────────────────────────────────────────

function VideoPlayer({
  videoUrl,
  videoId,
  onTimeUpdate,
  onDurationChange,
  playerRef,
}: {
  videoUrl: string | null
  videoId: string | null
  onTimeUpdate: (ms: number) => void
  onDurationChange: (ms: number) => void
  playerRef: React.RefObject<HTMLVideoElement | null>
}) {
  // Stream HLS playback — native HLS supported in Safari; use hls.js for Chrome/Firefox
  // For simplicity and frame accuracy, use the HLS URL with the native <video> tag
  // (Safari plays .m3u8 natively; Chrome falls back to the src directly)
  const src = videoId
    ? `https://videodelivery.net/${videoId}/manifest/video.m3u8`
    : videoUrl

  if (!src) return null

  return (
    <video
      ref={playerRef}
      src={src}
      className="w-full aspect-video bg-black rounded-xl"
      onTimeUpdate={(e) => onTimeUpdate(Math.round(e.currentTarget.currentTime * 1000))}
      onDurationChange={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      onLoadedMetadata={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      playsInline
      preload="metadata"
      controls={false}
    />
  )
}

// ─── Transport Bar ────────────────────────────────────────────────────────────

function TransportBar({
  isPlaying, currentMs, durationMs,
  onPlayPause, onSeek, onSkip, onFrameStep,
  markIn, markOut, onMarkIn, onMarkOut,
}: {
  isPlaying: boolean
  currentMs: number
  durationMs: number
  onPlayPause: () => void
  onSeek: (ms: number) => void
  onSkip: (delta: number) => void
  onFrameStep: (dir: 1 | -1) => void
  markIn: number | null
  markOut: number | null
  onMarkIn: () => void
  onMarkOut: () => void
}) {
  const pct = durationMs > 0 ? (currentMs / durationMs) * 100 : 0
  const inPct = (markIn != null && durationMs > 0) ? (markIn / durationMs) * 100 : null
  const outPct = (markOut != null && durationMs > 0) ? (markOut / durationMs) * 100 : null

  return (
    <div className="space-y-3 px-4 py-3 bg-[#13161b] rounded-b-xl border border-t-0 border-white/8">
      {/* Scrubber */}
      <div className="relative group">
        <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = x / rect.width
            onSeek(Math.round(pct * durationMs))
          }}>
          {/* Clip region highlight */}
          {inPct != null && outPct != null && (
            <div className="absolute top-0 h-full bg-blue-500/40 rounded-full"
              style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }} />
          )}
          {/* Progress */}
          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-none"
            style={{ width: `${pct}%` }} />
          {/* Thumb */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 6px)` }} />
          {/* Mark In */}
          {inPct != null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-green-400 rounded-sm"
              style={{ left: `${inPct}%` }} title="Mark In" />
          )}
          {/* Mark Out */}
          {outPct != null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-red-400 rounded-sm"
              style={{ left: `${outPct}%` }} title="Mark Out" />
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Frame back */}
        <button onClick={() => onFrameStep(-1)}
          className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Previous frame (← arrow)">
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Skip -5s */}
        <button onClick={() => onSkip(-5000)}
          className="px-2 py-1 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Back 5s (J)">
          -5s
        </button>

        {/* Play/Pause */}
        <button onClick={onPlayPause}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-colors" title="Play/Pause (Space)">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Skip +5s */}
        <button onClick={() => onSkip(5000)}
          className="px-2 py-1 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Forward 5s (L)">
          +5s
        </button>

        {/* Frame fwd */}
        <button onClick={() => onFrameStep(1)}
          className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Next frame (→ arrow)">
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        {/* Timecode */}
        <span className="font-mono text-xs text-white/50 tabular-nums">
          {msToTimecode(currentMs)} / {msToTimecode(durationMs)}
        </span>

        {/* Mark In / Out */}
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onMarkIn}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${markIn != null ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark In point (I)">
            <Scissors className="w-3 h-3" /> IN
          </button>
          <button onClick={onMarkOut}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${markOut != null ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark Out point (O)">
            OUT <Scissors className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="flex gap-3 text-[10px] text-white/20 border-t border-white/5 pt-2">
        <span><kbd className="font-mono bg-white/8 px-1 rounded">Space</kbd> play/pause</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">←</kbd><kbd className="font-mono bg-white/8 px-1 rounded">→</kbd> frame</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">J</kbd><kbd className="font-mono bg-white/8 px-1 rounded">L</kbd> ±5s</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">I</kbd> mark in</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">O</kbd> mark out</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">S</kbd> save clip</span>
      </div>
    </div>
  )
}

// ─── Save Clip Modal ──────────────────────────────────────────────────────────

function SaveClipModal({
  gameId, teamId, startMs, endMs, players, drawingData,
  onClose, onSave,
}: {
  gameId: string
  teamId: string
  startMs: number
  endMs: number
  players: Player[]
  drawingData?: DrawingData | null
  onClose: () => void
  onSave: (clip: Clip) => void
}) {
  const [form, setForm] = useState({
    title: '', category: 'offense' as ClipCategory,
    tags: '', is_highlight: false, player_ids: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/filmroom/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          team_id: teamId,
          start_time_ms: startMs,
          end_time_ms: endMs,
          title: form.title || `${msToTimecode(startMs)} – ${msToTimecode(endMs)}`,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: form.category,
          is_highlight: form.is_highlight,
          player_ids: form.player_ids,
          drawing_data: drawingData ?? null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const clip = await res.json()
      onSave(clip)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (id: string) => {
    setForm(f => ({
      ...f,
      player_ids: f.player_ids.includes(id)
        ? f.player_ids.filter(p => p !== id)
        : [...f.player_ids, id],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Save Clip</h2>
            <p className="text-xs text-white/40 mt-0.5">{msToTimecode(startMs)} → {msToTimecode(endMs)} ({formatDuration(startMs, endMs)})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Clip Title</label>
            <input type="text" placeholder="e.g. Pick and roll coverage"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as ClipCategory[]).map(cat => (
                <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.category === cat ? CATEGORY_COLORS[cat] : 'border-white/8 text-white/40 hover:text-white/70'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Tags <span className="text-white/25">(comma-separated)</span></label>
            <input type="text" placeholder="closeout, help-D, zone"
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>

          {players.length > 0 && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Tag Players</label>
              <div className="flex flex-wrap gap-1.5">
                {players.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlayer(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs transition-all border ${form.player_ids.includes(p.id) ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'border-white/8 text-white/40 hover:text-white/70'}`}>
                    #{p.number} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, is_highlight: !f.is_highlight }))}
              className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${form.is_highlight ? 'bg-yellow-500 border-yellow-500' : 'border-white/20'}`}>
              {form.is_highlight && <Star className="w-2.5 h-2.5 text-black fill-black" />}
            </div>
            <span className="text-xs text-white/60">Mark as highlight</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Clip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Clip Comment Thread ──────────────────────────────────────────────────────

function CommentThread({ clipId }: { clipId: string }) {
  const [comments, setComments] = useState<ClipComment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    fetch(`/api/filmroom/comments?clip_id=${clipId}`)
      .then(r => r.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
  }, [clipId])

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch('/api/filmroom/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: clipId, author_role: 'coach', author_name: 'Coach Stevens', text }),
    })
    const comment = await res.json()
    setComments(c => [...c, comment])
    setText('')
    setLoading(false)
  }

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mb-2">
        <MessageSquare className="w-3 h-3" />
        {comments.length} comment{comments.length !== 1 ? 's' : ''}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className={`rounded-xl px-3 py-2 text-xs ${c.author_role === 'coach' ? 'bg-blue-500/10 border border-blue-500/15' : 'bg-white/4 border border-white/8'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-medium ${c.author_role === 'coach' ? 'text-blue-300' : 'text-white/70'}`}>{c.author_name}</span>
                <span className="text-white/25">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-white/70">{c.text}</p>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="Add coaching note..."
              className="flex-1 bg-black/20 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/40 placeholder-white/20" />
            <button onClick={submit} disabled={loading || !text.trim()}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-40 transition-colors">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clip List Item ───────────────────────────────────────────────────────────

function ClipItem({
  clip, isActive, onSelect, onDelete, onJumpTo,
}: {
  clip: Clip
  isActive: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  onJumpTo: (ms: number) => void
}) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${isActive ? 'border-blue-500/40 bg-blue-500/8' : 'border-white/6 bg-white/3 hover:bg-white/5'}`}>
      <div className="p-3 cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onJumpTo(clip.start_time_ms) }}
            className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-white/8 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
            title="Jump to clip">
            <Play className="w-2.5 h-2.5 ml-0.5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {clip.is_highlight && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
              <span className="text-xs font-medium text-white truncate">{clip.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-white/40 font-mono">{msToTimecode(clip.start_time_ms)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[clip.category]}`}>
                {CATEGORY_LABELS[clip.category]}
              </span>
              {clip.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] text-white/35 bg-white/5 px-1.5 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
            {clip.players && clip.players.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {clip.players.map((p: Player) => (
                  <span key={p.id} className="text-[10px] text-blue-300/70 bg-blue-500/8 border border-blue-500/15 px-1.5 py-0.5 rounded-md">
                    #{p.number} {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setShowComments(s => !s) }}
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
              <MessageSquare className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(clip.id) }}
              className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {showComments && <div className="px-3 pb-3"><CommentThread clipId={clip.id} /></div>}
    </div>
  )
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel({ gameId, players }: { gameId: string; players: Player[] }) {
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/filmroom/stats?game_id=${gameId}`)
      .then(r => r.json())
      .then((data: Array<{ player_id: string } & Record<string, number>>) => {
        if (Array.isArray(data)) {
          const map: Record<string, Record<string, number>> = {}
          for (const row of data) {
            map[row.player_id] = row
          }
          setStats(map)
        }
      })
  }, [gameId])

  const updateStat = (playerId: string, field: string, val: number) => {
    setStats(s => ({ ...s, [playerId]: { ...(s[playerId] || {}), [field]: val } }))
    setSaved(false)
  }

  const saveAll = async () => {
    setSaving(true)
    for (const playerId of players.map(p => p.id)) {
      const row = stats[playerId]
      if (!row) continue
      await fetch('/api/filmroom/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId, ...row }),
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const statFields = [
    ['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'],
    ['stl', 'STL'], ['blk', 'BLK'], ['turnovers', 'TO'],
    ['fg2m', '2M'], ['fg2a', '2A'], ['fg3m', '3M'], ['fg3a', '3A'],
    ['ftm', 'FTM'], ['fta', 'FTA'],
  ]

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Add players to your roster first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left text-white/40 font-medium pb-2 pr-2 sticky left-0 bg-transparent">Player</th>
              {statFields.map(([, label]) => (
                <th key={label} className="text-center text-white/40 font-medium pb-2 px-1 min-w-[36px]">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {players.map(player => (
              <tr key={player.id} className="hover:bg-white/2 transition-colors">
                <td className="py-1.5 pr-2 sticky left-0 bg-transparent">
                  <span className="font-medium text-white/80">#{player.number} {player.name}</span>
                </td>
                {statFields.map(([field]) => (
                  <td key={field} className="text-center px-0.5">
                    <input
                      type="number" min="0"
                      value={stats[player.id]?.[field] ?? ''}
                      onChange={e => updateStat(player.id, field, parseInt(e.target.value) || 0)}
                      className="w-9 text-center bg-black/20 border border-white/8 rounded px-0 py-0.5 text-xs focus:outline-none focus:border-blue-500/50 text-white/80"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button onClick={saveAll} disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : null}
          {saved ? 'Saved!' : 'Save Stats'}
        </button>
      </div>
    </div>
  )
}

// ─── Video URL Modal ──────────────────────────────────────────────────────────

function VideoUrlModal({ gameId, current, onClose, onSave }: {
  gameId: string; current: string | null; onClose: () => void; onSave: (url: string) => void
}) {
  const [url, setUrl] = useState(current || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    await fetch(`/api/filmroom/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: url }),
    })
    onSave(url)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold mb-4">Set Video URL</h2>
        <p className="text-xs text-white/40 mb-3">Paste any direct video URL. Cloudflare Stream URLs work natively.</p>
        <input type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20 mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FRAME_MS = 33 // ~30fps

type PanelTab = 'clips' | 'stats' | 'roster'

export default function GameFilmRoom() {
  const params = useParams()
  const gameId = params.id as string

  const videoRef = useRef<HTMLVideoElement>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)

  const [markIn, setMarkIn] = useState<number | null>(null)
  const [markOut, setMarkOut] = useState<number | null>(null)
  const [showSaveClip, setShowSaveClip] = useState(false)
  const [showVideoUrl, setShowVideoUrl] = useState(false)
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('clips')
  const [uploadDone, setUploadDone] = useState(false)
  const [drawingActive, setDrawingActive] = useState(false)
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null)

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`/api/filmroom/games/${gameId}`).then(r => r.json()),
      fetch(`/api/filmroom/clips?game_id=${gameId}`).then(r => r.json()),
      fetch(`/api/filmroom/players?team_id=${TEST_TEAM_ID}`).then(r => r.json()),
    ]).then(([g, c, p]) => {
      setGame(g)
      setClips(Array.isArray(c) ? c : [])
      setPlayers(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [gameId])

  // Video controls
  const playPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const seek = useCallback((ms: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = ms / 1000
    setCurrentMs(ms)
  }, [])

  const skip = useCallback((deltaMs: number) => {
    const v = videoRef.current
    if (!v) return
    const ms = Math.max(0, Math.min(durationMs, currentMs + deltaMs))
    seek(ms)
  }, [currentMs, durationMs, seek])

  const frameStep = useCallback((dir: 1 | -1) => {
    const v = videoRef.current
    if (!v || v.paused === false) { v?.pause(); setIsPlaying(false) }
    skip(dir * FRAME_MS)
  }, [skip])

  // Jump to clip
  const jumpToClip = useCallback((startMs: number) => {
    seek(startMs)
    const v = videoRef.current
    if (v && v.paused) { v.play(); setIsPlaying(true) }
  }, [seek])

  // Delete clip
  const deleteClip = async (id: string) => {
    if (!confirm('Delete this clip?')) return
    await fetch(`/api/filmroom/clips/${id}`, { method: 'DELETE' })
    setClips(c => c.filter(x => x.id !== id))
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ': e.preventDefault(); playPause(); break
        case 'ArrowLeft': e.preventDefault(); frameStep(-1); break
        case 'ArrowRight': e.preventDefault(); frameStep(1); break
        case 'j': case 'J': skip(-5000); break
        case 'l': case 'L': skip(5000); break
        case 'i': case 'I': setMarkIn(currentMs); break
        case 'o': case 'O': setMarkOut(currentMs); break
        case 's': case 'S':
          if (markIn !== null && markOut !== null && markOut > markIn) setShowSaveClip(true)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playPause, frameStep, skip, currentMs, markIn, markOut])

  if (loading) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  if (!game) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center text-white/40">
      Game not found.
    </div>
  )

  const highlights = clips.filter(c => c.is_highlight)
  const canSave = markIn !== null && markOut !== null && markOut > markIn

  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="px-3 sm:px-4 h-12 flex items-center gap-3">
          <Link href="/filmroom" className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 text-sm min-w-0">
            <span className="text-white/40 shrink-0">Film Room</span>
            <span className="text-white/20 mx-1">/</span>
            <span className="font-medium truncate">vs {game.opponent}</span>
            <span className="text-white/30 text-xs ml-2 shrink-0">
              {new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex-1" />
          {game.video_url ? (
            <button onClick={() => setShowVideoUrl(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/6 transition-all border border-white/8 hover:border-white/15">
              <Upload className="w-3 h-3" /> Change Video
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-orange-400/80 border border-orange-500/20 bg-orange-500/5">
              <Upload className="w-3 h-3" /> Drop video below
            </span>
          )}
          {highlights.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-500/15 text-yellow-400 text-xs border border-yellow-500/25">
              <Star className="w-3 h-3 fill-yellow-400" /> {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video + transport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="p-3 sm:p-4 space-y-0">
            {/* Video */}
            {/* Upload zone — shown when no video + not mid-upload */}
            {!game.video_url && !uploadDone && (
              <div className="rounded-xl overflow-hidden border border-white/8 mb-0">
                <VideoUploadZone
                  gameId={gameId}
                  onComplete={async (url, videoId) => {
                    // Persist video URL + video ID back to game record
                    await fetch(`/api/filmroom/games/${gameId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ video_url: url, ...(videoId ? { video_id: videoId } : {}) }),
                    })
                    setGame(g => g ? { ...g, video_url: url, video_id: videoId ?? null } : g)
                    setUploadDone(true)
                  }}
                />
              </div>
            )}

            {/* Video player — shown when video_url is set */}
            {game.video_url && (
              <div className="rounded-t-xl overflow-hidden border border-b-0 border-white/8 bg-black relative">
                <VideoPlayer
                  videoUrl={game.video_url}
                  videoId={game.video_id}
                  onTimeUpdate={setCurrentMs}
                  onDurationChange={setDurationMs}
                  playerRef={videoRef}
                />
                <DrawingOverlay
                  active={drawingActive}
                  onDataChange={setDrawingData}
                  initialData={null}
                />
              </div>
            )}
            {/* Transport — only active with video */}
            {game.video_url && <TransportBar
              isPlaying={isPlaying}
              currentMs={currentMs}
              durationMs={durationMs}
              onPlayPause={playPause}
              onSeek={seek}
              onSkip={skip}
              onFrameStep={frameStep}
              markIn={markIn}
              markOut={markOut}
              onMarkIn={() => setMarkIn(currentMs)}
              onMarkOut={() => setMarkOut(currentMs)}
            />}

            {/* Upload success banner */}
            {uploadDone && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">Video uploaded and ready — use the controls above to start marking clips.</p>
              </div>
            )}

            {/* Save clip CTA */}
            {canSave && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300">Clip marked</p>
                  <p className="text-xs text-blue-400/60">
                    {msToTimecode(markIn!)} → {msToTimecode(markOut!)} ({formatDuration(markIn!, markOut!)})
                  </p>
                </div>
                <button onClick={() => { setMarkIn(null); setMarkOut(null) }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                  Clear
                </button>
                <button onClick={() => setShowSaveClip(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors">
                  <Scissors className="w-3.5 h-3.5" /> Save Clip <kbd className="font-mono opacity-60 ml-1">S</kbd>
                </button>
              </div>
            )}

            {/* Drawing toggle */}
            {game.video_url && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setDrawingActive(a => !a)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    drawingActive
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white hover:bg-white/6'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {drawingActive ? 'Drawing On — click tools on video' : 'Draw on video'}
                </button>
                {drawingActive && (
                  <p className="text-xs text-white/30">Arrows, circles, freehand, text. Drawing saves with your clip.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Clip panel */}
        <div className="w-80 xl:w-96 shrink-0 border-l border-white/8 flex flex-col">
          {/* Panel tabs */}
          <div className="shrink-0 border-b border-white/8 flex">
            {([
              ['clips', 'Clips', Bookmark],
              ['stats', 'Stats', BarChart2],
              ['roster', 'Roster', Users],
            ] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-all ${panelTab === tab ? 'border-blue-500 text-blue-300' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* CLIPS tab */}
            {panelTab === 'clips' && (
              <div className="p-3 space-y-2">
                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className="text-xs text-white/30">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
                  {highlights.length > 0 && (
                    <span className="text-xs text-yellow-400/70 flex items-center gap-1 ml-auto">
                      <Star className="w-2.5 h-2.5 fill-yellow-400" /> {highlights.length} HL
                    </span>
                  )}
                </div>

                {clips.length === 0 ? (
                  <div className="text-center py-10">
                    <Scissors className="w-8 h-8 mx-auto text-white/15 mb-2" />
                    <p className="text-xs text-white/30">No clips yet.</p>
                    <p className="text-xs text-white/20 mt-1">Use I / O to mark in/out, then S to save.</p>
                  </div>
                ) : (
                  clips.map(clip => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      isActive={activeClipId === clip.id}
                      onSelect={() => setActiveClipId(id => id === clip.id ? null : clip.id)}
                      onDelete={deleteClip}
                      onJumpTo={(ms) => { jumpToClip(ms); setActiveClipId(clip.id) }}
                    />
                  ))
                )}
              </div>
            )}

            {/* STATS tab */}
            {panelTab === 'stats' && (
              <div className="p-3">
                <StatsPanel gameId={gameId} players={players} />
              </div>
            )}

            {/* ROSTER tab */}
            {panelTab === 'roster' && (
              <div className="p-3">
                <RosterPanel players={players} onPlayersChange={setPlayers} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSaveClip && markIn !== null && markOut !== null && (
        <SaveClipModal
          gameId={gameId}
          teamId={game.team_id}
          startMs={markIn}
          endMs={markOut}
          players={players}
          drawingData={drawingData}
          onClose={() => setShowSaveClip(false)}
          onSave={(clip) => {
            setClips(c => [...c, clip])
            setMarkIn(null)
            setMarkOut(null)
            setDrawingActive(false)
            setDrawingData(null)
          }}
        />
      )}

      {showVideoUrl && (
        <VideoUrlModal
          gameId={gameId}
          current={game.video_url}
          onClose={() => setShowVideoUrl(false)}
          onSave={(url) => setGame(g => g ? { ...g, video_url: url } : g)}
        />
      )}
    </div>
  )
}

// ─── Inline Roster Panel ──────────────────────────────────────────────────────

function RosterPanel({ players, onPlayersChange }: { players: Player[]; onPlayersChange: (p: Player[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '', parent_email: '' })
  const [loading, setLoading] = useState(false)

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/filmroom/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: TEST_TEAM_ID,
        name: form.name,
        number: parseInt(form.number) || null,
        position: form.position || null,
        parent_email: form.parent_email || null,
      }),
    })
    const player = await res.json()
    onPlayersChange([...players, player])
    setForm({ name: '', number: '', position: '', parent_email: '' })
    setAdding(false)
    setLoading(false)
  }

  const removePlayer = async (id: string) => {
    await fetch(`/api/filmroom/players/${id}`, { method: 'DELETE' })
    onPlayersChange(players.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-2">
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
            {p.number ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{p.name}</p>
            {p.position && <p className="text-[10px] text-white/35">{p.position}</p>}
          </div>
          <button onClick={() => removePlayer(p.id)}
            className="p-1 rounded-lg text-white/20 hover:text-red-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={addPlayer} className="space-y-2 p-3 rounded-xl bg-white/3 border border-blue-500/25">
          <div className="grid grid-cols-2 gap-1.5">
            <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="#" type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="PG/SG/SF/PF/C" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="Parent email" type="email" value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setAdding(false)}
              className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />} Add
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-xs text-white/30 hover:text-white/60 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Player
        </button>
      )}
    </div>
  )
}
