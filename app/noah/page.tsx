'use client'

import { useState, useRef, useEffect } from 'react'

// --- Types ---
type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'
type Player = {
  id: number
  name: string
  team: string
  position: Position
  bye: number
  tier: number
  adp: number
  taken: boolean
  drafted: boolean // drafted by Noah
  notes: string
  sleeper?: boolean
}

type RosterSlot = {
  label: string
  position: Position | 'FLEX' | 'BE' | 'IR'
  player: Player | null
}

type ChatMessage = {
  role: 'user' | 'ai'
  text: string
}

// --- 2026 PPR Player Pool (top ~150 players, ADP-ordered) ---
const INITIAL_PLAYERS: Omit<Player, 'taken' | 'drafted'>[] = [
  // QBs
  { id: 1,  name: 'Lamar Jackson',    team: 'BAL', position: 'QB', bye: 14, tier: 1, adp: 12,  notes: 'Elite dual-threat. Best QB in PPR.' },
  { id: 2,  name: 'Josh Allen',       team: 'BUF', position: 'QB', bye: 12, tier: 1, adp: 15,  notes: 'Top rushing QB, massive upside.' },
  { id: 3,  name: 'Jalen Hurts',      team: 'PHI', position: 'QB', bye: 5,  tier: 1, adp: 20,  notes: 'Rushing floor makes him elite.' },
  { id: 4,  name: 'Joe Burrow',       team: 'CIN', position: 'QB', bye: 7,  tier: 2, adp: 42,  notes: 'Elite passer, Bengals WRs are weapons.' },
  { id: 5,  name: 'Patrick Mahomes', team: 'KC',  position: 'QB', bye: 10, tier: 2, adp: 45,  notes: 'GOAT. Always finds a way.' },
  { id: 6,  name: 'C.J. Stroud',     team: 'HOU', position: 'QB', bye: 14, tier: 2, adp: 60,  notes: 'Young gun, loves Nico Collins.' },
  { id: 7,  name: 'Anthony Richardson', team: 'IND', position: 'QB', bye: 14, tier: 2, adp: 65, notes: 'Insane rushing upside if healthy.', sleeper: true },
  { id: 8,  name: 'Jayden Daniels',  team: 'WAS', position: 'QB', bye: 14, tier: 2, adp: 68,  notes: 'Sophomore leap — terrifying mobility.' },
  { id: 9,  name: 'Sam Darnold',     team: 'SEA', position: 'QB', bye: 5,  tier: 3, adp: 110, notes: 'Sneaky value in the right system.' },
  { id: 10, name: 'Bo Nix',          team: 'DEN', position: 'QB', bye: 9,  tier: 3, adp: 115, notes: 'Year 2 leap candidate.', sleeper: true },

  // RBs
  { id: 11, name: 'Saquon Barkley',  team: 'PHI', position: 'RB', bye: 5,  tier: 1, adp: 1,   notes: 'Workhorse on the Eagles. #1 overall.' },
  { id: 12, name: 'Christian McCaffrey', team: 'SF', position: 'RB', bye: 9, tier: 1, adp: 2, notes: 'When healthy, the best RB alive.' },
  { id: 13, name: 'Breece Hall',     team: 'NYJ', position: 'RB', bye: 12, tier: 1, adp: 4,   notes: 'Lead back + pass-catcher. PPR gold.' },
  { id: 14, name: 'Bijan Robinson', team: 'ATL', position: 'RB', bye: 12, tier: 1, adp: 5,   notes: 'Every-down stud. Great receiving.' },
  { id: 15, name: 'Jahmyr Gibbs',   team: 'DET', position: 'RB', bye: 5,  tier: 1, adp: 6,   notes: 'Dynamic pass-catcher, explosive.' },
  { id: 16, name: 'De\'Von Achane', team: 'MIA', position: 'RB', bye: 10, tier: 1, adp: 7,   notes: 'Fastest in the league. Huge ceiling.' },
  { id: 17, name: 'Jonathon Brooks', team: 'CAR', position: 'RB', bye: 11, tier: 2, adp: 22,  notes: 'Healthy return — high upside.' },
  { id: 18, name: 'Josh Jacobs',    team: 'GB',  position: 'RB', bye: 6,  tier: 2, adp: 25,  notes: 'Reliable workhorse with pass work.' },
  { id: 19, name: 'Derrick Henry',  team: 'BAL', position: 'RB', bye: 14, tier: 2, adp: 28,  notes: 'Still a tank. BAL run game is elite.' },
  { id: 20, name: 'Tony Pollard',   team: 'TEN', position: 'RB', bye: 6,  tier: 2, adp: 35,  notes: 'Receiving back with big-play juice.' },
  { id: 21, name: 'Rhamondre Stevenson', team: 'NE', position: 'RB', bye: 14, tier: 2, adp: 38, notes: 'Lead back role locked up.' },
  { id: 22, name: 'Isiah Pacheco', team: 'KC',  position: 'RB', bye: 10, tier: 2, adp: 40,  notes: 'KC workhorse. Super Bowl pedigree.' },
  { id: 23, name: 'Kyren Williams', team: 'LAR', position: 'RB', bye: 6,  tier: 2, adp: 43,  notes: 'Every-down role, touches are up.' },
  { id: 24, name: 'Zach Charbonnet', team: 'SEA', position: 'RB', bye: 5, tier: 2, adp: 48,  notes: 'Starting role in Seattle.' },
  { id: 25, name: 'Aaron Jones',    team: 'MIN', position: 'RB', bye: 6,  tier: 3, adp: 70,  notes: 'Proven vet, pass-catching role.' },
  { id: 26, name: 'Brian Robinson', team: 'WAS', position: 'RB', bye: 14, tier: 3, adp: 75,  notes: 'Between-the-tackles workhorse.' },
  { id: 27, name: 'Jerome Ford',    team: 'CLE', position: 'RB', bye: 10, tier: 3, adp: 80,  notes: 'Lead role if healthy, cheap value.' },
  { id: 28, name: 'James Conner',   team: 'ARI', position: 'RB', bye: 11, tier: 3, adp: 85,  notes: 'Aged but ARI offense feeds RBs.' },
  { id: 29, name: 'Chuba Hubbard',  team: 'CAR', position: 'RB', bye: 11, tier: 3, adp: 90,  notes: 'Solid RB2, underrated pass work.', sleeper: true },
  { id: 30, name: 'Tyjae Spears',   team: 'TEN', position: 'RB', bye: 6,  tier: 3, adp: 95,  notes: 'Explosive pass-catcher, big upside.', sleeper: true },

  // WRs
  { id: 31, name: 'CeeDee Lamb',    team: 'DAL', position: 'WR', bye: 7,  tier: 1, adp: 3,   notes: 'The WR1. Elite route runner and volume.' },
  { id: 32, name: 'Ja\'Marr Chase', team: 'CIN', position: 'WR', bye: 7,  tier: 1, adp: 8,   notes: 'Absolute freak. Targets + yards.' },
  { id: 33, name: 'Tyreek Hill',    team: 'MIA', position: 'WR', bye: 10, tier: 1, adp: 9,   notes: 'Fastest WR ever. Volume machine.' },
  { id: 34, name: 'Justin Jefferson', team: 'MIN', position: 'WR', bye: 6, tier: 1, adp: 10,  notes: 'Route running is generational.' },
  { id: 35, name: 'Amon-Ra St. Brown', team: 'DET', position: 'WR', bye: 5, tier: 1, adp: 11, notes: 'PPR monster. Catches everything.' },
  { id: 36, name: 'Drake London',   team: 'ATL', position: 'WR', bye: 12, tier: 1, adp: 14,  notes: 'Bijan & London — Atlanta is loaded.' },
  { id: 37, name: 'Marvin Harrison Jr.', team: 'ARI', position: 'WR', bye: 11, tier: 1, adp: 16, notes: 'Generational rookie. High ceiling.' },
  { id: 38, name: 'Davante Adams', team: 'LAR', position: 'WR', bye: 6,  tier: 2, adp: 30,  notes: 'Vet savant. Route running is perfect.' },
  { id: 39, name: 'Stefon Diggs',   team: 'HOU', position: 'WR', bye: 14, tier: 2, adp: 33,  notes: 'Stroud loves him, big target share.' },
  { id: 40, name: 'Puka Nacua',     team: 'LAR', position: 'WR', bye: 6,  tier: 2, adp: 36,  notes: 'Massive target hog. PPR value.' },
  { id: 41, name: 'Mike Evans',     team: 'TB',  position: 'WR', bye: 11, tier: 2, adp: 39,  notes: 'Red zone king, 1000-yard machine.' },
  { id: 42, name: 'Nico Collins',   team: 'HOU', position: 'WR', bye: 14, tier: 2, adp: 41,  notes: 'Big-bodied alpha. Stroud\'s #1.' },
  { id: 43, name: 'Tank Dell',      team: 'HOU', position: 'WR', bye: 14, tier: 2, adp: 50,  notes: 'Electric after the catch.', sleeper: true },
  { id: 44, name: 'Jaylen Waddle',  team: 'MIA', position: 'WR', bye: 10, tier: 2, adp: 52,  notes: 'Speed alongside Tyreek.' },
  { id: 45, name: 'Chris Olave',    team: 'NO',  position: 'WR', bye: 12, tier: 2, adp: 55,  notes: 'Elite route runner, needs QB help.' },
  { id: 46, name: 'Courtland Sutton', team: 'DEN', position: 'WR', bye: 9, tier: 2, adp: 58, notes: 'Big target, Bo Nix connection building.', sleeper: true },
  { id: 47, name: 'DeVonta Smith',  team: 'PHI', position: 'WR', bye: 5,  tier: 2, adp: 62,  notes: 'Sneaky volume, underrated.' },
  { id: 48, name: 'Jordan Addison', team: 'MIN', position: 'WR', bye: 6,  tier: 2, adp: 66,  notes: 'Deep threat, big play machine.' },
  { id: 49, name: 'Christian Kirk', team: 'JAC', position: 'WR', bye: 11, tier: 3, adp: 78,  notes: 'Reliable slot, good PPR floor.' },
  { id: 50, name: 'Zay Flowers',    team: 'BAL', position: 'WR', bye: 14, tier: 3, adp: 82,  notes: 'Lamar\'s slot weapon, lots of catches.' },

  // TEs
  { id: 51, name: 'Sam LaPorta',    team: 'DET', position: 'TE', bye: 5,  tier: 1, adp: 17,  notes: 'Top TE. DET feeds their TEs heavily.' },
  { id: 52, name: 'Trey McBride',   team: 'ARI', position: 'TE', bye: 11, tier: 1, adp: 18,  notes: 'Massive target share in ARI offense.' },
  { id: 53, name: 'Brock Bowers',   team: 'LV',  position: 'TE', bye: 10, tier: 1, adp: 19,  notes: 'Generational talent. Elite YAC.' },
  { id: 54, name: 'Dalton Kincaid', team: 'BUF', position: 'TE', bye: 12, tier: 2, adp: 55,  notes: 'Josh Allen loves his TEs.' },
  { id: 55, name: 'Jake Ferguson',  team: 'DAL', position: 'TE', bye: 7,  tier: 2, adp: 60,  notes: 'Red zone target in Dallas.' },
  { id: 56, name: 'Pat Freiermuth', team: 'PIT', position: 'TE', bye: 9,  tier: 2, adp: 72,  notes: 'Reliable safety valve for Wilson.' },
  { id: 57, name: 'Cade Otton',     team: 'TB',  position: 'TE', bye: 11, tier: 2, adp: 85,  notes: 'Sneaky target share in TB offense.', sleeper: true },
  { id: 58, name: 'Dawson Knox',    team: 'BUF', position: 'TE', bye: 12, tier: 3, adp: 105, notes: 'Backup TE option, bye week cover.' },

  // DST
  { id: 59, name: 'SF 49ers',       team: 'SF',  position: 'DST', bye: 9, tier: 1, adp: 88,  notes: 'Elite defense. Always a top DST.' },
  { id: 60, name: 'Dallas Cowboys', team: 'DAL', position: 'DST', bye: 7, tier: 1, adp: 92,  notes: 'Pass rush is elite.' },
  { id: 61, name: 'Baltimore Ravens', team: 'BAL', position: 'DST', bye: 14, tier: 1, adp: 98, notes: 'Roquan Smith anchors this unit.' },
  { id: 62, name: 'Buffalo Bills',  team: 'BUF', position: 'DST', bye: 12, tier: 2, adp: 108, notes: 'Von Miller gone but still stout.' },
  { id: 63, name: 'Pittsburgh Steelers', team: 'PIT', position: 'DST', bye: 9, tier: 2, adp: 112, notes: 'T.J. Watt. That\'s it. That\'s the reason.' },
  { id: 64, name: 'New England Patriots', team: 'NE', position: 'DST', bye: 14, tier: 2, adp: 118, notes: 'Mayo\'s defense improving.' },

  // Ks
  { id: 65, name: 'Evan McPherson', team: 'CIN', position: 'K', bye: 7,  tier: 1, adp: 135, notes: 'Ice cold under pressure. Elite K.' },
  { id: 66, name: 'Brandon Aubrey', team: 'DAL', position: 'K', bye: 7,  tier: 1, adp: 138, notes: 'Record-setting accuracy.' },
  { id: 67, name: 'Tyler Bass',     team: 'BUF', position: 'K', bye: 12, tier: 2, adp: 142, notes: 'Reliable volume kicker.' },
  { id: 68, name: 'Jake Elliott',   team: 'PHI', position: 'K', bye: 5,  tier: 2, adp: 145, notes: 'PHI offense = lots of FG attempts.' },
]

