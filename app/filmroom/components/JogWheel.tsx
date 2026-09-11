'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface JogWheelProps {
  visible: boolean          // shown when paused
  currentMs: number
  onScrub: (deltaMs: number) => void
  onTap: () => void         // tap wheel → play
}

const SIZE = 110            // wheel diameter px
const TICK_COUNT = 36       // tick marks around the ring
const MS_PER_DEG = 33.33    // ~1 frame per degree at 30fps (slow drag = frame by frame)

export function JogWheel({ visible, currentMs, onScrub, onTap }: JogWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const lastX = useRef<number | null>(null)
  const accum = useRef(0)   // accumulated ms for frame stepping
  const wheelRef = useRef<HTMLDivElement>(null)

  function msToTimecode(ms: number) {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    const f = Math.floor((ms % 1000) / 33)
    return `${m}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    lastX.current = e.clientX
    accum.current = 0
    setIsDragging(true)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || lastX.current === null) return
    e.preventDefault()

    const dx = e.clientX - lastX.current
    lastX.current = e.clientX

    // Rotate the wheel visually
    const degsPerPx = 1.2
    const deltaDeg = dx * degsPerPx
    setRotation(r => r + deltaDeg)

    // Scrub the video — velocity sensitive
    const deltaMs = dx * MS_PER_DEG
    onScrub(deltaMs)
  }, [isDragging, onScrub])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const totalDx = Math.abs((e.clientX) - (lastX.current ?? e.clientX))
    setIsDragging(false)
    lastX.current = null
    // If it was essentially a tap (no drag), treat as play
    if (totalDx < 4) onTap()
  }, [isDragging, onTap])

  // Tick mark angles
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => ({
    angle: (i * 360) / TICK_COUNT,
    major: i % 9 === 0,
  }))

  const R = SIZE / 2
  const indicatorAngle = (rotation % 360) * (Math.PI / 180)

  return (
    <div
      className="absolute bottom-4 right-4 flex flex-col items-center gap-1.5 select-none"
      style={{
        zIndex: 30,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }}
    >
      {/* Timecode */}
      <div
        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-white/90 tracking-wider"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          letterSpacing: '0.08em',
        }}
      >
        {msToTimecode(currentMs)}
      </div>

      {/* Wheel */}
      <div
        ref={wheelRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
          // Liquid glass base
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 60%, rgba(0,0,0,0.4) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: isDragging
            ? '0 0 0 2px rgba(37,99,235,0.7), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 0 0 1px rgba(37,99,235,0.3), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* SVG: tick marks + indicator dot */}
        <svg
          width={SIZE}
          height={SIZE}
          style={{ position: 'absolute', top: 0, left: 0, transform: `rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
        >
          {/* Outer ring glow */}
          <circle
            cx={R} cy={R} r={R - 3}
            fill="none"
            stroke="rgba(37,99,235,0.25)"
            strokeWidth="2"
          />

          {/* Tick marks */}
          {ticks.map(({ angle, major }) => {
            const rad = (angle - 90) * (Math.PI / 180)
            const outerR = R - 5
            const innerR = major ? R - 14 : R - 10
            return (
              <line
                key={angle}
                x1={R + Math.cos(rad) * outerR}
                y1={R + Math.sin(rad) * outerR}
                x2={R + Math.cos(rad) * innerR}
                y2={R + Math.sin(rad) * innerR}
                stroke={major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)'}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
              />
            )
          })}

          {/* Indicator dot at top */}
          <circle
            cx={R}
            cy={10}
            r={4}
            fill="rgba(37,99,235,0.9)"
            style={{ filter: 'drop-shadow(0 0 4px rgba(37,99,235,0.8))' }}
          />
        </svg>

        {/* Center hub */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22), rgba(0,0,0,0.35))',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Drag hint */}
      {!isDragging && (
        <div className="text-[10px] text-white/30 font-medium tracking-wide">
          ← drag →
        </div>
      )}
    </div>
  )
}
