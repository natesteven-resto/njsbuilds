'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { JogWheel } from './JogWheel'

interface CinemaViewProps {
  videoUrl: string | null
  videoId: string | null
  gameTitle: string
  onExit: () => void
}

export function CinemaView({ videoUrl, videoId, gameTitle, onExit }: CinemaViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-hide controls after 3s of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  useEffect(() => {
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }
  }, [])

  const playPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
    resetControlsTimer()
  }, [resetControlsTimer])

  const seek = useCallback((deltaMs: number) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const next = Math.max(0, Math.min(v.duration, v.currentTime + deltaMs / 1000))
    v.currentTime = next
    setCurrentMs(Math.round(next * 1000))
    resetControlsTimer()
  }, [resetControlsTimer])

  // Determine video src
  const videoSrc = videoId
    ? `https://videodelivery.net/${videoId}/manifest/video.m3u8`
    : videoUrl

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onPointerMove={resetControlsTimer}
      onPointerDown={resetControlsTimer}
    >
      {/* ── Film room backdrop ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/filmroom-room.jpg"
        alt="Film room"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      {/* ── Game video composited onto the screen area ──
          Screen sits at roughly: left 8%, top 12%, right 92%, bottom 58%
          of the backdrop image                                          */}
      {videoSrc ? (
        <div
          className="absolute"
          style={{
            left: '8%',
            top: '12%',
            width: '84%',
            height: '46%',
            zIndex: 1,
            overflow: 'hidden',
          }}
          onClick={playPause}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            onTimeUpdate={e => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
            onDurationChange={e => setDurationMs(Math.round(e.currentTarget.duration * 1000))}
            onLoadedMetadata={e => setDurationMs(Math.round(e.currentTarget.duration * 1000))}
            onEnded={() => setIsPlaying(false)}
            playsInline
            preload="metadata"
          />

          {/* Play button overlay when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Jog wheel — appears when paused */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="pointer-events-auto">
              <JogWheel
                visible={!isPlaying && durationMs > 0}
                currentMs={currentMs}
                onScrub={seek}
                onTap={playPause}
              />
            </div>
          </div>
        </div>
      ) : (
        /* No video yet — show placeholder on screen */
        <div
          className="absolute flex items-center justify-center"
          style={{ left: '8%', top: '12%', width: '84%', height: '46%', zIndex: 1, background: 'rgba(0,0,0,0.6)' }}
        >
          <p className="text-white/40 text-sm font-medium">No video uploaded yet</p>
        </div>
      )}

      {/* ── Controls overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10, transition: 'opacity 0.3s', opacity: showControls ? 1 : 0 }}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 pointer-events-auto"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}
        >
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-widest">Film Room</p>
            <p className="text-white font-semibold">{gameTitle}</p>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all border border-white/20 hover:border-white/40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', touchAction: 'manipulation' } as React.CSSProperties}
          >
            Exit Film Room →
          </button>
        </div>

        {/* Bottom scrubber bar */}
        {durationMs > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 pointer-events-auto"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
          >
            {/* Progress bar */}
            <div
              className="relative h-1 bg-white/20 rounded-full cursor-pointer mb-3"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                const v = videoRef.current
                if (v) { v.currentTime = pct * v.duration; setCurrentMs(Math.round(pct * durationMs)) }
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                style={{ width: `${durationMs > 0 ? (currentMs / durationMs) * 100 : 0}%` }}
              />
            </div>

            {/* Play/pause + timecode */}
            <div className="flex items-center gap-4">
              <button
                onClick={playPause}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white hover:border-white/40 transition-all"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', touchAction: 'manipulation' } as React.CSSProperties}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <span className="font-mono text-xs text-white/60 tabular-nums">
                {Math.floor(currentMs / 60000)}:{String(Math.floor((currentMs % 60000) / 1000)).padStart(2, '0')} / {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
