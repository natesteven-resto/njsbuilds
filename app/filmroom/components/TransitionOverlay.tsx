'use client'

import { useEffect, useRef } from 'react'

interface TransitionOverlayProps {
  targetUrl: string
  onCancel: () => void
}

export function TransitionOverlay({ targetUrl, onCancel }: TransitionOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.play().catch(() => {
      // Autoplay blocked — skip straight to film room
      window.location.href = targetUrl
    })

    const handleEnded = () => {
      window.location.href = targetUrl
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
    </div>
  )
}
