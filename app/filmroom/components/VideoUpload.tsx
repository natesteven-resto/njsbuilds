'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, Loader2, Film } from 'lucide-react'

interface VideoUploadProps {
  gameId: string
  onUploadComplete: (videoId: string, videoUrl: string) => void
}

export function VideoUpload({ gameId, onUploadComplete }: VideoUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.')
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // 1. Get a one-time upload URL from Cloudflare Stream
      const res = await fetch('/api/filmroom/upload')
      if (!res.ok) throw new Error('Could not get upload URL')
      const { uploadUrl, videoId } = await res.json()

      // 2. Upload directly to Cloudflare Stream via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('POST', uploadUrl)
        const fd = new FormData()
        fd.append('file', file)
        xhr.send(fd)
      })

      // 3. Save video ID + playback URL to the game record
      const videoUrl = `https://customer-${process.env.NEXT_PUBLIC_CF_CUSTOMER_CODE ?? 'stream'}.cloudflarestream.com/${videoId}/manifest/video.m3u8`
      await fetch(`/api/filmroom/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, video_url: videoUrl }),
      })

      setDone(true)
      onUploadComplete(videoId, videoUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [gameId, onUploadComplete])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  if (done) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Video uploaded successfully</p>
          <p className="text-xs text-emerald-400/60 mt-0.5">Processing may take a few minutes before playback is available</p>
        </div>
      </div>
    )
  }

  if (uploading) {
    return (
      <div className="space-y-3 px-4 py-4 rounded-xl bg-white/4 border border-white/8">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          Uploading to Cloudflare Stream... {progress}%
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-white/30">Large files may take a few minutes</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-500/60 bg-blue-500/8'
            : 'border-white/10 hover:border-white/20 hover:bg-white/2'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/6 flex items-center justify-center">
            <Film className="w-6 h-6 text-white/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Drop video file here</p>
            <p className="text-xs text-white/30 mt-1">or click to browse · MP4, MOV, AVI · any size</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Direct upload to Cloudflare Stream</span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
          }}
        />
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}
