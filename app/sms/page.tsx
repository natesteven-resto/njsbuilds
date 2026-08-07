'use client'

import { useState } from 'react'

const players = [
  {
    name: 'Nathan',
    number: '—',
    position: 'SG / Co-PG',
    role: 'Primary Scorer',
    emoji: '🎯',
    highlight: true,
    strengths: ['3-point shooter', 'Shoots off anything (screens, DHO, catch-and-shoot)', 'Smart — reads defense', 'Layups'],
    notes: 'The engine. Every action either gets him an open 3 or opens someone else up because of the attention he commands.',
    tag: 'Star',
    tagColor: '#FF5F04',
  },
  {
    name: 'Laken',
    number: '—',
    position: 'PG',
    role: 'Floor General',
    emoji: '⚡',
    highlight: false,
    strengths: ['Downhill driver', 'Gets to the rim', '1-on-1 isolation (own set play)', 'Pushes pace'],
    notes: 'DDM lives and dies with him. When he attacks, the defense collapses — that\'s when Nathan and Dayton get open kicks.',
    tag: 'Starter',
    tagColor: '#3B82F6',
  },
  {
    name: 'Dayton',
    number: '—',
    position: 'SF',
    role: 'Weak-Side Shooter',
    emoji: '🏹',
    highlight: false,
    strengths: ['Lefty 3-point shooter', 'Spaces weak-side corner', 'High effort — takes shots', 'Will hit some'],
    notes: 'Corner anchor on the weak side. Teams won\'t chase a lefty hard — he\'ll be open more than they expect. Skip pass from Nathan\'s side gets him rhythm looks.',
    tag: 'Starter',
    tagColor: '#3B82F6',
  },
  {
    name: 'Kade',
    number: '—',
    position: 'C / PF',
    role: 'Short-Corner Spacer',
    emoji: '🧱',
    highlight: false,
    strengths: ['Finishes layups', 'Some shooting range', 'Available backside when lane opens', 'Sets screens'],
    notes: 'Not asked to do a lot — that\'s the beauty of DDM. Parks in short corner, spaces the lane for Laken\'s drives, and is open when defense forgets about him.',
    tag: 'Starter',
    tagColor: '#3B82F6',
  },
  {
    name: 'Rex',
    number: '—',
    position: 'SF / SG',
    role: 'Energy / Cutter',
    emoji: '🚀',
    highlight: false,
    strengths: ['Fast', 'Can shoot some', 'Cuts hard', 'Creates chaos'],
    notes: 'Sub-package player. When Rex is in, run him on back-cuts — his speed is the weapon. DDM loves cutters when the drive collapses a defense.',
    tag: 'Rotation',
    tagColor: '#8B5CF6',
  },
  {
    name: 'Nick',
    number: '—',
    position: 'Flex',
    role: '6th Man',
    emoji: '🔋',
    highlight: false,
    strengths: ['Provides depth', 'Keeps starters fresh', 'Learns the system'],
    notes: 'Comes off the bench, keeps fresh legs on the floor. Every team needs a reliable 6th man.',
    tag: '6th Man',
    tagColor: '#6B7280',
  },
]

