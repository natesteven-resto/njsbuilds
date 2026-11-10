'use client'
// QA ONLY (branch): renders the preview inside an iframe of a chosen size so headless Chrome can capture real phone/tablet layouts.
// /frpreview/frame?w=390&h=844&auto=stat1
import { useEffect, useState } from 'react'

export default function Frame() {
  const [cfg, setCfg] = useState<{ w: number; h: number; auto: string } | null>(null)
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    setCfg({ w: Number(q.get('w') ?? 390), h: Number(q.get('h') ?? 844), auto: q.get('auto') ?? '' })
  }, [])
  if (!cfg) return null
  const src = `/frpreview/game/preview${cfg.auto ? `?auto=${encodeURIComponent(cfg.auto)}` : ''}`
  return (
    <div style={{ padding: 24, background: '#0b0b0a', minHeight: '100vh' }}>
      <iframe title="preview" src={src} width={cfg.w} height={cfg.h} style={{ border: '1px solid #333', borderRadius: 12, display: 'block', background: '#141412' }} />
    </div>
  )
}
