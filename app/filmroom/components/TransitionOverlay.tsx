'use client'

import { useEffect, useRef, useState } from 'react'
import { CinemaView } from './CinemaView'

interface TransitionOverlayProps {
  gameId: string
  videoUrl: string | null
  videoId: string | null
  gameTitle: string
  onExit: () => void        // cinema Exit → full film room UI
  onCancel: () => void      // if transition fails, close overlay
}

export function TransitionOverlay({ gameId, videoUrl, videoId, gameTitle, onExit, onCancel }: TransitionOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<'transition' | 'cinema'>('transition')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.play().catch(() => {
      // Autoplay blocked — skip straight to cinema
      setPhase('cinema')
    })

    const handleEnded = () => {
      // Video ended — freeze on last frame, mount cinema view on top
      setPhase('cinema')
    }

    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [])

  return (
    <>
      {/* Transition video — always mounted, freezes on last frame when ended */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: '#000',
        }}
      >
        <video
          ref={videoRef}
          src="/filmroom-transition.mp4"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          muted
          preload="auto"
        />
      </div>

      {/* Cinema view — mounts on top when transition ends, composites game video onto screen */}
      {phase === 'cinema' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <CinemaView
            videoUrl={videoUrl}
            videoId={videoId}
            gameTitle={gameTitle}
            onExit={onExit}
          />
        </div>
      )}
    </>
  )
}
