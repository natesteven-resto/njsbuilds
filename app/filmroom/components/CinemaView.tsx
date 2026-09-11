'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { JogWheel } from './JogWheel'

interface CinemaViewProps {
  videoUrl: string | null
  videoId: string | null
  gameTitle: string
  onExit: () => void
}

// Extract R2 key from a full R2 URL
function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    // Path is like /filmroom-videos/games/xxx/filename.mp4
    // Key is everything after /filmroom-videos/
    const parts = u.pathname.split('/filmroom-videos/')
    return parts[1] ?? null
  } catch {
    return null
  }
}

function msToDisplay(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CinemaView({ videoUrl, videoId, gameTitle, onExit }: CinemaViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playableSrc, setPlayableSrc] = useState<string | null>(null)
  const [srcError, setSrcError] = useState(false)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get a playable URL — signed if R2, direct if already playable
  useEffect(() => {
    if (!videoUrl && !videoId) return

    // If it's a Cloudflare Stream HLS URL, use directly
    if (videoId) {
      setPlayableSrc(`https://videodelivery.net/${videoId}/manifest/video.m3u8`)
      return
    }

    if (!videoUrl) return

    // If it's an R2 private URL, proxy through our API (avoids CORS/auth issues)
    if (videoUrl.includes('.r2.cloudflarestorage.com')) {
      const key = extractR2Key(videoUrl)
      if (!key) { setSrcError(true); return }
      // Use the video proxy route — server fetches from R2 with credentials
      const gameId = key.split('/')[1] ?? 'unknown'
      setPlayableSrc(`/api/filmroom/video/${gameId}?key=${encodeURIComponent(key)}`)
    } else {
      setPlayableSrc(videoUrl)
    }
  }, [videoUrl, videoId])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3500)
  }, [])

  useEffect(() => () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }, [])

  const playPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
    resetControlsTimer()
  }, [resetControlsTimer])

  const scrub = useCallback((deltaMs: number) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const next = Math.max(0, Math.min(v.duration, v.currentTime + deltaMs / 1000))
    v.currentTime = next
    setCurrentMs(Math.round(next * 1000))
    resetControlsTimer()
  }, [resetControlsTimer])

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      onPointerMove={resetControlsTimer}
    >
      {/* ── Film room backdrop (last frame of transition video) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/filmroom-room.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      {/* ── Game video composited onto the screen ──
          Screen in the image: left ~7%, top ~11%, width ~86%, height ~49%
          Centered horizontally on the backdrop                           */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: '13%',
          top: '8%',
          width: '74%',
          height: '49%',
          zIndex: 2,
          background: '#000',
        }}
        onClick={playPause}
      >
        {playableSrc ? (
          <video
            ref={videoRef}
            src={playableSrc}
            className="w-full h-full object-cover"
            onTimeUpdate={e => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
            onDurationChange={e => setDurationMs(Math.round(e.currentTarget.duration * 1000))}
            onLoadedMetadata={e => setDurationMs(Math.round(e.currentTarget.duration * 1000))}
            onEnded={() => setIsPlaying(false)}
            playsInline
            preload="metadata"
          />
        ) : srcError ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white/30 text-sm">Unable to load video</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}

        {/* Play button overlay when paused */}
        {!isPlaying && playableSrc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Jog wheel — sits over the screen area */}
      <div className="absolute pointer-events-none" style={{ left: '13%', top: '8%', width: '74%', height: '49%', zIndex: 3 }}>
        <div className="pointer-events-auto relative w-full h-full">
          <JogWheel
            visible={!isPlaying && durationMs > 0}
            currentMs={currentMs}
            onScrub={scrub}
            onTap={playPause}
          />
        </div>
      </div>

      {/* ── UI Controls (fade out during playback) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10, opacity: showControls ? 1 : 0, transition: 'opacity 0.4s' }}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 pointer-events-auto"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}
        >
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Film Room</p>
            <p className="text-white font-semibold text-sm">{gameTitle}</p>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white border border-white/20 hover:border-white/50 transition-all"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', touchAction: 'manipulation' } as React.CSSProperties}
          >
            Exit Film Room →
          </button>
        </div>

        {/* Bottom bar — scrubber + play */}
        {durationMs > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-16 pointer-events-auto"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
          >
            {/* Scrubber */}
            <div
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-4"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                const v = videoRef.current
                if (v) { v.currentTime = pct * v.duration; setCurrentMs(Math.round(pct * durationMs)) }
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                style={{ width: `${durationMs > 0 ? (currentMs / durationMs) * 100 : 0}%`, transition: 'width 0.1s linear' }}
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={playPause}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-white/25 hover:border-white/50 transition-all"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', touchAction: 'manipulation' } as React.CSSProperties}
              >
                {isPlaying
                  ? <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                }
              </button>
              <span className="font-mono text-xs text-white/50 tabular-nums">
                {msToDisplay(currentMs)} / {msToDisplay(durationMs)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
