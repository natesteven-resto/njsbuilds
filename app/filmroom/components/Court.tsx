'use client'
import React, { useCallback, useId, useRef, useState } from 'react'

// ─── Half court, drawn to scale ───────────────────────────────────────────────
// Coordinate space is feet on a high-school half court: 50 ft wide, 47 ft deep,
// baseline at the top (y = 0), rim centred at (25, 5.25). Shot locations are
// stored as normalised [0,1] pairs (x across the width, y down from the baseline),
// exactly as the API already expects — this component only changes the drawing.

export const COURT_W = 50
export const COURT_H = 47
const RIM = { x: 25, y: 5.25 }
const THREE_R = 19.75                 // 19'9" high-school arc
const THREE_BASE_DX = Math.sqrt(THREE_R ** 2 - RIM.y ** 2) // where the arc meets the baseline

export type CourtPoint = { x: number; y: number }   // normalised 0..1

export type ZoneFamily = 'rim' | 'paint' | 'mid' | 'three'
export interface ShotZone { family: ZoneFamily; label: string }

/** Human zone label for a normalised court point, from the shooter's perspective (facing the basket). */
export function shotZone(pt: CourtPoint): ShotZone {
  const fx = pt.x * COURT_W, fy = pt.y * COURT_H
  const dx = fx - RIM.x, dy = fy - RIM.y
  const d = Math.hypot(dx, dy)
  const side = dx < -3 ? 'Left' : dx > 3 ? 'Right' : ''
  if (d >= THREE_R) {
    if (fy < 9) return { family: 'three', label: `${side || 'Right'} corner 3` }
    if (Math.abs(dx) < 7.5) return { family: 'three', label: 'Top of the key 3' }
    return { family: 'three', label: `${side} wing 3` }
  }
  if (d <= 4.5) return { family: 'rim', label: 'At the rim' }
  if (fx >= 19 && fx <= 31 && fy <= 19) return { family: 'paint', label: 'Paint' }
  if (fy < 8) return { family: 'mid', label: `${side || 'Right'} baseline` }
  if (Math.abs(dx) < 5) return { family: 'mid', label: 'Free-throw line' }
  if (fy < 22 && Math.abs(dx) <= 10) return { family: 'mid', label: `${side} elbow` }
  return { family: 'mid', label: `${side} wing` }
}

export interface CourtMarker {
  id: string
  x: number
  y: number
  made: boolean
  title?: string
  onClick?: () => void
}

interface CourtProps {
  markers?: CourtMarker[]
  /** Marker being placed right now (pulses). */
  staged?: CourtPoint | null
  /** Tap/click anywhere on the floor. */
  onPlace?: (pt: CourtPoint) => void
  /** Mouse hover position (null when the pointer leaves). Not fired for touch. */
  onHover?: (pt: CourtPoint | null) => void
  onKeyDown?: (e: React.KeyboardEvent<SVGSVGElement>) => void
  /** Short caption drawn inside the court near the half-court line. */
  caption?: string | null
  interactive?: boolean
  dimmed?: boolean
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
  tabIndex?: number
}

const INK = 'rgba(238,233,223,0.82)'
const INK_SOFT = 'rgba(238,233,223,0.42)'
const FLOOR = '#2a2522'
const PAINT = '#372b25'
const BEYOND = '#262120'

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

