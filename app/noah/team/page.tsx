'use client'

import { useState, useRef, useEffect } from 'react'

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'

type TeamPlayer = {
  name: string
  position: Position
  team: string
  bye: number
  round: number
  espnId?: number
  isRookie?: boolean
  isStarting: boolean
  initials: string
}

type ChatMessage = {
  role: 'user' | 'ai'
  text: string
}

const POS_COLORS: Record<string, string> = {
  QB: 'text-red-400 border-red-500/50 bg-red-500/10',
  RB: 'text-green-400 border-green-500/50 bg-green-500/10',
  WR: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
  TE: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  K: 'text-purple-400 border-purple-500/50 bg-purple-500/10',
  DST: 'text-orange-400 border-orange-500/50 bg-orange-500/10',
}

const POS_BG_SOLID: Record<string, string> = {
  QB: 'bg-red-500',
  RB: 'bg-green-500',
  WR: 'bg-blue-500',
  TE: 'bg-yellow-500',
  K: 'bg-purple-500',
  DST: 'bg-orange-500',
}

const ROSTER: TeamPlayer[] = [
  { name: 'CMC', position: 'RB', team: 'SF', bye: 8, round: 1, espnId: 3054211, isStarting: true, initials: 'CMC' },
  { name: 'Jonathan Taylor', position: 'RB', team: 'IND', bye: 13, round: 2, espnId: 4040715, isStarting: true, initials: 'JT' },
  { name: 'Jeremiyah Love', position: 'RB', team: 'ARI', bye: 14, round: 3, isRookie: true, isStarting: false, initials: 'JL' },
  { name: 'Rashee Rice', position: 'WR', team: 'KC', bye: 5, round: 4, espnId: 4430807, isStarting: true, initials: 'RR' },
  { name: 'Josh Jacobs', position: 'RB', team: 'GB', bye: 11, round: 5, espnId: 3915416, isStarting: false, initials: 'JJ' },
  { name: 'Breece Hall', position: 'RB', team: 'NYJ', bye: 13, round: 6, espnId: 4430738, isStarting: true, initials: 'BH' },
  { name: 'DeVonta Smith', position: 'WR', team: 'PHI', bye: 10, round: 7, espnId: 4241372, isStarting: true, initials: 'DS' },
  { name: 'DJ Moore', position: 'WR', team: 'BUF', bye: 7, round: 8, espnId: 3917315, isStarting: false, initials: 'DJM' },
  { name: 'Tommy Tremble', position: 'TE', team: 'CAR', bye: 5, round: 9, espnId: 4360310, isStarting: true, initials: 'TT' },
  { name: 'Emeka Egbuka', position: 'WR', team: 'TB', bye: 10, round: 10, isRookie: true, isStarting: false, initials: 'EE' },
  { name: 'Bo Nix', position: 'QB', team: 'DEN', bye: 10, round: 11, espnId: 4430800, isStarting: true, initials: 'BN' },
  { name: 'Quinshon Judkins', position: 'RB', team: 'CLE', bye: 11, round: 12, isRookie: true, isStarting: false, initials: 'QJ' },
  { name: 'Luther Burden III', position: 'WR', team: 'CHI', bye: 13, round: 13, isRookie: true, isStarting: false, initials: 'LB' },
  { name: 'Jadarian Price', position: 'RB', team: 'SEA', bye: 11, round: 14, isRookie: true, isStarting: false, initials: 'JP' },
  { name: 'Eagles D/ST', position: 'DST', team: 'PHI', bye: 10, round: 15, isStarting: true, initials: '🦅' },
  { name: 'Tyler Loop', position: 'K', team: 'BAL', bye: 0, round: 16, isStarting: true, initials: 'TL' },
]

const STARTING_LINEUP = [
  { slot: 'QB', player: 'Bo Nix' },
  { slot: 'RB', player: 'CMC' },
  { slot: 'RB', player: 'Jonathan Taylor' },
  { slot: 'WR', player: 'Rashee Rice' },
  { slot: 'WR', player: 'DeVonta Smith' },
  { slot: 'TE', player: 'Tommy Tremble' },
  { slot: 'FLEX', player: 'Breece Hall' },
  { slot: 'D/ST', player: 'Eagles D/ST' },
  { slot: 'K', player: 'Tyler Loop' },
]

