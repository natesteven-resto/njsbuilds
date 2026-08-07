'use client'

import { useState, useEffect } from 'react'

// ─── COURT DIAGRAM COMPONENT ───────────────────────────────────────────────

type PlayerDot = {
  id: string
  label: string
  x: number // 0-100 percent of court width
  y: number // 0-100 percent of court height
  color: string
  isHighlight?: boolean
}

type Arrow = {
  fromX: number
  fromY: number
  toX: number
  toY: number
  color: string
  dashed?: boolean
  label?: string
}

type CourtStep = {
  title: string
  description: string
  players: PlayerDot[]
  arrows: Arrow[]
  callout?: string
}

const COURT_W = 500
const COURT_H = 470

function pct(val: number, total: number) { return (val / 100) * total }

function CourtDiagram({ steps }: { steps: CourtStep[] }) {
  const [step, setStep] = useState(0)
  const current = steps[step]

  useEffect(() => { setStep(0) }, [steps])

  function arrowPath(a: Arrow) {
    const x1 = pct(a.fromX, COURT_W)
    const y1 = pct(a.fromY, COURT_H)
    const x2 = pct(a.toX, COURT_W)
    const y2 = pct(a.toY, COURT_H)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2 - 30
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
  }

  return (
    <div>
      {/* Step indicators */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: step === i ? '#FF5F04' : 'rgba(255,255,255,0.05)',
              color: step === i ? '#fff' : '#6B7280',
              border: step === i ? '1px solid #FF5F04' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Court SVG */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#1a3a1a', border: '2px solid rgba(255,255,255,0.1)' }}>
        <svg viewBox={`0 0 ${COURT_W} ${COURT_H}`} width="100%" style={{ display: 'block' }}>
          {/* Court background */}
          <rect width={COURT_W} height={COURT_H} fill="#2d5a2d" />

          {/* Court outline */}
          <rect x="20" y="20" width={COURT_W - 40} height={COURT_H - 40} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

          {/* Half court line */}
          {/* (not shown — we show only half court) */}

          {/* Paint / key */}
          <rect x="175" y="20" width="150" height="160" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

          {/* Free throw circle */}
          <circle cx="250" cy="180" r="60" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />

          {/* Basket */}
          <circle cx="250" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
          <line x1="220" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
          <line x1="250" y1="20" x2="250" y2="50" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />

          {/* 3-point arc */}
          <path
            d="M 40 20 L 40 195 A 215 215 0 0 0 460 195 L 460 20"
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
          />

          {/* Lane lines */}
          <line x1="175" y1="20" x2="175" y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="325" y1="20" x2="325" y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Restricted area arc */}
          <path d="M 220 20 A 30 30 0 0 1 280 20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

          {/* Short corner markers */}
          <line x1="20" y1="175" x2="60" y2="175" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="440" y1="175" x2="480" y2="175" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4,4" />

          {/* Arrows */}
          {current.arrows.map((a, i) => {
            const path = arrowPath(a)
            const x2 = pct(a.toX, COURT_W)
            const y2 = pct(a.toY, COURT_H)
            const id = `arrow-${i}`
            return (
              <g key={i}>
                <defs>
                  <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill={a.color} />
                  </marker>
                </defs>
                <path
                  d={path}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="2.5"
                  strokeDasharray={a.dashed ? '6,4' : undefined}
                  markerEnd={`url(#${id})`}
                  opacity="0.9"
                />
                {a.label && (
                  <text
                    x={(pct(a.fromX, COURT_W) + pct(a.toX, COURT_W)) / 2}
                    y={(pct(a.fromY, COURT_H) + pct(a.toY, COURT_H)) / 2 - 28}
                    textAnchor="middle"
                    fill={a.color}
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {a.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Players */}
          {current.players.map((p) => {
            const cx = pct(p.x, COURT_W)
            const cy = pct(p.y, COURT_H)
            return (
              <g key={p.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={p.isHighlight ? 22 : 19}
                  fill={p.color}
                  stroke={p.isHighlight ? '#FFD700' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={p.isHighlight ? 3 : 1.5}
                />
                <text
                  x={cx}
                  y={cy - 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={p.isHighlight ? "11" : "10"}
                  fontWeight="bold"
                >
                  {p.label}
                </text>
              </g>
            )
          })}

          {/* Legend */}
          <g transform="translate(25, 390)">
            <rect x="0" y="0" width="200" height="68" rx="6" fill="rgba(0,0,0,0.5)" />
            <circle cx="16" cy="14" r="10" fill="#FF5F04" stroke="#FFD700" strokeWidth="2" />
            <text x="32" y="18" fill="white" fontSize="10">Star player</text>
            <circle cx="16" cy="34" r="10" fill="#3B82F6" />
            <text x="32" y="38" fill="white" fontSize="10">Starter</text>
            <line x1="6" y1="54" x2="30" y2="54" stroke="#FFD700" strokeWidth="2.5" markerEnd="url(#arrow-legend)" />
            <text x="36" y="58" fill="#FFD700" fontSize="10">Drive / cut</text>
            <line x1="100" y1="54" x2="124" y2="54" stroke="#aaa" strokeWidth="2" strokeDasharray="4,3" />
            <text x="130" y="58" fill="#aaa" fontSize="10">Pass</text>
          </g>
        </svg>
      </div>

      {/* Step description */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="font-bold text-white mb-1">{current.title}</p>
        <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>{current.description}</p>
        {current.callout && (
          <div
            className="mt-3 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(255,95,4,0.15)', color: '#FF5F04', border: '1px solid rgba(255,95,4,0.3)' }}
          >
            {current.callout}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: step === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
            color: step === 0 ? '#374151' : '#D1D5DB',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          ← Prev
        </button>
        <button
          onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: step === steps.length - 1 ? 'rgba(255,255,255,0.03)' : '#FF5F04',
            color: step === steps.length - 1 ? '#374151' : '#fff',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ─── CHIN SERIES STEPS ─────────────────────────────────────────────────────
// Court is 500w x 470h. Basket at top center (250, 50).
// y increases downward. Players start near half court (y ~85-95%).
//
// Positions (% of court):
//   Laken (PG)  — top of key, brings ball up:        x:50, y:72
//   Nathan (SG) — right wing, 3pt line:              x:78, y:48
//   Dayton (SF) — left corner, 3pt:                  x:12, y:35
//   Kade (C)    — elbow / high post:                 x:50, y:42
//   Rex/4 (PF)  — right corner, 3pt:                 x:88, y:35

const LAKEN_COLOR = '#3B82F6'
const NATHAN_COLOR = '#FF5F04'
const DAYTON_COLOR = '#8B5CF6'
const KADE_COLOR = '#6B7280'
const REX_COLOR = '#10B981'

const chinSteps: CourtStep[] = [
  {
    title: 'Initial Setup',
    description: 'Laken brings the ball up to the top of the key. Nathan is on the right wing near the 3-point line. Dayton is in the left corner (weak side). Rex is in the right corner (strong side). Kade is at the high post / elbow — he\'s about to set the ball screen on Laken.',
    players: [
      { id: 'L', label: 'Laken', x: 50, y: 72, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 78, y: 50, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 44, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [],
    callout: '📍 Nathan starts wide on the right wing — away from the ball screen side. This matters.',
  },
  {
    title: 'Kade Sets Ball Screen',
    description: 'Kade steps out and sets a ball screen on Laken\'s defender at the top of the key. Laken uses it. The defense now has THREE options — go under, go over, or switch. All three are bad for them. Nathan stays wide on the wing, Dayton holds the left corner.',
    players: [
      { id: 'L', label: 'Laken', x: 50, y: 72, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 78, y: 50, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 58, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 50, fromY: 44, toX: 50, toY: 58, color: '#6B7280', label: 'Screen' },
    ],
    callout: '🔑 Triple Gap: Laken can go LEFT of screen, RIGHT of screen, or Kade can roll to rim.',
  },
  {
    title: 'Read 1 — Laken Turns Corner (Drive)',
    description: 'Defense goes under the screen or hedges late. Laken turns the corner and attacks the lane hard. The defense collapses. Now it\'s a kick-out decision: Nathan on the right wing is wide open for the 3. Dayton in the left corner is open if the help rotates to Nathan.',
    players: [
      { id: 'L', label: 'Laken', x: 35, y: 52, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 78, y: 50, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 55, y: 45, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 50, fromY: 72, toX: 35, toY: 52, color: LAKEN_COLOR, label: 'Drive' },
      { fromX: 35, fromY: 52, toX: 78, toY: 50, color: '#aaaaaa', dashed: true, label: 'Kick-out' },
      { fromX: 55, fromY: 45, toX: 48, toY: 22, color: KADE_COLOR, dashed: true, label: 'Roll' },
    ],
    callout: '🎯 Nathan catches on the wing — catch and shoot. If his man helps, skip to Dayton corner.',
  },
  {
    title: 'Read 2 — Laken Rejects, Hits Nathan at Elbow',
    description: 'Defense cheats hard over the screen anticipating the drive. Laken rejects (goes away from screen), dribbles to the right, and hits Nathan cutting to the elbow. Now Nathan\'s reads begin — this is the SPLIT ACTION.',
    players: [
      { id: 'L', label: 'Laken', x: 63, y: 65, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 65, y: 44, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 58, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 50, fromY: 72, toX: 63, toY: 65, color: LAKEN_COLOR, label: 'Reject' },
      { fromX: 63, fromY: 65, toX: 65, toY: 44, color: '#aaaaaa', dashed: true, label: 'Pass' },
      { fromX: 78, fromY: 50, toX: 65, toY: 44, color: NATHAN_COLOR, label: 'Cuts to elbow' },
    ],
    callout: '🧠 Nathan is at the elbow. Defense has to decide RIGHT NOW. Nathan reads them.',
  },
  {
    title: 'Split Read A — Nathan Shoots (Closeout Flat)',
    description: 'Nathan\'s defender closeouts flat or late. Nathan pulls up from the elbow for the mid-range or steps into a 3 if he caught higher. This is the simplest read — defender gives you the shot, you take it.',
    players: [
      { id: 'L', label: 'Laken', x: 63, y: 65, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 65, y: 44, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 58, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 65, fromY: 44, toX: 50, toY: 14, color: NATHAN_COLOR, label: 'Shot' },
    ],
    callout: '🎯 Read: Defender gives you space → Nathan shoots. Simplest. Fastest.',
  },
  {
    title: 'Split Read B — Nathan Drives Baseline',
    description: 'Nathan\'s defender overplays the passing lane or leans toward the middle. Nathan drives baseline toward the right block. Kade has rolled to the short corner / weak side — if baseline help comes, Kade is right there for the dump-off or kick.',
    players: [
      { id: 'L', label: 'Laken', x: 63, y: 65, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 65, y: 44, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 82, y: 35, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 65, fromY: 44, toX: 80, toY: 28, color: NATHAN_COLOR, label: 'Baseline drive' },
      { fromX: 80, fromY: 28, toX: 82, toY: 35, color: '#aaaaaa', dashed: true, label: 'Dump to Kade' },
    ],
    callout: '⚡ Read: Defender cheats high → Nathan goes baseline. Kade is the safety valve.',
  },
  {
    title: 'Split Read C — Skip to Dayton Corner',
    description: 'Both defenders collapse on Nathan at the elbow. Dayton has been standing in the left corner the whole play. The weak-side defense cheated in to help. Nathan swing-passes to Laken, Laken reverses to Dayton in the corner. Rhythm 3 for the lefty — nobody chased him.',
    players: [
      { id: 'L', label: 'Laken', x: 63, y: 65, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 65, y: 44, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 55, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 65, fromY: 44, toX: 63, toY: 65, color: '#aaaaaa', dashed: true, label: 'Swing' },
      { fromX: 63, fromY: 65, toX: 12, toY: 38, color: '#aaaaaa', dashed: true, label: 'Reverse' },
      { fromX: 12, fromY: 38, toX: 12, toY: 14, color: DAYTON_COLOR, label: 'Shot' },
    ],
    callout: '🏹 Read: Defense collapses → Dayton corner 3. Nobody closes on a lefty in the corner.',
  },
  {
    title: 'Kade Roll — The Bonus Read',
    description: 'If the defense switches the ball screen AND both wings are covered, Kade\'s man just left him to take Laken. Kade rolls hard to the rim. Laken hits him in stride for a layup. This only needs to happen 2-3 times a game to keep the defense honest on every future screen.',
    players: [
      { id: 'L', label: 'Laken', x: 50, y: 72, color: LAKEN_COLOR },
      { id: 'N', label: 'Nathan', x: 78, y: 50, color: NATHAN_COLOR, isHighlight: true },
      { id: 'D', label: 'Dayton', x: 12, y: 38, color: DAYTON_COLOR },
      { id: 'K', label: 'Kade', x: 50, y: 22, color: KADE_COLOR },
      { id: 'R', label: 'Rex', x: 88, y: 38, color: REX_COLOR },
    ],
    arrows: [
      { fromX: 50, fromY: 58, toX: 50, toY: 22, color: KADE_COLOR, label: 'Roll to rim' },
      { fromX: 50, fromY: 72, toX: 50, toY: 22, color: '#aaaaaa', dashed: true, label: 'Lob/bounce' },
    ],
    callout: '🧱 Switch? Kade rolls free. Hit him for the layup. Defense can\'t switch this forever.',
  },
]

// ─── PLAYERS / ROSTER ───────────────────────────────────────────────────────

const players = [
  {
    name: 'Nathan', position: 'SG / Co-PG', role: 'Primary Scorer', emoji: '🎯', highlight: true,
    strengths: ['3-point shooter', 'Shoots off anything', 'Smart — reads defense', 'Layups', 'Elbow split action'],
    notes: 'The engine. Every Chin series action either gets him a look or opens someone else because of the attention he commands.',
    tag: 'Star', tagColor: '#FF5F04',
  },
  {
    name: 'Laken', position: 'PG', role: 'Floor General', emoji: '⚡', highlight: false,
    strengths: ['Downhill driver', 'Gets to the rim', 'Uses ball screens', 'ISO set (called play)'],
    notes: 'Initiates every Chin possession. Uses Kade\'s screen, reads the triple gap, decides: turn corner, reject, or wait for the switch. Defense has to pick their poison on him.',
    tag: 'Starter', tagColor: '#3B82F6',
  },
  {
    name: 'Dayton', position: 'SF', role: 'Weak-Side Corner', emoji: '🏹', highlight: false,
    strengths: ['Lefty corner 3', 'Spaces weak side', 'High effort', 'Corner skip target'],
    notes: 'Parks in the left corner every possession and stays there. He\'s the release valve when Nathan\'s elbow reads collapse. Nobody closes on a lefty 8th-grader in the corner.',
    tag: 'Starter', tagColor: '#3B82F6',
  },
  {
    name: 'Kade', position: 'C', role: 'Ball Screener / Roller', emoji: '🧱', highlight: false,
    strengths: ['Sets ball screens', 'Rolls to rim', 'Short corner layups', 'Keeps lane clear'],
    notes: 'More important than he looks. Sets the screen that starts every Chin possession. If defense switches → he rolls free. Doesn\'t need to be a star — just needs to screen hard and roll.',
    tag: 'Starter', tagColor: '#3B82F6',
  },
  {
    name: 'Rex', position: 'SF', role: 'Energy / Cutter', emoji: '🚀', highlight: false,
    strengths: ['Fast', 'Back-cuts', 'Can shoot some', 'Spaces strong corner'],
    notes: 'Holds the strong-side corner in base Chin. When he\'s in, run extra back-cut reads off drives — his speed makes him a weapon when the defense forgets him.',
    tag: 'Rotation', tagColor: '#8B5CF6',
  },
  {
    name: 'Nick', position: 'Flex', role: '6th Man', emoji: '🔋', highlight: false,
    strengths: ['Depth', 'Keeps starters fresh', 'Learns the system'],
    notes: 'Reliable 6th man. Every team needs one.',
    tag: '6th Man', tagColor: '#6B7280',
  },
]

// ─── OFFENSE SUMMARY ────────────────────────────────────────────────────────

const offenseSummary = [
  {
    name: 'Chin Series (Base)',
    icon: '🏀',
    tag: 'Primary', tagColor: '#FF5F04',
    desc: 'Every half-court possession starts here. Kade ball screen on Laken → triple gap read → drive or reject → Nathan split action at elbow → shoot, drive, or skip to Dayton.',
  },
  {
    name: 'Triple Gap Reads',
    icon: '3️⃣',
    tag: 'Within Chin', tagColor: '#FF5F04',
    desc: 'Left of screen (attack left lane), Right of screen (attack right lane), Roll (Kade to rim). Laken reads which gap is open before he gets to the screen.',
  },
  {
    name: 'Nathan Split Action',
    icon: '🎯',
    tag: 'Within Chin', tagColor: '#FF5F04',
    desc: 'After Laken rejects: Nathan cuts to elbow, receives pass. Three reads: pull-up/3 if open, baseline drive if overplayed, skip to Dayton corner if defense collapses.',
  },
  {
    name: 'Laken ISO Set',
    icon: '⚡',
    tag: 'Called Play', tagColor: '#8B5CF6',
    desc: 'Separate called play. Clear the floor, Laken goes 1-on-1. Use 3-4 times per game — too predictable if overused, deadly when deployed right.',
  },
  {
    name: 'Dayton Corner Skip',
    icon: '🏹',
    tag: 'Secondary', tagColor: '#10B981',
    desc: 'Nathan wing catches → pump fake → skip to Dayton in weak corner. Also the terminal read of Nathan\'s split action. Lefty rhythm 3 — nobody closes hard enough.',
  },
  {
    name: 'Rex Speed Package',
    icon: '🚀',
    tag: 'Sub Package', tagColor: '#F59E0B',
    desc: 'Rex in for Dayton. Add back-cut reads on every drive. Fast kid + collapsing defense = easy layups. Small change, big impact.',
  },
  {
    name: 'Zone Offense',
    icon: '🛡️',
    tag: 'Coming Later', tagColor: '#6B7280',
    desc: 'Nathan at the high-post elbow (zone killer). Skip passes to find gaps. Dayton corner. More detail added closer to season.',
  },
]

// ─── PRACTICE PLAN ──────────────────────────────────────────────────────────

const practicePhases = [
  {
    week: 'Week 1', focus: 'Foundation', color: '#3B82F6',
    days: [
      { day: 'Day 1–2', title: 'Spacing & DDM Principles', detail: '4-out 1-in spacing rules. Kade in short corner / high post. Nobody clogs the lane. Walk through where every player stands on every possession. Repetition over speed.' },
      { day: 'Day 3–4', title: 'Ball Screen Entry + Triple Gap', detail: 'Kade sets the screen. Laken walks through all three gap reads slowly. Left gap, right gap, Kade rolls. No defense yet — just footwork and reads.' },
      { day: 'Day 5–6', title: 'Nathan Split Action', detail: 'Laken rejects screen, hits Nathan at elbow. Nathan\'s three reads: shoot, drive baseline, or swing to Dayton corner. Reps at 50% speed. Nathan needs to feel the read, not memorize it.' },
    ]
  },
  {
    week: 'Week 2', focus: 'Reads & Live Reps', color: '#FF5F04',
    days: [
      { day: 'Day 7–8', title: '3-on-3 Ball Screen Reads', detail: 'Laken + Nathan + Kade vs 3 defenders. Force the read live. Coach calls what the defense does — Laken reacts. Reward the right read, punish the drive into traffic.' },
      { day: 'Day 9–10', title: 'Full Chin Series 5-on-5 Walkthrough', detail: 'All 5 players, full speed walk-through. Add Dayton corner skip. Add Kade roll. Identify who doesn\'t know their spot — fix it now.' },
      { day: 'Day 11–12', title: 'Laken ISO + Rex Package', detail: 'Install the called Laken ISO set. Install the Rex sub-package (back-cut read). 5-on-5 live reps, coach calling plays from sideline.' },
    ]
  },
  {
    week: 'Week 3', focus: 'Polish & Competition', color: '#10B981',
    days: [
      { day: 'Day 13–14', title: 'Situational Offense', detail: 'Last shot of quarter. BLOB plays. Down 2 with 30 seconds. Chin into Nathan 3. Laken ISO at crunch time. Make it feel real.' },
      { day: 'Day 15–16', title: 'Full Scrimmage', detail: 'Game speed. Call the offense like a game. Identify the 2-3 Chin reads that are clicking and lean into them. Trim anything that\'s not working.' },
      { day: 'Day 17+', title: 'Game Prep', detail: 'Sharpen what works. If time allows, basic zone intro (Nathan high post, skip passes, Dayton corner). Confidence beats complexity.' },
    ]
  },
]

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function SMSCoachingPage() {
  const [activeTab, setActiveTab] = useState<'diagram' | 'roster' | 'offense' | 'practice'>('diagram')

  const tabs = [
    { id: 'diagram', label: '📐 Chin Series' },
    { id: 'roster', label: '👥 Roster' },
    { id: 'offense', label: '🏀 Offense' },
    { id: 'practice', label: '📅 Practice' },
  ] as const

  return (
    <div className="min-h-screen text-[#F1F3F5]" style={{ background: '#07090D', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(7,9,13,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white font-bold text-lg tracking-tight">
          NJS<span style={{ color: '#FF5F04' }}>Builds</span>
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(255,95,4,0.15)', color: '#FF5F04', border: '1px solid rgba(255,95,4,0.3)' }}>
          SMS Basketball
        </span>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-8 px-6 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 uppercase tracking-widest"
          style={{ background: 'rgba(255,95,4,0.12)', color: '#FF5F04', border: '1px solid rgba(255,95,4,0.25)' }}
        >
          <span style={{ fontSize: '8px' }}>●</span> 2026–27 Season
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
          SMS <span style={{ color: '#FF5F04' }}>Coaching Plan</span>
        </h1>
        <p className="text-base max-w-lg mx-auto mb-1" style={{ color: '#6B7280' }}>
          8th Grade Basketball · Chin Series Offense
        </p>
        <p className="text-sm max-w-md mx-auto" style={{ color: '#4B5563' }}>
          Ball screen → triple gap → split action → Nathan 3
        </p>
      </section>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 max-w-2xl mx-auto p-1 rounded-xl overflow-x-auto" style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-max px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? '#FF5F04' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#6B7280',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 pb-24 max-w-2xl mx-auto">

        {/* DIAGRAM TAB */}
        {activeTab === 'diagram' && (
          <div>
            <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,95,4,0.08)', border: '1px solid rgba(255,95,4,0.25)' }}>
              <p className="font-bold text-white mb-1">The Chin Series</p>
              <p className="text-sm leading-relaxed" style={{ color: '#D1D5DB' }}>
                Every possession starts the same way: Kade sets a ball screen on Laken. Then the defense tells you what to do. Step through each read below — this is the whole offense in one series.
              </p>
            </div>
            <CourtDiagram steps={chinSteps} />
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Six-man rotation. Every player has a defined role in the Chin series.</p>
            {players.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl p-5"
                style={{
                  background: p.highlight ? 'rgba(255,95,4,0.08)' : '#141920',
                  border: p.highlight ? '1px solid rgba(255,95,4,0.35)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-lg">{p.name}</h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${p.tagColor}22`, color: p.tagColor, border: `1px solid ${p.tagColor}44` }}>
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{p.position} · {p.role}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.strengths.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#D1D5DB' }}>{s}</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>{p.notes}</p>
              </div>
            ))}
          </div>
        )}

        {/* OFFENSE TAB */}
        {activeTab === 'offense' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,95,4,0.08)', border: '1px solid rgba(255,95,4,0.25)' }}>
              <h3 className="font-bold text-white mb-2">System: Chin Series Motion</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                Not Princeton. Not pure DDM. It&apos;s the Chin Series — Princeton principles (read-and-react, split action, IQ-based) executed through DDM spacing (4-out 1-in, triple gap, short corner). One system that holds everything you want.
              </p>
            </div>
            {offenseSummary.map((a) => (
              <div key={a.name} className="rounded-2xl p-5" style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{a.icon}</span>
                    <h3 className="font-bold text-white">{a.name}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${a.tagColor}22`, color: a.tagColor, border: `1px solid ${a.tagColor}44` }}>
                    {a.tag}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>{a.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* PRACTICE TAB */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Three weeks · 2 hours/day · Full Chin series installed before game one.</p>
            {practicePhases.map(phase => (
              <div key={phase.week}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: phase.color }} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: phase.color }}>{phase.week}</p>
                    <p className="font-bold text-white">{phase.focus}</p>
                  </div>
                </div>
                <div className="space-y-3 ml-4 pl-4" style={{ borderLeft: `1px solid ${phase.color}33` }}>
                  {phase.days.map(d => (
                    <div key={d.day} className="rounded-xl p-4" style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: `${phase.color}22`, color: phase.color }}>{d.day}</span>
                        <p className="font-semibold text-white text-sm">{d.title}</p>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>{d.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <footer className="px-6 py-8 text-center text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#6B7280' }}>
        SMS Basketball · 2026–27 · Built by NJSBuilds
      </footer>
    </div>
  )
}