const offenseActions = [
  {
    name: 'DDM Base — 4-Out 1-In',
    icon: '🏀',
    priority: 'Primary',
    priorityColor: '#FF5F04',
    description: 'Your foundation. Laken at the top, Nathan wing, Dayton weak corner, Rex/PF strong corner, Kade short corner. Laken attacks the gap. Defense collapses → kick to Nathan for 3, skip to Dayton in corner, or dump to Kade backside.',
    positions: ['Laken — Top (ball)', 'Nathan — Strong Wing', 'Dayton — Weak Corner', 'Kade — Short Corner', 'Rex/4 — Strong Corner'],
    cue: 'Drive. Kick. Shoot.',
  },
  {
    name: 'DHO Split Action',
    icon: '🔄',
    priority: 'Primary',
    priorityColor: '#FF5F04',
    description: 'Laken dribble-hand-offs to Nathan at the elbow extended. Nathan gets THREE reads: 1) Pull up 3 off the DHO if closeout is flat, 2) Reject and drive baseline if defender goes under, 3) Re-pass to Laken cutting off Kade\'s screen for layup. Nathan reads the defense — this is where his IQ shines.',
    positions: ['Nathan — Elbow Extended (receives DHO)', 'Laken — Drives off screen after DHO', 'Kade — Sets screen for Laken cut', 'Dayton — Weak corner (skip pass option)', 'Rex — Strong corner (spacing)'],
    cue: 'Hand off. Read. React.',
  },
  {
    name: 'Laken ISO Set',
    icon: '⚡',
    priority: 'Called Play',
    priorityColor: '#8B5CF6',
    description: 'Your existing called play. Clear one side, get Laken isolation, let him go 1-on-1. Keep for 3-4 times a game — predictable if overused, deadly if deployed right.',
    positions: ['Laken — Ball handler, isolation', 'Everyone else — Clear and space the floor'],
    cue: 'Coach calls it. Laken goes.',
  },
  {
    name: 'Corner Skip — Dayton',
    icon: '🏹',
    priority: 'Secondary',
    priorityColor: '#10B981',
    description: 'Nathan catches on the strong wing, pump fakes or shot-fakes to freeze the defense, then fires a skip pass to Dayton in the weak corner. Lefty rhythm 3 — teams won\'t closeout hard. Run this 4-5 times a game.',
    positions: ['Nathan — Strong wing, skip passer', 'Dayton — Weak corner, catch and shoot', 'Laken — Ball reversal / reset', 'Kade — Short corner, keeps lane clear'],
    cue: 'Nathan catches. Skip. Dayton shoots.',
  },
  {
    name: 'Rex Sub-Package — Speed Cuts',
    icon: '🚀',
    priority: 'Sub Package',
    priorityColor: '#F59E0B',
    description: 'When Rex checks in for Dayton, shift to cutting actions. Rex back-cuts off any defender who goes to sleep. Laken or Nathan drives, Rex reads the collapse and cuts to the basket. Fast kid + collapsing defense = easy layups.',
    positions: ['Rex — Weak side, reads and cuts hard', 'Laken — Drive to force collapse', 'Nathan — Wing, catch-and-shoot or dump', 'Kade — Short corner, keeps spacing'],
    cue: 'Rex cuts on every drive.',
  },
  {
    name: 'Zone Offense (Coming Later)',
    icon: '🛡️',
    priority: 'Later',
    priorityColor: '#6B7280',
    description: 'Some teams will run zone. Basic zone attack: skip passes to find the gaps, Nathan at the high post elbow (zones hate that spot), Dayton in the corner. More detail added as season approaches.',
    positions: ['Nathan — High post elbow (zone killer)', 'Dayton — Corner (skip target)', 'Laken — Ball movement / reversal'],
    cue: 'Find the gaps. Skip fast.',
  },
]

const practicePhases = [
  {
    week: 'Week 1',
    focus: 'Foundation',
    color: '#3B82F6',
    days: [
      { day: 'Day 1–2', title: 'DDM Principles', detail: 'Spacing rules: 4-out 1-in. Short corner for Kade. No one clogs the lane. Laken drives lanes. Kick-outs. No dribbling into help.' },
      { day: 'Day 3–4', title: 'DHO Action', detail: 'Walk through DHO with Nathan. Slow — every read. Defender flat = shoot. Defender over = reject. Defender under = Laken cuts. Reps, reps, reps.' },
      { day: 'Day 5–6', title: 'Corner Skip', detail: 'Nathan wing to Dayton corner. Pump fake, skip, rhythm shot. Dayton needs volume reps catching in rhythm. Nathan needs to feel the timing.' },
    ]
  },
  {
    week: 'Week 2',
    focus: 'Reads & Execution',
    color: '#FF5F04',
    days: [
      { day: 'Day 7–8', title: '3-on-3 DDM Reads', detail: 'Laken + Nathan + Kade vs 3 defenders. Force the kick-out read. Reward the right pass, punish the bad drive.' },
      { day: 'Day 9–10', title: 'Laken ISO + Team Spacing', detail: 'Install the called ISO set. Everyone learns their spots when Laken clears. Add Rex sub-package cuts.' },
      { day: 'Day 11–12', title: '5-on-5 Live', detail: 'Full court, full speed. Call plays from sideline. Nathan reads DHO live. Coach identifies breakdowns in spacing.' },
    ]
  },
  {
    week: 'Week 3',
    focus: 'Polish & Competition',
    color: '#10B981',
    days: [
      { day: 'Day 13–14', title: 'Situational Offense', detail: 'Late game sets. BLOB plays. Last shot of quarter. Laken ISO vs zone. Nathan 3 off timeout.' },
      { day: 'Day 15–16', title: 'Scrimmage', detail: 'Full scrimmage, call the offense like a game. Identify which actions are hitting, which to trim.' },
      { day: 'Day 17+', title: 'Game Prep', detail: 'Opponent scout (if available). Sharpen best 3 actions. Keep it simple — confidence beats complexity.' },
    ]
  },
]

