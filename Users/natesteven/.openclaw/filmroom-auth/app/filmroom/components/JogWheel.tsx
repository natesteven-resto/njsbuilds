'use client'

import { useRef, useState, useCallback } from 'react'

interface JogWheelProps {
  visible: boolean
  currentMs: number
  onScrub: (deltaMs: number) => void
  onTap: () => void
}

const SIZE = 120
const TICK_COUNT = 36
const MS_PER_DEG = 50  // ms per degree of rotation (~30 frames per full rotation)

function msToTimecode(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const f = Math.floor((ms % 1000) / 33)
  return `${m}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`
}

export function JogWheel({ visible, currentMs, onScrub, onTap }: JogWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const lastAngle = useRef<number | null>(null)
  const totalMovement = useRef(0)

  // Get angle in degrees of pointer relative to wheel center
  const getAngle = useCallback((clientX: number, clientY: number): number => {
    const el = wheelRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture on the wheel div itself, not target, to avoid position jump
    wheelRef.current?.setPointerCapture(e.pointerId)
    lastAngle.current = getAngle(e.clientX, e.clientY)
    totalMovement.current = 0
    setIsDragging(true)
  }, [getAngle])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || lastAngle.current === null) return
    e.preventDefault()

    const angle = getAngle(e.clientX, e.clientY)
    let delta = angle - lastAngle.current

    // Normalize delta to [-180, 180] to handle the 180/-180 crossing
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360

    lastAngle.current = angle
    totalMovement.current += Math.abs(delta)

    setRotation(r => r + delta)
    onScrub(delta * MS_PER_DEG)
  }, [isDragging, getAngle, onScrub])

  const onPointerUp = useCallback(() => {
    if (!isDragging) return
    const wasTap = totalMovement.current < 8
    setIsDragging(false)
    lastAngle.current = null
    totalMovement.current = 0
    if (wasTap) onTap()
    // else: stay paused at current frame
  }, [isDragging, onTap])

  const R = SIZE / 2
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => ({
    angle: (i * 360) / TICK_COUNT,
    major: i % 9 === 0,
  }))

  return (
    <div
      className="absolute bottom-4 right-4 flex flex-col items-center gap-1.5 select-none"
      style={{
        zIndex: 30,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Timecode */}
      <div
        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-white/90 tracking-wider"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
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
          // Liquid glass
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 55%, rgba(0,0,0,0.45) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${isDragging ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.18)'}`,
          boxShadow: isDragging
            ? '0 0 0 2px rgba(37,99,235,0.5), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 0 0 1px rgba(37,99,235,0.2), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {/* Rotating SVG layer */}
        <svg
          width={SIZE}
          height={SIZE}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            transform: `rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
        >
          {/* Blue ring */}
          <circle
            cx={R} cy={R} r={R - 4}
            fill="none"
            stroke="rgba(37,99,235,0.22)"
            strokeWidth="2"
          />

          {/* Tick marks */}
          {ticks.map(({ angle, major }) => {
            const rad = (angle - 90) * (Math.PI / 180)
            const outerR = R - 6
            const innerR = major ? R - 16 : R - 11
            return (
              <line
                key={angle}
                x1={R + Math.cos(rad) * outerR}
                y1={R + Math.sin(rad) * outerR}
                x2={R + Math.cos(rad) * innerR}
                y2={R + Math.sin(rad) * innerR}
                stroke={major ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.22)'}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
              />
            )
          })}

          {/* Indicator dot at top */}
          <circle
            cx={R} cy={7}
            r={4.5}
            fill="#2563EB"
            style={{ filter: 'drop-shadow(0 0 5px rgba(37,99,235,0.9))' }}
          />
        </svg>

        {/* Center hub — non-rotating */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 34, height: 34,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 33%, rgba(255,255,255,0.25), rgba(0,0,0,0.4))',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hint */}
      {!isDragging && (
        <div className="text-[10px] text-white/25 font-medium tracking-wide">
          spin to scrub
        </div>
      )}
    </div>
  )
}