export const Court = React.memo(function Court({
  markers = [], staged = null, onPlace, onHover, onKeyDown, caption, interactive = false,
  dimmed = false, className = '', style, ariaLabel, tabIndex,
}: CourtProps) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverPt, setHoverPt] = useState<CourtPoint | null>(null)

  const toPoint = useCallback((clientX: number, clientY: number): CourtPoint | null => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const p = svg.createSVGPoint(); p.x = clientX; p.y = clientY
    const local = p.matrixTransform(m.inverse())
    return { x: clamp01(local.x / COURT_W), y: clamp01(local.y / COURT_H) }
  }, [])

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onPlace) return
    const pt = toPoint(e.clientX, e.clientY)
    if (!pt) return
    onPlace({ x: parseFloat(pt.x.toFixed(4)), y: parseFloat(pt.y.toFixed(4)) })
  }
  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || e.pointerType !== 'mouse') return
    const pt = toPoint(e.clientX, e.clientY)
    setHoverPt(pt)
    onHover?.(pt)
  }
  const handleLeave = () => {
    if (!interactive) return
    setHoverPt(null)
    onHover?.(null)
  }

  const arc3 = `M ${(RIM.x - THREE_BASE_DX).toFixed(3)} 0 A ${THREE_R} ${THREE_R} 0 1 0 ${(RIM.x + THREE_BASE_DX).toFixed(3)} 0`
  // Everything beyond the arc, painted slightly darker so the 3-point area reads at a glance
  const beyondPath = `M 0 0 L ${(RIM.x - THREE_BASE_DX).toFixed(3)} 0 A ${THREE_R} ${THREE_R} 0 1 0 ${(RIM.x + THREE_BASE_DX).toFixed(3)} 0 L 50 0 L 50 47 L 0 47 Z`

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${COURT_W} ${COURT_H}`}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel ?? 'Half court'}
      tabIndex={tabIndex}
      onClick={handleClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        display: 'block', width: '100%', height: 'auto', borderRadius: 14, overflow: 'hidden',
        cursor: interactive ? 'crosshair' : 'default', touchAction: 'manipulation',
        opacity: dimmed ? 0.65 : 1, transition: 'opacity 160ms ease', ...style,
      }}
    >
      <defs>
        <pattern id={`planks-${uid}`} width="2.4" height="47" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="0.12" height="47" fill="rgba(255,255,255,0.045)" />
        </pattern>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="12%" r="70%">
          <stop offset="0" stopColor="rgba(255,236,214,0.08)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Floor */}
      <rect x="0" y="0" width={COURT_W} height={COURT_H} fill={FLOOR} />
      <path d={beyondPath} fill={BEYOND} />
      <rect x="19" y="0" width="12" height="19" fill={PAINT} />
      <rect x="0" y="0" width={COURT_W} height={COURT_H} fill={`url(#planks-${uid})`} />
      <rect x="0" y="0" width={COURT_W} height={COURT_H} fill={`url(#glow-${uid})`} />

      {/* Lines */}
      <g fill="none" stroke={INK} strokeWidth="0.32" strokeLinecap="round" strokeLinejoin="round">
        {/* Sidelines + baseline + half-court line */}
        <rect x="0.16" y="0.16" width={COURT_W - 0.32} height={COURT_H - 0.32} />
        {/* Lane */}
        <rect x="19" y="0.16" width="12" height="18.84" />
        {/* Free-throw circle: solid away from the basket, dashed toward it */}
        <path d="M 19 19 A 6 6 0 0 0 31 19" />
        <path d="M 19 19 A 6 6 0 0 1 31 19" strokeDasharray="1.1 0.9" stroke={INK_SOFT} />
        {/* Three-point arc */}
        <path d={arc3} />
        {/* Centre circle (half visible) */}
        <path d="M 19 46.84 A 6 6 0 0 1 31 46.84" />
        {/* Backboard */}
        <line x1="22" y1="4" x2="28" y2="4" strokeWidth="0.42" />
        <line x1="25" y1="4" x2="25" y2="4.5" strokeWidth="0.3" />
      </g>
      {/* Lane blocks and hash marks */}
      <g fill={INK}>
        <rect x="18.2" y="7" width="0.8" height="0.9" />
        <rect x="31" y="7" width="0.8" height="0.9" />
        {[11, 14, 17].map(y => (
          <React.Fragment key={y}>
            <rect x="18.4" y={y} width="0.6" height="0.32" />
            <rect x="31" y={y} width="0.6" height="0.32" />
          </React.Fragment>
        ))}
      </g>
      {/* Rim */}
      <circle cx={RIM.x} cy={RIM.y} r="0.75" fill="none" stroke="#e07a4a" strokeWidth="0.34" />

      {/* Logged shots */}
      {markers.map(m => {
        const cx = m.x * COURT_W, cy = m.y * COURT_H
        const clickable = !!m.onClick
        return m.made ? (
          <circle key={m.id} cx={cx} cy={cy} r="0.95" fill="#d9774a" stroke="rgba(238,233,223,0.9)" strokeWidth="0.22"
            role={clickable ? 'button' : undefined} aria-label={m.title} tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? (e) => { e.stopPropagation(); m.onClick?.() } : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); m.onClick?.() } } : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}>
            {m.title && <title>{m.title}</title>}
          </circle>
        ) : (
          <circle key={m.id} cx={cx} cy={cy} r="0.9" fill="rgba(20,16,14,0.55)" stroke="rgba(238,233,223,0.85)" strokeWidth="0.3"
            role={clickable ? 'button' : undefined} aria-label={m.title} tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? (e) => { e.stopPropagation(); m.onClick?.() } : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); m.onClick?.() } } : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}>
            {m.title && <title>{m.title}</title>}
          </circle>
        )
      })}

      {/* Hover ghost (mouse only) */}
      {interactive && hoverPt && !staged && (
        <g pointerEvents="none">
          <circle cx={hoverPt.x * COURT_W} cy={hoverPt.y * COURT_H} r="1.1" fill="none" stroke="rgba(238,233,223,0.5)" strokeWidth="0.25" strokeDasharray="0.6 0.5" />
        </g>
      )}

      {/* Staged marker (being placed) */}
      {staged && (
        <g pointerEvents="none">
          <circle cx={staged.x * COURT_W} cy={staged.y * COURT_H} r="1.3" fill="none" stroke="#e07a4a" strokeWidth="0.3" opacity="0.8">
            <animate attributeName="r" values="1.3;3.2" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.1s" repeatCount="indefinite" />
          </circle>
          <circle cx={staged.x * COURT_W} cy={staged.y * COURT_H} r="1.15" fill="#e07a4a" stroke="#fff4ea" strokeWidth="0.3" />
        </g>
      )}

      {caption && (
        <text x={COURT_W / 2} y={COURT_H - 2.2} textAnchor="middle" fontSize="2.1" fontWeight="700"
          fill="rgba(238,233,223,0.78)" style={{ fontFamily: 'var(--font-bc), Arial Narrow, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }} pointerEvents="none">
          {caption}
        </text>
      )}
    </svg>
  )
})