const PhilosophyCard = ({ icon, title, body }: { icon: string; title: string; body: string }) => (
  <div
    className="rounded-2xl p-5"
    style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    <div className="text-2xl mb-2">{icon}</div>
    <h4 className="font-bold text-white mb-1 text-sm">{title}</h4>
    <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>{body}</p>
  </div>
)

export default function SMSCoachingPage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'offense' | 'practice' | 'philosophy'>('roster')

  const tabs = [
    { id: 'roster', label: '👥 Roster' },
    { id: 'offense', label: '🏀 Offense' },
    { id: 'practice', label: '📅 Practice Plan' },
    { id: 'philosophy', label: '🧠 Philosophy' },
  ] as const

  return (
    <div
      className="min-h-screen text-[#F1F3F5]"
      style={{ background: '#07090D', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
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
      <section className="pt-32 pb-10 px-6 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 uppercase tracking-widest"
          style={{ background: 'rgba(255,95,4,0.12)', color: '#FF5F04', border: '1px solid rgba(255,95,4,0.25)' }}
        >
          <span style={{ fontSize: '8px' }}>●</span> 2026–27 Season
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight mb-4"
          style={{ letterSpacing: '-0.03em' }}
        >
          SMS <span style={{ color: '#FF5F04' }}>Coaching Plan</span>
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: '#6B7280' }}>
          8th Grade Basketball · Dribble-Drive Offense · Three weeks to game one.
        </p>
      </section>

      {/* Tabs */}
      <div className="px-6 mb-8">
        <div
          className="flex gap-2 max-w-2xl mx-auto p-1 rounded-xl overflow-x-auto"
          style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
        >
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

      <main className="px-6 pb-24 max-w-3xl mx-auto">

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Six-man rotation. Three shooters, one driver, one cutter, one paint presence.
            </p>
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg">{p.name}</h3>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${p.tagColor}22`, color: p.tagColor, border: `1px solid ${p.tagColor}44` }}
                        >
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{p.position} · {p.role}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.strengths.map(s => (
                    <span
                      key={s}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#D1D5DB' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>{p.notes}</p>
              </div>
            ))}
          </div>
        )}

        {/* OFFENSE TAB */}
        {activeTab === 'offense' && (
          <div className="space-y-5">
            <div
              className="rounded-2xl p-5 mb-2"
              style={{ background: 'rgba(255,95,4,0.08)', border: '1px solid rgba(255,95,4,0.25)' }}
            >
              <h3 className="font-bold text-white mb-1">System: Dribble-Drive Motion (DDM)</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                Base is 4-out 1-in. Laken attacks. Nathan and Dayton space the corners and wings. Kade anchors the short corner.
                The offense answers two questions every possession: <strong style={{ color: '#F1F3F5' }}>Can Laken get to the rim?</strong> and <strong style={{ color: '#F1F3F5' }}>Is Nathan open for three?</strong> Everything else flows from that.
              </p>
            </div>
            {offenseActions.map((a) => (
              <div
                key={a.name}
                className="rounded-2xl p-5"
                style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{a.icon}</span>
                    <h3 className="font-bold text-white">{a.name}</h3>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${a.priorityColor}22`, color: a.priorityColor, border: `1px solid ${a.priorityColor}44` }}
                  >
                    {a.priority}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#9CA3AF' }}>{a.description}</p>
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Positions</p>
                  <div className="space-y-1">
                    {a.positions.map(pos => (
                      <div key={pos} className="flex items-center gap-2">
                        <span style={{ color: '#FF5F04', fontSize: '8px' }}>●</span>
                        <span className="text-sm" style={{ color: '#D1D5DB' }}>{pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>CUE:</span>
                  <span className="text-xs font-bold" style={{ color: '#F1F3F5' }}>{a.cue}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRACTICE TAB */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
              Three weeks · 2 hours/day · Every action installed before game one.
            </p>
            {practicePhases.map(phase => (
              <div key={phase.week}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ background: phase.color }}
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: phase.color }}>{phase.week}</p>
                    <p className="font-bold text-white">{phase.focus}</p>
                  </div>
                </div>
                <div className="space-y-3 ml-4 pl-4" style={{ borderLeft: `1px solid ${phase.color}33` }}>
                  {phase.days.map(d => (
                    <div
                      key={d.day}
                      className="rounded-xl p-4"
                      style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: `${phase.color}22`, color: phase.color }}
                        >
                          {d.day}
                        </span>
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

        {/* PHILOSOPHY TAB */}
        {activeTab === 'philosophy' && (
          <div>
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'rgba(255,95,4,0.08)', border: '1px solid rgba(255,95,4,0.25)' }}
            >
              <h3 className="font-bold text-white text-lg mb-2">The Core Principle</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#D1D5DB' }}>
                Get Nathan open threes. Everything else is in service of that. The offense isn&apos;t complicated — it&apos;s disciplined.
                Laken attacks, the defense has to pick its poison: stop the drive or stop Nathan. They can&apos;t do both.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <PhilosophyCard
                icon="🎯"
                title="Star Development First"
                body="Nathan is the priority. The offense is built so that every possession either creates a Nathan 3 or opens someone else because of Nathan's gravity. Don't fight the roster — amplify it."
              />
              <PhilosophyCard
                icon="📐"
                title="Spacing Is Non-Negotiable"
                body="The biggest DDM killer is bad spacing. If Kade clogs the lane, Laken has nowhere to go. Kade's job is to stay in the short corner and be a release valve — not get fancy."
              />
              <PhilosophyCard
                icon="🧠"
                title="Nathan Reads the Defense"
                body="The DHO split action is yours because Nathan is smart. Don't simplify it for other players — let Nathan's IQ be the weapon. That's what separates good coaches from great ones."
              />
              <PhilosophyCard
                icon="⚡"
                title="Laken Is a Weapon, Not a Role"
                body="Use the ISO set surgically. 3-4 times a game max. The threat of it opens up the base DDM — teams will cheat to stop him, which means the kick-outs are there."
              />
              <PhilosophyCard
                icon="🏹"
                title="Dayton Is Free Real Estate"
                body="Nobody closes out hard on a lefty 8th grade corner shooter. That's your edge — skip him the ball 4-5 times a game in rhythm. He'll make enough to keep them honest."
              />
              <PhilosophyCard
                icon="🚀"
                title="Rex Changes the Game"
                body="When Rex comes in, the offense changes character. Fast cutter + drive collapse = backdoor layups. Keep a small sub-package just for when he's on the floor."
              />
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h4 className="font-bold text-white mb-3">Against Zone</h4>
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#9CA3AF' }}>
                Some teams will run zone. The DDM principles still apply — you just attack gaps instead of defenders.
                Nathan at the high-post elbow is a zone killer (it&apos;s the hardest spot for a 2-3 zone to cover).
                Skip passes, quick ball movement, and don&apos;t overdribble.
              </p>
              <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                Full zone breakdown added when you&apos;re ready. Focus on man first.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#6B7280' }}
      >
        SMS Basketball · 2026–27 · Built by NJSBuilds
      </footer>
    </div>
  )
}
