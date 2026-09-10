'use client'

import { useEffect, useRef } from 'react'

interface StreamPlayerProps {
  videoId: string
  onTimeUpdate: (ms: number) => void
  onDurationChange: (ms: number) => void
  playerRef: React.RefObject<HTMLVideoElement | null>
}

/**
 * Cloudflare Stream player using HLS via native <video>.
 * Gives us direct currentTime access for frame-accurate scrubbing —
 * unlike the Stream iframe embed which is a black box.
 */
export function StreamPlayer({ videoId, onTimeUpdate, onDurationChange, playerRef }: StreamPlayerProps) {
  const hlsRef = useRef<unknown>(null)

  const hlsUrl = `https://cloudflarestream.com/${videoId}/manifest/video.m3u8`
  const mp4Url = `https://cloudflarestream.com/${videoId}/downloads/default.mp4`

  useEffect(() => {
    const video = playerRef.current
    if (!video) return

    // Safari supports HLS natively — just set src
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      return
    }

    // Chrome/Firefox: use HLS.js
    let destroyed = false
    import('hls.js').then(({ default: Hls }) => {
      if (destroyed) return
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true })
        hlsRef.current = hls
        hls.loadSource(hlsUrl)
        hls.attachMedia(video)
      } else {
        // HLS.js not supported — fall back to MP4
        video.src = mp4Url
      }
    })

    return () => {
      destroyed = true
      const hls = hlsRef.current as { destroy?: () => void } | null
      hls?.destroy?.()
      hlsRef.current = null
    }
  }, [videoId, hlsUrl, mp4Url, playerRef])

  return (
    <video
      ref={playerRef}
      className="w-full aspect-video bg-black rounded-t-xl"
      onTimeUpdate={(e) => onTimeUpdate(Math.round(e.currentTarget.currentTime * 1000))}
      onDurationChange={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      onLoadedMetadata={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      playsInline
      preload="metadata"
    />
  )
}