const ROSTER_TEMPLATE: RosterSlot[] = [
  { label: 'QB', position: 'QB', player: null },
  { label: 'RB', position: 'RB', player: null },
  { label: 'RB', position: 'RB', player: null },
  { label: 'WR', position: 'WR', player: null },
  { label: 'WR', position: 'WR', player: null },
  { label: 'TE', position: 'TE', player: null },
  { label: 'FLEX', position: 'FLEX', player: null },
  { label: 'D/ST', position: 'DST', player: null },
  { label: 'K', position: 'K', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'BE', position: 'BE', player: null },
  { label: 'IR', position: 'IR', player: null },
]

const POS_COLORS: Record<string, string> = {
  QB: 'text-red-400 border-red-500/50 bg-red-500/10',
  RB: 'text-green-400 border-green-500/50 bg-green-500/10',
  WR: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
  TE: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  K:  'text-purple-400 border-purple-500/50 bg-purple-500/10',
  DST:'text-orange-400 border-orange-500/50 bg-orange-500/10',
}

const NEED_ORDER: Position[] = ['QB','RB','WR','TE','K','DST']

function getPositionNeeds(roster: RosterSlot[]): string {
  const counts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }
  const needs: Record<string, number>  = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }
  roster.forEach(s => { if (s.player) counts[s.player.position] = (counts[s.player.position]||0)+1 })
  const missing = NEED_ORDER.filter(p => (counts[p]||0) < (needs[p]||0))
  return missing.length ? missing.join(', ') : 'Bench depth'
}

