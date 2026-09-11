'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface TransitionOverlayProps {
  targetUrl: string
  onComplete: () => void
}

export function TransitionOverlay({ targetUrl, onComplete }: TransitionOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Preload and play immediately
    video.play().catch(() => {
      // If autoplay blocked, skip straight to destination
      router.push(targetUrl)
      onComplete()
    })

    const handleEnded = () => {
      router.push(targetUrl)
      onComplete()
    }

    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [targetUrl, router, onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
  )
}
