'use client'

import { useEffect, useRef, useState } from 'react'
import { monthLabelShort } from '../_lib/dates'
import { fmtMoney, fmtMoneyShort } from '../_lib/money'
import type { MonthPoint } from '../_lib/reports'

/** Width of a container element, measured with ResizeObserver (fallback until mounted). */
function useWidth(fallback: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width
      if (cw) setW(Math.round(cw))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** Grouped monthly bars: income vs expense, with NOI as a line. Pure SVG drawn at real pixel size so text stays crisp. */
export function MonthlyBars({ data, height = 220 }: { data: MonthPoint[]; height?: number }) {
  const [ref, W] = useWidth(600)
  const H = height
  const padL = 48, padR = 8, padT = 12, padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)))
  const niceMax = niceCeil(max)
  const groupW = innerW / Math.max(1, data.length)
  const barW = Math.min(18, groupW * 0.32)
  const y = (v: number) => padT + innerH - (v / niceMax) * innerH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax)
  const noiPts = data.map((d, i) => {
    const cx = padL + groupW * i + groupW / 2
    return [cx, y(Math.max(0, Math.min(niceMax, d.noi)))] as const
  })
  const noiPath = noiPts.map(([x, yy], i) => (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + yy.toFixed(1)).join(' ')

  return (
    <div ref={ref} style={{ width: '100%' }}>
    <svg className="db-chart" width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Monthly income and expenses">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#222b3a" strokeWidth={1} />
          <text x={padL - 6} y={y(t) + 4} fontSize={10.5} fill="#5b6778" textAnchor="end" className="db-num">{fmtMoneyShort(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = padL + groupW * i + groupW / 2
        return (
          <g key={d.month}>
            <rect x={cx - barW - 1.5} y={y(d.income)} width={barW} height={Math.max(0, padT + innerH - y(d.income))} rx={3} fill="#34d399" opacity={0.9}>
              <title>{monthLabelShort(d.month) + ' income ' + fmtMoney(d.income)}</title>
            </rect>
            <rect x={cx + 1.5} y={y(d.expense)} width={barW} height={Math.max(0, padT + innerH - y(d.expense))} rx={3} fill="#fb7185" opacity={0.85}>
              <title>{monthLabelShort(d.month) + ' expenses ' + fmtMoney(d.expense)}</title>
            </rect>
            <text x={cx} y={H - 8} fontSize={11} fill="#8e9ab0" textAnchor="middle">{monthLabelShort(d.month)}</text>
          </g>
        )
      })}
      <path d={noiPath} fill="none" stroke="#f0b429" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
      {noiPts.map(([x, yy], i) => <circle key={i} cx={x} cy={yy} r={2.6} fill="#f0b429" />)}
    </svg>
    </div>
  )
}

export function Sparkline({ values, color = '#f0b429', width = 120, height = 34 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} />
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)] as const)
  const d = pts.map(([x, y], i) => (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ')
  const zero = height - 3 - ((0 - min) / span) * (height - 6)
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
      {min < 0 && <line x1={0} x2={width} y1={zero} y2={zero} stroke="#2d3850" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Legend() {
  return (
    <div className="db-legend">
      <span><i className="db-dot" style={{ background: '#34d399' }} />Income</span>
      <span><i className="db-dot" style={{ background: '#fb7185' }} />Expenses</span>
      <span><i className="db-dot" style={{ background: '#f0b429' }} />NOI</span>
    </div>
  )
}

function niceCeil(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * exp
}