// Bye week data: week -> array of player names
const BYE_WEEKS: Record<number, string[]> = {
  5: ['Rashee Rice', 'Tommy Tremble'],
  7: ['DJ Moore'],
  8: ['CMC'],
  10: ['Bo Nix', 'DeVonta Smith', 'Emeka Egbuka', 'Eagles D/ST', 'Luther Burden III'],
  11: ['Josh Jacobs', 'Quinshon Judkins', 'Jadarian Price'],
  13: ['Jonathan Taylor', 'Breece Hall', 'Luther Burden III'],
  14: ['Jeremiyah Love'],
}

function PlayerHeadshot({ player, size = 60 }: { player: TeamPlayer; size?: number }) {
  const [imgError, setImgError] = useState(false)

  if (player.position === 'DST') {
    return (
      <div
        className={`rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${POS_BG_SOLID[player.position]}/20 border-2 border-orange-500/40`}
        style={{ width: size, height: size }}
      >
        🦅
      </div>
    )
  }

  if (player.espnId && !imgError && !player.isRookie) {
    const url = `https://a.espn.com/combiner/i?img=/i/headshots/nfl/players/full/${player.espnId}.png&w=120&h=87`
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0 border-2 border-slate-700"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={player.name}
          width={size}
          height={size}
          className="object-cover object-top w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: colored circle with initials
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs ${POS_BG_SOLID[player.position]}/20 border-2 border-current`}
      style={{
        width: size,
        height: size,
        color: player.position === 'QB' ? '#f87171'
          : player.position === 'RB' ? '#4ade80'
          : player.position === 'WR' ? '#60a5fa'
          : player.position === 'TE' ? '#facc15'
          : player.position === 'K' ? '#c084fc'
          : '#fb923c',
      }}
    >
      {player.initials}
    </div>
  )
}

function PlayerCard({ player }: { player: TeamPlayer }) {
  const [isStarting, setIsStarting] = useState(() => {
    if (typeof window === 'undefined') return player.isStarting
    try {
      const saved = localStorage.getItem(`noah-team-start-${player.name}`)
      return saved !== null ? saved === 'true' : player.isStarting
    } catch {
      return player.isStarting
    }
  })

  function toggleStart() {
    const next = !isStarting
    setIsStarting(next)
    try {
      localStorage.setItem(`noah-team-start-${player.name}`, String(next))
    } catch {}
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 hover:border-slate-600/60 transition-all">
      <PlayerHeadshot player={player} size={52} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm text-white truncate">{player.name}</span>
          {player.isRookie && (
            <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-bold">RC</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[player.position]}`}>{player.position}</span>
          <span className="text-xs text-slate-400">{player.team}</span>
          {player.bye > 0 && <span className="text-xs text-slate-500">Bye {player.bye}</span>}
          <span className="text-xs text-slate-600">Rd {player.round}</span>
        </div>
        <div className="text-xs text-green-400 mt-0.5 font-medium">Healthy ✓</div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={toggleStart}
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
            isStarting
              ? 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {isStarting ? 'Start' : 'Bench'}
        </button>
      </div>
    </div>
  )
}

