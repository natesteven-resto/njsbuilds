'use client'

import { useState } from 'react'

export default function CalibratePage() {
  const [points, setPoints] = useState<{ x: number; y: number; label: string }[]>([])
  const labels = ['Top-Left corner of screen', 'Top-Right corner', 'Bottom-Left corner', 'Bottom-Right corner']

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 4) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPoints(prev => [...prev, { x, y, label: labels[prev.length] }])
  }

  const result = points.length === 4 ? {
    left: Math.min(points[0].x, points[2].x).toFixed(1),
    top: Math.min(points[0].y, points[1].y).toFixed(1),
    width: (Math.max(points[1].x, points[3].x) - Math.min(points[0].x, points[2].x)).toFixed(1),
    height: (Math.max(points[2].y, points[3].y) - Math.min(points[0].y, points[1].y)).toFixed(1),
  } : null

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
      <p className="text-white text-sm font-medium">
        {points.length < 4 ? `Tap: ${labels[points.length]}` : 'Done! Send me the result below.'}
      </p>

      <div
        className="relative w-full max-w-4xl cursor-crosshair"
        onClick={handleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/filmroom-room.jpg" alt="" className="w-full rounded-xl" />

        {/* Dot markers */}
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="text-white text-[8px] font-bold">{i + 1}</span>
          </div>
        ))}
      </div>

      {result && (
        <div className="bg-white/10 rounded-xl p-4 text-white font-mono text-sm text-center">
          <p className="font-bold mb-2">Send this to me:</p>
          <p>left: '{result.left}%'</p>
          <p>top: '{result.top}%'</p>
          <p>width: '{result.width}%'</p>
          <p>height: '{result.height}%'</p>
        </div>
      )}

      {points.length > 0 && points.length < 4 && (
        <button onClick={() => setPoints([])} className="text-white/40 text-xs underline">
          Reset
        </button>
      )}
    </div>
  )
}