export default function NoahDraftPage() {
  const [players, setPlayers] = useState<Player[]>(() => {
    if (typeof window === 'undefined') return INITIAL_PLAYERS.map(p => ({ ...p, taken: false, drafted: false }))
    try {
      const saved = localStorage.getItem('noah-draft-players')
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS.map(p => ({ ...p, taken: false, drafted: false }))
    } catch { return INITIAL_PLAYERS.map(p => ({ ...p, taken: false, drafted: false })) }
  })
  const [roster, setRoster] = useState<RosterSlot[]>(() => {
    if (typeof window === 'undefined') return ROSTER_TEMPLATE.map(s => ({ ...s }))
    try {
      const saved = localStorage.getItem('noah-draft-roster')
      return saved ? JSON.parse(saved) : ROSTER_TEMPLATE.map(s => ({ ...s }))
    } catch { return ROSTER_TEMPLATE.map(s => ({ ...s })) }
  })
  const [draftPosition, setDraftPosition] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    return parseInt(localStorage.getItem('noah-draft-position') || '1')
  })
  const [totalTeams, setTotalTeams] = useState<number>(() => {
    if (typeof window === 'undefined') return 10
    return parseInt(localStorage.getItem('noah-draft-teams') || '10')
  })
  const [currentPick, setCurrentPick] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    return parseInt(localStorage.getItem('noah-draft-pick') || '1')
  })
  const [setupDone, setSetupDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('noah-draft-setup') === 'true'
  })
  const [chat, setChat] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('noah-draft-chat')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'roster' | 'chat'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPos, setFilterPos] = useState<string>('ALL')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  // Persist everything to localStorage on change
  useEffect(() => { localStorage.setItem('noah-draft-players', JSON.stringify(players)) }, [players])
  useEffect(() => { localStorage.setItem('noah-draft-roster', JSON.stringify(roster)) }, [roster])
  useEffect(() => { localStorage.setItem('noah-draft-pick', String(currentPick)) }, [currentPick])
  useEffect(() => { localStorage.setItem('noah-draft-setup', String(setupDone)) }, [setupDone])
  useEffect(() => { localStorage.setItem('noah-draft-chat', JSON.stringify(chat)) }, [chat])
  useEffect(() => { localStorage.setItem('noah-draft-position', String(draftPosition)) }, [draftPosition])
  useEffect(() => { localStorage.setItem('noah-draft-teams', String(totalTeams)) }, [totalTeams])

  const available = players.filter(p => !p.taken && !p.drafted)
  const myDraftedPlayers = players.filter(p => p.drafted)

  // Determine if it's Noah's turn
  const round = Math.ceil(currentPick / totalTeams)
  const pickInRound = ((currentPick - 1) % totalTeams) + 1
  const isSnakeRound = round % 2 === 0
  const noahPickInRound = isSnakeRound ? totalTeams - draftPosition + 1 : draftPosition
  const isNoahsTurn = pickInRound === noahPickInRound

  // Top picks recommendation
  function getTopPicks(posFilter = 'ALL'): Player[] {
    const drafted = myDraftedPlayers
    const hasCounts: Record<string, number> = {}
    drafted.forEach(p => { hasCounts[p.position] = (hasCounts[p.position]||0)+1 })
    const needs: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }
    const missing = NEED_ORDER.filter(p => (hasCounts[p]||0) < (needs[p]||0))

    return available
      .filter(p => !p.taken && (posFilter === 'ALL' || p.position === posFilter))
      .sort((a, b) => {
        if (posFilter === 'ALL') {
          const aMissing = missing.includes(a.position) ? 0 : 1
          const bMissing = missing.includes(b.position) ? 0 : 1
          if (aMissing !== bMissing) return aMissing - bMissing
        }
        return a.adp - b.adp
      })
      .slice(0, posFilter === 'ALL' ? 5 : 8)
  }

  function markTaken(playerId: number) {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, taken: true } : p))
    setCurrentPick(prev => prev + 1)
  }

  function draftPlayer(playerId: number) {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, drafted: true } : p))
    setCurrentPick(prev => prev + 1)

    // Auto-assign to roster
    setRoster(prev => {
      const newRoster = [...prev.map(s => ({ ...s }))]
      const pos = player.position as string

      // Try exact slot first
      let slotIdx = newRoster.findIndex(s => s.player === null && s.position === pos)
      // Try FLEX for RB/WR/TE
      if (slotIdx === -1 && ['RB','WR','TE'].includes(pos)) {
        slotIdx = newRoster.findIndex(s => s.player === null && s.position === 'FLEX')
      }
      // Bench
      if (slotIdx === -1) {
        slotIdx = newRoster.findIndex(s => s.player === null && s.position === 'BE')
      }
      if (slotIdx !== -1) newRoster[slotIdx].player = player
      return newRoster
    })

    setChat(prev => [...prev, {
      role: 'ai',
      text: `🏈 Locked in! **${player.name}** (${player.position} – ${player.team}) added to your roster. ${player.notes} ${getPositionNeeds(roster) !== 'Bench depth' ? `Next priority: ${getPositionNeeds(roster)}.` : 'Looking solid — time to stack the bench!'}`
    }])
  }

  function undraftPlayer(playerId: number) {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, drafted: false } : p))
    setRoster(prev => prev.map(s => s.player?.id === playerId ? { ...s, player: null } : s))
    setCurrentPick(prev => Math.max(1, prev - 1))
  }

  function unmarkTaken(playerId: number) {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, taken: false } : p))
    setCurrentPick(prev => Math.max(1, prev - 1))
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChat(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/noah/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          draftedPlayers: myDraftedPlayers.map(p => `${p.name} (${p.position})`),
          availablePlayers: available.slice(0, 30).map(p => `${p.name} (${p.position}, ADP ${p.adp})`),
          round,
          draftPosition,
          needs: getPositionNeeds(roster),
        })
      })
      const data = await res.json()
      setChat(prev => [...prev, { role: 'ai', text: data.reply }])
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Network hiccup — try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const filtered = available.filter(p => {
    const matchPos = filterPos === 'ALL' || p.position === filterPos
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.team.toLowerCase().includes(searchQuery.toLowerCase())
    return matchPos && matchSearch
  })

  const takenPlayers = players.filter(p => p.taken)

  if (!setupDone) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏈</div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              NOAH&apos;S<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                WAR ROOM
              </span>
            </h1>
            <p className="text-slate-400 text-sm">Your AI draft commander. Let&apos;s build a championship team.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 space-y-5 backdrop-blur">
            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Your Draft Position</label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setDraftPosition(n)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                      draftPosition === n
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Number of Teams</label>
              <div className="flex gap-2">
                {[8,10,12,14].map(n => (
                  <button
                    key={n}
                    onClick={() => setTotalTeams(n)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                      totalTeams === n
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSetupDone(true)
                setChat([{
                  role: 'ai',
                  text: `Let's get it, Noah. You're pick #${draftPosition} out of ${totalTeams} teams — snake draft, PPR scoring. I'll tell you exactly who to grab every round. When someone gets picked at the party, tap them on the board. When it's your turn, I'll have your top picks ready. Let's build a dynasty. 🏆`
                }])
              }}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-400 text-black font-black text-lg rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all active:scale-95"
            >
              ENTER THE WAR ROOM →
            </button>

            <button
              onClick={() => {
                localStorage.clear()
                setPlayers(INITIAL_PLAYERS.map(p => ({ ...p, taken: false, drafted: false })))
                setRoster(ROSTER_TEMPLATE.map(s => ({ ...s })))
                setDraftPosition(1)
                setTotalTeams(10)
                setCurrentPick(1)
                setSetupDone(false)
                setChat([])
              }}
              className="w-full py-2 text-slate-600 text-xs hover:text-slate-400 transition-colors"
            >
              Reset / Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  const topPicks = getTopPicks(filterPos)

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020817]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏈</span>
            <div>
              <div className="font-black text-sm text-white leading-none">NOAH&apos;S WAR ROOM</div>
              <div className="text-xs text-slate-500">Pick #{draftPosition} · {totalTeams} teams · PPR</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold uppercase tracking-wider ${isNoahsTurn ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
              {isNoahsTurn ? '⚡ YOUR PICK' : `Pick ${currentPick}`}
            </div>
            <div className="text-xs text-slate-600">Round {round}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
          {(['board','roster','chat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'board' ? '📋 Board' : tab === 'roster' ? '🏆 Roster' : '🤖 AI Chat'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">

        {/* DRAFT BOARD TAB */}
        {activeTab === 'board' && (
          <div className="space-y-4 pt-4">

            {/* Your turn banner */}
            {isNoahsTurn && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-xl p-4 text-center">
                <div className="text-green-400 font-black text-lg">⚡ IT&apos;S YOUR PICK!</div>
                <div className="text-slate-400 text-xs mt-1">Round {round} · Grab one of your top picks below</div>
              </div>
            )}

            {/* Top picks */}
            {topPicks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-widest">
                    🎯 {filterPos === 'ALL' ? 'Top Picks For You' : `Top ${filterPos}s Available`}
                  </div>
                  <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="space-y-2">
                  {topPicks.map((p, i) => (
                    <div key={p.id} className={`relative bg-slate-900/60 border rounded-xl p-3 flex items-center gap-3 ${
                      i === 0 ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-slate-700/50'
                    }`}>
                      {i === 0 && <div className="absolute -top-px -right-px">
                        <div className="bg-green-500 text-black text-xs font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl">BEST PICK</div>
                      </div>}
                      <div className="text-lg font-black text-slate-600">#{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white truncate">{p.name}</span>
                          {p.sleeper && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">💤 SLEEPER</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[p.position]}`}>{p.position}</span>
                          <span className="text-xs text-slate-500">{p.team} · Bye {p.bye}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{p.notes}</div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => draftPlayer(p.id)}
                          className="px-3 py-1.5 bg-green-500 text-black text-xs font-black rounded-lg hover:bg-green-400 active:scale-95 transition-all whitespace-nowrap"
                        >
                          DRAFT
                        </button>
                        <button
                          onClick={() => markTaken(p.id)}
                          className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 active:scale-95 transition-all whitespace-nowrap"
                        >
                          Taken
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search + filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Board</div>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50"
              />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['ALL','QB','RB','WR','TE','K','DST'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => setFilterPos(pos)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      filterPos === pos
                        ? 'bg-green-500 text-black'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >{pos}</button>
                ))}
              </div>
            </div>

            {/* Player list */}
            <div className="space-y-1.5">
              {filtered.slice(0, 40).map(p => (
                <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-slate-700 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{p.name}</span>
                      {p.sleeper && <span className="text-xs text-yellow-400">💤</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[p.position]}`}>{p.position}</span>
                      <span className="text-xs text-slate-500">{p.team} · Bye {p.bye}</span>
                      <span className="text-xs text-slate-600">ADP {p.adp}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => draftPlayer(p.id)}
                      className="px-2.5 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold rounded-lg hover:bg-green-500 hover:text-black active:scale-95 transition-all"
                    >
                      DRAFT
                    </button>
                    <button
                      onClick={() => markTaken(p.id)}
                      className="px-2.5 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all"
                    >
                      Taken
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Taken players */}
            {takenPlayers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Taken ({takenPlayers.length})</div>
                  <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="space-y-1">
                  {takenPlayers.map(p => (
                    <div key={p.id} className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-2.5 flex items-center gap-3 opacity-40">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-400 line-through">{p.name}</span>
                          <span className={`text-xs font-bold px-1 py-0.5 rounded ${POS_COLORS[p.position]}`}>{p.position}</span>
                          <span className="text-xs text-slate-600">{p.team}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unmarkTaken(p.id)}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                      >undo</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="pt-4 space-y-4">
            <div className="text-center">
              <div className="text-2xl font-black text-white">Noah&apos;s Team</div>
              <div className="text-sm text-slate-500 mt-1">{myDraftedPlayers.length} / 16 picks · Need: {getPositionNeeds(roster)}</div>
            </div>

            <div className="space-y-2">
              {roster.map((slot, i) => (
                <div key={i} className={`border rounded-xl p-3 flex items-center gap-3 ${
                  slot.player
                    ? 'bg-slate-900/60 border-slate-700/60'
                    : 'bg-slate-900/20 border-slate-800/40'
                }`}>
                  <div className={`text-xs font-black w-12 text-center px-1.5 py-1 rounded border ${
                    slot.position !== 'BE' && slot.position !== 'IR'
                      ? (POS_COLORS[slot.position] || 'text-slate-400 border-slate-700 bg-slate-800')
                      : 'text-slate-600 border-slate-800 bg-slate-900'
                  }`}>
                    {slot.label}
                  </div>
                  {slot.player ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">{slot.player.name}</div>
                        <div className="text-xs text-slate-500">{slot.player.team} · Bye {slot.player.bye}</div>
                      </div>
                      <button
                        onClick={() => undraftPlayer(slot.player!.id)}
                        className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                      >undo</button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-700 italic">Empty</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="pt-4 flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">🤖</div>
                  )}
                  <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-green-500 text-black font-medium rounded-br-sm'
                      : 'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2">🤖</div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick suggestions */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                'Who should I pick next?',
                'Best sleeper available?',
                'Should I grab a QB now?',
                'How\'s my team looking?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q); }}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-full hover:border-green-500/50 hover:text-green-400 transition-all flex-shrink-0"
                >{q}</button>
              ))}
            </div>

            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask your draft analyst..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 bg-green-500 text-black font-black rounded-xl disabled:opacity-40 hover:bg-green-400 active:scale-95 transition-all"
              >→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
