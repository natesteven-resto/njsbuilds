'use client'

import { useEffect, useRef, useState } from 'react'

interface TransitionOverlayProps {
  targetUrl: string
  onCancel: () => void
}

export function TransitionOverlay({ targetUrl, onCancel }: TransitionOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [fadeToBlack, setFadeToBlack] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.play().catch(() => {
      window.location.href = targetUrl
    })

    const handleEnded = () => {
      // Fade to black, then navigate
      setFadeToBlack(true)
      setTimeout(() => {
        window.location.href = targetUrl
      }, 600)
    }

    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [targetUrl])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}
      onClick={onCancel}
    >
      <video
        ref={videoRef}
        src="/filmroom-transition.mp4"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
        preload="auto"
      />
      {/* Fade to black overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        opacity: fadeToBlack ? 1 : 0,
        transition: 'opacity 0.6s ease-in',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