export default function NoahTeamPage() {
  const [chat, setChat] = useState<ChatMessage[]>([{
    role: 'ai',
    text: "Welcome to the GM Suite, Noah! 🏆 Your team is stacked with RB firepower. Key move: hit the waiver wire for a TE upgrade — Tommy Tremble isn't cutting it in PPR. Ask me anything."
  }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChat(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/noah/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setChat(prev => [...prev, { role: 'ai', text: data.reply }])
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Signal dropped — try again, GM.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const starters = ROSTER.filter(p => STARTING_LINEUP.some(s => s.player === p.name))
  const bench = ROSTER.filter(p => !STARTING_LINEUP.some(s => s.player === p.name))

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020817]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-black text-sm text-white leading-none tracking-tight">
                NOAH&apos;S GM SUITE
              </div>
              <div className="text-xs text-slate-500 mt-0.5">St. Catherine Boys • Season 2026 • PPR</div>
            </div>
          </div>
          <a
            href="/noah"
            className="text-xs text-slate-400 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:text-slate-200 hover:border-slate-600 transition-all"
          >
            ← Draft Board
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-6 pt-5">

        {/* Title block */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 tracking-tight">
            NOAH FTW
          </h1>
          <p className="text-slate-500 text-sm mt-1">10-team PPR Snake Draft · ESPN · St. Catherine Boys</p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <div className="font-black text-sm text-blue-400 uppercase tracking-wide">Waiver Wire</div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Priority: Upgrade TE. Drop Tommy Tremble when a real TE opens up — he&apos;s a blocking TE with minimal PPR value.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-black text-sm text-green-400 uppercase tracking-wide">This Week&apos;s Starts</div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Start CMC, Taylor, Rice, Smith, Hall. Bench Jacobs this week — matchup isn&apos;t favorable.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-black text-sm text-yellow-400 uppercase tracking-wide">Watch List</div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                  CMC injury history — monitor weekly reports. Rice bye week 5 coming fast — prep DJ Moore or Egbuka.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Starting Lineup */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-black text-green-400 uppercase tracking-widest">Starting Lineup</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="space-y-2">
            {STARTING_LINEUP.map((slot) => {
              const player = ROSTER.find(p => p.name === slot.player)
              if (!player) return null
              return (
                <div key={slot.slot + slot.player} className="flex items-center gap-2">
                  <div className={`text-xs font-black w-12 text-center px-1.5 py-1.5 rounded border flex-shrink-0 ${POS_COLORS[player.position]}`}>
                    {slot.slot}
                  </div>
                  <div className="flex-1">
                    <PlayerCard player={player} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bench */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Bench</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="space-y-2">
            {bench.map((player) => (
              <PlayerCard key={player.name} player={player} />
            ))}
          </div>
        </div>

        {/* Bye Week Schedule Strip */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">📅 Bye Week Schedule</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
              {Array.from({ length: 17 }, (_, i) => i + 1).map((week) => {
                const byePlayers = BYE_WEEKS[week] || []
                const isHeavy = byePlayers.length >= 2
                const isStarterBye = byePlayers.some(name =>
                  STARTING_LINEUP.some(s => s.player === name)
                )
                return (
                  <div
                    key={week}
                    className={`rounded-xl p-2.5 flex flex-col items-center gap-1.5 flex-shrink-0 border transition-all ${
                      isHeavy
                        ? 'bg-red-500/10 border-red-500/30'
                        : isStarterBye
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                    style={{ minWidth: 70 }}
                  >
                    <div className={`text-xs font-black ${isHeavy ? 'text-red-400' : 'text-slate-400'}`}>
                      Wk {week}
                    </div>
                    {byePlayers.length === 0 ? (
                      <div className="text-xs text-slate-700">—</div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {byePlayers.map(name => {
                          const player = ROSTER.find(p => p.name === name)
                          if (!player) return null
                          return (
                            <span
                              key={name}
                              className={`text-xs font-bold px-1.5 py-0.5 rounded border text-center ${POS_COLORS[player.position]}`}
                              style={{ fontSize: 10 }}
                            >
                              {name === 'Jonathan Taylor' ? 'J.Taylor'
                                : name === 'Rashee Rice' ? 'Rice'
                                : name === 'Tommy Tremble' ? 'Tremble'
                                : name === 'Eagles D/ST' ? 'PHI D'
                                : name === 'DeVonta Smith' ? 'D.Smith'
                                : name === 'Emeka Egbuka' ? 'Egbuka'
                                : name === 'Luther Burden III' ? 'Burden'
                                : name === 'Bo Nix' ? 'Nix'
                                : name === 'Josh Jacobs' ? 'Jacobs'
                                : name === 'Quinshon Judkins' ? 'Judkins'
                                : name === 'Jadarian Price' ? 'Price'
                                : name === 'Jeremiyah Love' ? 'Love'
                                : name === 'Breece Hall' ? 'Hall'
                                : name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {isHeavy && (
                      <div className="text-red-400 text-xs">🚨</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              <span>2+ byes (danger)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/20" />
              <span>Starter on bye</span>
            </div>
          </div>
        </div>

        {/* AI GM Chat */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-black text-green-400 uppercase tracking-widest">🤖 AI GM Chat</div>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Chat messages */}
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-black font-medium rounded-br-sm'
                        : 'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2">
                    🤖
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
              {[
                'Who should I start this week?',
                'Should I drop Tremble?',
                'Rate my team 1-10',
                'Week 5 bye week help',
                'Trade advice?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setChatInput(q)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-full hover:border-green-500/50 hover:text-green-400 transition-all flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask your GM analyst..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 bg-green-500 text-black font-black rounded-xl disabled:opacity-40 hover:bg-green-400 active:scale-95 transition-all"
              >
                →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
