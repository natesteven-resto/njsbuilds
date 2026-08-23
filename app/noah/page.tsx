'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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
  drafted: boolean
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
  QB:  'text-red-400 border-red-500/50 bg-red-500/10',
  RB:  'text-green-400 border-green-500/50 bg-green-500/10',
  WR:  'text-blue-400 border-blue-500/50 bg-blue-500/10',
  TE:  'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  K:   'text-purple-400 border-purple-500/50 bg-purple-500/10',
  DST: 'text-orange-400 border-orange-500/50 bg-orange-500/10',
}

const NEED_ORDER: Position[] = ['QB','RB','WR','TE','K','DST']

// Playoff schedule difficulty: weeks 15-17 opponents per team
// Score: 1-10 where 10 = easiest playoff schedule, 1 = hardest
// Based on 2026 opponents: elite defenses (KC, SF, BAL, BUF, PHI) = hard
// Soft defenses (CAR, NYG, LV, TEN, JAC, DEN) = easy
const PLAYOFF_SCHEDULE: Record<string, number> = {
  // Easy playoff schedules (8-10) — face weak defenses weeks 15-17
  'DAL': 10,  // vs JAC, vs NYG, @ WAS — all weak
  'DET': 9,   // vs MIN, vs NYG, @ CHI — manageable
  'ATL': 8,   // @ CLE, @ WAS, vs TB — all beatable
  'GB':  8,   // @ CHI, vs HOU, vs DET — soft
  'MIN': 8,   // @ DET, vs WAS, vs CHI — soft
  'TEN': 9,   // vs IND, vs PIT, @ HOU — very soft
  'IND': 8,   // vs PHI, @ TEN, vs CIN — mixed but manageable
  'NO':  8,   // @ ARI, @ ATL, vs TB — all beatable
  'CAR': 7,   // vs SEA, vs CIN, vs ATL — home games help
  'LV':  8,   // vs DEN, @ KC, vs KC — winnable
  'NE':  7,   // @ NYJ, vs DEN, vs MIA — below avg opponents
  'NYJ': 7,   // vs NE, @ NE, vs MIN — meh
  'WAS': 7,   // @ MIN, vs ATL, @ JAC — mixed
  'DEN': 7,   // @ LV, vs BUF, @ NE — mixed
  'ARI': 7,   // vs WAS, vs PHI, vs SF — tough home schedule
  'TB':  7,   // @ LAR, @ ATL, vs NO — manageable
  'JAC': 7,   // @ HOU, @ DAL, vs WAS — soft opponents
  'CLE': 6,   // @ BAL, vs IND, @ CIN — division gauntlet
  'HOU': 6,   // @ PHI, @ GB, vs TEN — mixed
  'CHI': 6,   // @ BUF, vs GB, vs DET — mixed
  // Hard playoff schedules (1-5) — face elite defenses weeks 15-17
  'PHI': 5,   // vs HOU, @ IND, vs SF — SF in playoffs brutal
  'MIA': 5,   // vs LAC, vs BUF, @ NE — BUF defense elite
  'LAC': 5,   // @ MIA, vs KC, @ DEN — KC defense tough
  'PIT': 5,   // vs BAL, @ CAR, @ TEN — BAL matchup brutal
  'CIN': 4,   // @ CAR, @ IND, vs BAL — BAL matchup brutal
  'LAR': 4,   // @ SF, vs DAL, @ SEA — SF defense elite
  'SEA': 4,   // vs NYG, @ PHI, @ CAR — PHI defense strong
  'BAL': 3,   // @ PIT, vs CLE, @ CIN — tough AFC North
  'SF':  3,   // @ LAC, @ KC, @ PHI — brutal road schedule
  'BUF': 3,   // @ DEN, @ MIA, vs NYJ — MIA in December tough
  'KC':  3,   // @ LAC, vs LV, @ LV — LAC is tough
  'NYG': 6,   // @ SEA, @ CLE, @ DET — all road but soft
}

function getPositionNeeds(roster: RosterSlot[]): string {
  const counts: Record<string, number> = {}
  const needs: Record<string, number> = { QB:1, RB:2, WR:2, TE:1, K:1, DST:1 }
  roster.forEach(s => { if (s.player) counts[s.player.position] = (counts[s.player.position]||0)+1 })
  const missing = NEED_ORDER.filter(p => (counts[p]||0) < (needs[p]||0))
  return missing.length ? missing.join(', ') : 'Bench depth'
}

// Minimal fallback if API fails
const FALLBACK_PLAYERS: Omit<Player,'taken'|'drafted'>[] = [
  { id:1, name:'Saquon Barkley', team:'PHI', position:'RB', bye:5, tier:1, adp:1, notes:'Top RB, PPR workhorse.', sleeper:false },
  { id:2, name:'CeeDee Lamb', team:'DAL', position:'WR', bye:7, tier:1, adp:2, notes:'Elite WR1, massive target share.', sleeper:false },
  { id:3, name:'Ja\'Marr Chase', team:'CIN', position:'WR', bye:6, tier:1, adp:3, notes:'Generational route runner.', sleeper:false },
  { id:4, name:'Bijan Robinson', team:'ATL', position:'RB', bye:11, tier:1, adp:4, notes:'Every-down stud.', sleeper:false },
  { id:5, name:'Breece Hall', team:'NYJ', position:'RB', bye:12, tier:1, adp:5, notes:'PPR gold, lead back.', sleeper:false },
  { id:6, name:'Lamar Jackson', team:'BAL', position:'QB', bye:13, tier:1, adp:6, notes:'Elite dual-threat QB.', sleeper:false },
  { id:7, name:'Josh Allen', team:'BUF', position:'QB', bye:7, tier:1, adp:7, notes:'Top rushing QB.', sleeper:false },
  { id:8, name:'Justin Jefferson', team:'MIN', position:'WR', bye:6, tier:1, adp:8, notes:'Generational route running.', sleeper:false },
  { id:9, name:'Tyreek Hill', team:'MIA', position:'WR', bye:6, tier:1, adp:9, notes:'Volume machine, fastest WR.', sleeper:false },
  { id:10, name:'Travis Kelce', team:'KC', position:'TE', bye:5, tier:1, adp:10, notes:'Elite TE, Mahomes connection.', sleeper:false },
  { id:11, name:'Amon-Ra St. Brown', team:'DET', position:'WR', bye:6, tier:1, adp:11, notes:'PPR monster.', sleeper:false },
  { id:12, name:'Trey McBride', team:'ARI', position:'TE', bye:14, tier:1, adp:12, notes:'Top TE, massive targets.', sleeper:false },
  { id:13, name:'Brock Bowers', team:'LV', position:'TE', bye:13, tier:1, adp:13, notes:'Generational TE talent.', sleeper:false },
  { id:14, name:'Sam LaPorta', team:'DET', position:'TE', bye:6, tier:2, adp:14, notes:'DET feeds their TEs.', sleeper:false },
  { id:15, name:'Jahmyr Gibbs', team:'DET', position:'RB', bye:6, tier:1, adp:15, notes:'Dynamic pass-catcher.', sleeper:false },
  { id:16, name:'De\'Von Achane', team:'MIA', position:'RB', bye:6, tier:1, adp:16, notes:'Fastest in the league.', sleeper:false },
  { id:17, name:'Drake London', team:'ATL', position:'WR', bye:11, tier:1, adp:17, notes:'ATL loaded offense.', sleeper:false },
  { id:18, name:'Marvin Harrison Jr.', team:'ARI', position:'WR', bye:14, tier:1, adp:18, notes:'Generational rookie.', sleeper:false },
  { id:19, name:'Jalen Hurts', team:'PHI', position:'QB', bye:10, tier:1, adp:19, notes:'Rushing floor makes him elite.', sleeper:false },
  { id:20, name:'Derrick Henry', team:'BAL', position:'RB', bye:13, tier:2, adp:20, notes:'Still a tank.', sleeper:false },
]

export default function NoahDraftPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'live'|'fallback'|null>(null)
  const [roster, setRoster] = useState<RosterSlot[]>(() => {
    if (typeof window === 'undefined') return ROSTER_TEMPLATE.map(s => ({...s}))
    try { const s = localStorage.getItem('noah-draft-roster'); return s ? JSON.parse(s) : ROSTER_TEMPLATE.map(s => ({...s})) } catch { return ROSTER_TEMPLATE.map(s => ({...s})) }
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
    try { const s = localStorage.getItem('noah-draft-chat'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'board'|'roster'|'chat'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPos, setFilterPos] = useState<string>('ALL')
  const [showAddUnknown, setShowAddUnknown] = useState(false)
  const [unknownName, setUnknownName] = useState('')
  const [unknownPos, setUnknownPos] = useState<Position>('RB')
  const [unknownAction, setUnknownAction] = useState<'taken'|'draft'>('taken')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const nextCustomId = useRef(10000)

  // Load live player data
  useEffect(() => {
    async function loadPlayers() {
      // Check if we have saved players already (resuming draft)
      const savedPlayers = localStorage.getItem('noah-draft-players')
      if (savedPlayers) {
        try {
          const parsed = JSON.parse(savedPlayers)
          if (parsed.length > 0) {
            setPlayers(parsed)
            setDataSource('live')
            setLoading(false)
            return
          }
        } catch {}
      }

      // Fresh load — fetch from API
      try {
        const res = await fetch('/api/noah/players')
        const data = await res.json()
        if (data.players && data.players.length > 0) {
          setPlayers(data.players)
          setDataSource('live')
          localStorage.setItem('noah-draft-players', JSON.stringify(data.players))
        } else {
          throw new Error('No players')
        }
      } catch {
        // Fallback to hardcoded
        const fallback = FALLBACK_PLAYERS.map(p => ({ ...p, taken: false, drafted: false }))
        setPlayers(fallback)
        setDataSource('fallback')
        localStorage.setItem('noah-draft-players', JSON.stringify(fallback))
      } finally {
        setLoading(false)
      }
    }
    loadPlayers()
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat])

  // Persist to localStorage
  useEffect(() => { if (players.length > 0) localStorage.setItem('noah-draft-players', JSON.stringify(players)) }, [players])
  useEffect(() => { localStorage.setItem('noah-draft-roster', JSON.stringify(roster)) }, [roster])
  useEffect(() => { localStorage.setItem('noah-draft-pick', String(currentPick)) }, [currentPick])
  useEffect(() => { localStorage.setItem('noah-draft-setup', String(setupDone)) }, [setupDone])
  useEffect(() => {
    // Only keep last 30 messages to avoid localStorage bloat
    const trimmed = chat.slice(-30)
    localStorage.setItem('noah-draft-chat', JSON.stringify(trimmed))
  }, [chat])
  useEffect(() => { localStorage.setItem('noah-draft-position', String(draftPosition)) }, [draftPosition])
  useEffect(() => { localStorage.setItem('noah-draft-teams', String(totalTeams)) }, [totalTeams])

  const available = players.filter(p => !p.taken && !p.drafted)
  const myDraftedPlayers = players.filter(p => p.drafted)

  // Smart strategy engine
  function getTopPicks(posFilter = 'ALL'): Player[] {
    const counts: Record<string, number> = {}
    myDraftedPlayers.forEach(p => { counts[p.position] = (counts[p.position]||0)+1 })
    const total = myDraftedPlayers.length // how many picks Noah has made

    // Score each available player based on roster context
    function score(p: Player): number {
      let s = 1000 - p.adp // base: higher rank = higher score

      if (posFilter !== 'ALL') return s // filtering by position — just use rank

      const rb = counts['RB']||0
      const wr = counts['WR']||0
      const qb = counts['QB']||0
      const te = counts['TE']||0
      const dst = counts['DST']||0
      const k = counts['K']||0

      // Early rounds (picks 1-3): pure best player available
      if (total < 3) return s

      // QB: don't reach early, but don't wait past pick 6 if elite ones are gone
      if (p.position === 'QB') {
        if (qb >= 1) s -= 300       // already have one, deprioritize hard
        else if (total < 5) s -= 150 // too early for QB unless elite (adp < 20)
        else if (total >= 5 && p.adp < 50) s += 50 // good QB available mid-draft
      }

      // RB: premium position in PPR, stack early
      if (p.position === 'RB') {
        if (rb === 0 && total >= 2) s += 200  // panic: no RB after 2 picks
        else if (rb === 1 && total < 6) s += 100 // get that second RB
        else if (rb >= 3) s -= 150            // 3 RBs is enough starters
        else if (rb >= 4) s -= 300            // way too many RBs
      }

      // WR: also premium, need 2 solid starters
      if (p.position === 'WR') {
        if (wr === 0 && total >= 3) s += 150  // need a WR
        else if (wr === 1 && total < 7) s += 75
        else if (wr >= 4) s -= 150
      }

      // TE: get one good one, don't double up early
      if (p.position === 'TE') {
        if (te === 0 && total >= 4 && p.adp < 60) s += 100  // elite TE available
        else if (te === 0 && total >= 7) s += 50             // late grab is fine
        else if (te >= 1) s -= 200                           // one is enough
      }

      // DST/K: stream late, never early
      if (p.position === 'DST') {
        if (total < 12) s -= 500  // never draft DST before round ~13
        else if (dst >= 1) s -= 300
      }
      if (p.position === 'K') {
        if (total < 13) s -= 600  // always last pick
        else if (k >= 1) s -= 400
      }

      // Playoff schedule bonus — boost players on teams with soft weeks 15-17
      const playoffScore = PLAYOFF_SCHEDULE[p.team] || 5
      const playoffBonus = (playoffScore - 5) * 8 // range: -32 to +40
      s += playoffBonus

      return s
    }

    return available
      .filter(p => posFilter === 'ALL' || p.position === posFilter)
      .map(p => ({ player: p, score: score(p) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.player)
      .slice(0, posFilter === 'ALL' ? 5 : 8)
  }

  // Strategy label shown under top picks
  function getStrategyNote(): string {
    const counts: Record<string, number> = {}
    myDraftedPlayers.forEach(p => { counts[p.position] = (counts[p.position]||0)+1 })
    const total = myDraftedPlayers.length
    const rb = counts['RB']||0, wr = counts['WR']||0, qb = counts['QB']||0, te = counts['TE']||0

    if (total === 0) return 'Take the best player available — position doesn\'t matter yet.'
    if (rb === 0 && total >= 2) return '⚠️ You need a RB — this is getting urgent.'
    if (wr === 0 && total >= 3) return '⚠️ You need a WR — grab one now.'
    if (qb === 0 && total >= 6) return 'Consider a QB soon — the good ones are going fast.'
    if (te === 0 && total >= 6) return 'TE is a big position gap — grab a good one if available.'
    if (rb >= 2 && wr >= 2 && qb >= 1 && te === 0) return 'Core is solid — target TE or best player available.'
    if (rb >= 2 && wr >= 2 && qb >= 1 && te >= 1) return 'Stack bench with upside — handcuffs and sleepers now.'
    if (total >= 13) return 'Stream DST and grab your K — almost done!'
    if (total >= 6 && total <= 10) return 'Playoff schedule factored in — we favor players with soft weeks 15-17.'
    return 'Build around your stars — grab best value available.'
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

    setRoster(prev => {
      const newRoster = prev.map(s => ({...s}))
      const pos = player.position
      let idx = newRoster.findIndex(s => s.player === null && s.position === pos)
      if (idx === -1 && ['RB','WR','TE'].includes(pos))
        idx = newRoster.findIndex(s => s.player === null && s.position === 'FLEX')
      if (idx === -1)
        idx = newRoster.findIndex(s => s.player === null && s.position === 'BE')
      if (idx !== -1) newRoster[idx].player = player
      return newRoster
    })

    setChat(prev => [...prev, {
      role: 'ai',
      text: `🏈 Locked in! ${player.name} (${player.position} – ${player.team}) added. ${player.notes} Next priority: ${getPositionNeeds(roster)}.`
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

  function addUnknownPlayer() {
    if (!unknownName.trim()) return
    const newPlayer: Player = {
      id: nextCustomId.current++,
      name: unknownName.trim(),
      team: '???',
      position: unknownPos,
      bye: 0,
      tier: 5,
      adp: 999,
      taken: unknownAction === 'taken',
      drafted: unknownAction === 'draft',
      notes: 'Manually added during draft.',
    }
    setPlayers(prev => [...prev, newPlayer])
    if (unknownAction === 'draft') {
      setRoster(prev => {
        const newRoster = prev.map(s => ({...s}))
        const pos = unknownPos as string
        let idx = newRoster.findIndex(s => s.player === null && s.position === pos)
        if (idx === -1 && ['RB','WR','TE'].includes(pos))
          idx = newRoster.findIndex(s => s.player === null && s.position === 'FLEX')
        if (idx === -1)
          idx = newRoster.findIndex(s => s.player === null && s.position === 'BE')
        if (idx !== -1) newRoster[idx].player = newPlayer
        return newRoster
      })
    }
    setCurrentPick(prev => prev + 1)
    setUnknownName('')
    setShowAddUnknown(false)
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
          availablePlayers: available.slice(0, 30).map(p => `${p.name} (${p.position}, rank ${p.adp})`),
          round: myDraftedPlayers.length,
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

  function doReset() {
    Object.keys(localStorage).filter(k => k.startsWith('noah-draft')).forEach(k => localStorage.removeItem(k))
    setPlayers([])
    setRoster(ROSTER_TEMPLATE.map(s => ({...s})))
    setDraftPosition(1)
    setTotalTeams(10)
    setCurrentPick(1)
    setSetupDone(false)
    setChat([])
    setLoading(true)
    // Re-fetch live data
    fetch('/api/noah/players').then(r => r.json()).then(data => {
      if (data.players?.length > 0) {
        setPlayers(data.players)
        localStorage.setItem('noah-draft-players', JSON.stringify(data.players))
      } else {
        const fallback = FALLBACK_PLAYERS.map(p => ({ ...p, taken: false, drafted: false }))
        setPlayers(fallback)
        localStorage.setItem('noah-draft-players', JSON.stringify(fallback))
      }
    }).catch(() => {
      const fallback = FALLBACK_PLAYERS.map(p => ({ ...p, taken: false, drafted: false }))
      setPlayers(fallback)
      localStorage.setItem('noah-draft-players', JSON.stringify(fallback))
    }).finally(() => setLoading(false))
  }

  const filtered = available.filter(p => {
    const matchPos = filterPos === 'ALL' || p.position === filterPos
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.team.toLowerCase().includes(searchQuery.toLowerCase())
    return matchPos && matchSearch
  })

  const takenPlayers = players.filter(p => p.taken)
  const topPicks = getTopPicks(filterPos)

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🏈</div>
          <div className="text-white font-black text-lg">Loading live rankings...</div>
          <div className="text-slate-500 text-xs mt-2">Pulling real 2026 PPR data</div>
        </div>
      </div>
    )
  }

  // Setup screen — just needs to know it's ready
  if (!setupDone) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏈</div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              NOAH&apos;S<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">WAR ROOM</span>
            </h1>
            <p className="text-slate-400 text-sm">AI draft commander. Let&apos;s build a championship team.</p>
            {dataSource === 'live' && <div className="mt-2 text-xs text-green-400/60">✓ Live 2026 PPR rankings loaded ({players.length} players)</div>}
            {dataSource === 'fallback' && <div className="mt-2 text-xs text-yellow-400/60">⚠ Using backup rankings — check connection</div>}
          </div>

          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 space-y-5 backdrop-blur">
            <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
              <div className="font-black text-white mb-2">How it works:</div>
              <div className="space-y-1.5 text-slate-400 text-xs">
                <div>📍 When someone picks a player — tap <span className="text-slate-200 font-bold">Taken</span></div>
                <div>🎯 When it’s your turn — tap <span className="text-green-400 font-bold">DRAFT</span> on your best pick</div>
                <div>🤖 Ask the AI anything in the Chat tab</div>
                <div>🔍 Search any player by name</div>
              </div>
            </div>

            <button
              onClick={()=>{
                setSetupDone(true)
                setChat([{role:'ai', text:`Let's go, Noah. Snake draft, PPR scoring — live rankings loaded. When someone picks a player, tap Taken. I'll always show your best options based on what you've already drafted. Let's build a dynasty. 🏆`}])
              }}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-400 text-black font-black text-lg rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all active:scale-95"
            >ENTER THE WAR ROOM →</button>

            <button
              onClick={() => {
                if (window.confirm('⚠️ Are you sure? This will wipe any saved data and reload fresh rankings.')) {
                  doReset()
                }
              }}
              className="w-full py-3 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl hover:bg-red-500/10 transition-all active:scale-95"
            >🗑️ Reset & Reload Fresh Rankings</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020817]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏈</span>
            <div>
              <div className="font-black text-sm text-white leading-none">NOAH&apos;S WAR ROOM</div>
              <div className="text-xs text-slate-500">PPR Snake Draft {dataSource === 'live' ? '· 🟢 Live' : '· ⚠️ Offline'}</div>
              <a href="/noah/team" className="text-xs text-green-400 font-bold hover:text-green-300 transition-colors">🏆 Manage Team →</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pick {currentPick}
              </div>
              <div className="text-xs text-slate-600">{myDraftedPlayers.length} drafted</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('⚠️ Are you sure? This will wipe your entire draft and reload fresh rankings. This cannot be undone.'))
                  doReset()
              }}
              className="text-xs text-red-400/70 border border-red-500/30 rounded-lg px-2 py-1 hover:bg-red-500/10 transition-all active:scale-95"
            >🗑️ Reset</button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
          {(['board','roster','chat'] as const).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab===tab?'bg-green-500/20 text-green-400 border border-green-500/40':'text-slate-500 hover:text-slate-300'}`}
            >{tab==='board'?'📋 Board':tab==='roster'?'🏆 Roster':'🤖 AI Chat'}</button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">

        {/* BOARD TAB */}
        {activeTab === 'board' && (
          <div className="space-y-4 pt-4">


            {/* Top Picks */}
            {topPicks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-widest">
                    🎯 {filterPos==='ALL'?'Top Picks For You':`Top ${filterPos}s Available`}
                  </div>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                {filterPos === 'ALL' && (
                  <div className="text-xs text-slate-500 italic mb-3">{getStrategyNote()}</div>
                )}
                <div className="space-y-2">
                  {topPicks.map((p,i)=>(
                    <div key={p.id} className={`relative bg-slate-900/60 border rounded-xl p-3 flex items-center gap-3 ${i===0?'border-green-500/50 shadow-lg shadow-green-500/10':'border-slate-700/50'}`}>
                      {i===0&&<div className="absolute -top-px -right-px"><div className="bg-green-500 text-black text-xs font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl">BEST PICK</div></div>}
                      <div className="text-lg font-black text-slate-600">#{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-white">{p.name}</span>
                          {p.sleeper&&<span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">💤 SLEEPER</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[p.position]}`}>{p.position}</span>
                          <span className="text-xs text-slate-500">{p.team}{p.bye?` · Bye ${p.bye}`:''}</span>
                          <span className="text-xs text-slate-600">Rank #{p.adp}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{p.notes}
                          {PLAYOFF_SCHEDULE[p.team] >= 8 && (
                            <span className="ml-1 text-xs text-emerald-400 font-bold">📅 Easy playoffs</span>
                          )}
                          {PLAYOFF_SCHEDULE[p.team] !== undefined && PLAYOFF_SCHEDULE[p.team] <= 4 && (
                            <span className="ml-1 text-xs text-red-400/70 font-bold">📅 Tough playoffs</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={()=>draftPlayer(p.id)} className="px-3 py-1.5 bg-green-500 text-black text-xs font-black rounded-lg hover:bg-green-400 active:scale-95 transition-all">DRAFT</button>
                        <button onClick={()=>markTaken(p.id)} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 active:scale-95 transition-all">Taken</button>
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
                <div className="flex-1 h-px bg-slate-800"/>
              </div>
              <input type="text" placeholder="Search players..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50"/>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['ALL','QB','RB','WR','TE','K','DST'].map(pos=>(
                  <button key={pos} onClick={()=>setFilterPos(pos)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterPos===pos?'bg-green-500 text-black':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >{pos}</button>
                ))}
              </div>
            </div>

            {/* Add unknown player */}
            <div>
              <button onClick={()=>setShowAddUnknown(v=>!v)}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
                {showAddUnknown?'▲':'▼'} Player not in list? Add them manually
              </button>
              {showAddUnknown && (
                <div className="mt-2 bg-slate-900/60 border border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="text-xs text-slate-400 font-bold">Add unknown player</div>
                  <input type="text" placeholder="Player name..." value={unknownName} onChange={e=>setUnknownName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"/>
                  <div className="flex gap-2">
                    <select value={unknownPos} onChange={e=>setUnknownPos(e.target.value as Position)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
                      {(['QB','RB','WR','TE','K','DST'] as Position[]).map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={unknownAction} onChange={e=>setUnknownAction(e.target.value as 'taken'|'draft')}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
                      <option value="taken">Mark Taken</option>
                      <option value="draft">I Drafted</option>
                    </select>
                  </div>
                  <button onClick={addUnknownPlayer} disabled={!unknownName.trim()}
                    className="w-full py-2 bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold rounded-lg hover:bg-green-500 hover:text-black transition-all disabled:opacity-40">
                    Add Player
                  </button>
                </div>
              )}
            </div>

            {/* Player list */}
            <div className="space-y-1.5">
              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🤷</div>
                  <div className="text-slate-400 text-sm font-bold">Player not found</div>
                  <div className="text-slate-600 text-xs mt-2 leading-relaxed">Use &quot;Add manually&quot; above to mark them taken or add to your roster.</div>
                </div>
              )}
              {filtered.slice(0,50).map(p=>(
                <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-slate-700 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{p.name}</span>
                      {p.sleeper&&<span className="text-xs text-yellow-400">💤</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[p.position]}`}>{p.position}</span>
                      <span className="text-xs text-slate-500">{p.team}{p.bye?` · Bye ${p.bye}`:''}</span>
                      <span className="text-xs text-slate-600">#{p.adp}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {PLAYOFF_SCHEDULE[p.team] >= 8 && (
                        <span className="text-emerald-400 font-bold">📅 Easy playoffs</span>
                      )}
                      {PLAYOFF_SCHEDULE[p.team] !== undefined && PLAYOFF_SCHEDULE[p.team] <= 4 && (
                        <span className="text-red-400/70 font-bold">📅 Tough playoffs</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>draftPlayer(p.id)} className="px-2.5 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold rounded-lg hover:bg-green-500 hover:text-black active:scale-95 transition-all">DRAFT</button>
                    <button onClick={()=>markTaken(p.id)} className="px-2.5 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all">Taken</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Taken players */}
            {takenPlayers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Taken ({takenPlayers.length})</div>
                  <div className="flex-1 h-px bg-slate-800"/>
                </div>
                <div className="space-y-1">
                  {takenPlayers.map(p=>(
                    <div key={p.id} className="opacity-40 bg-slate-900/20 border border-slate-800/50 rounded-xl p-2.5 flex items-center gap-3">
                      <div className="flex-1">
                        <span className="font-bold text-sm text-slate-400 line-through">{p.name}</span>
                        <span className={`ml-2 text-xs font-bold px-1 py-0.5 rounded ${POS_COLORS[p.position]}`}>{p.position}</span>
                        <span className="ml-1 text-xs text-slate-600">{p.team}</span>
                      </div>
                      <button onClick={()=>unmarkTaken(p.id)} className="text-xs text-slate-600 hover:text-slate-400">undo</button>
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
              {roster.map((slot,i)=>(
                <div key={i} className={`border rounded-xl p-3 flex items-center gap-3 ${slot.player?'bg-slate-900/60 border-slate-700/60':'bg-slate-900/20 border-slate-800/40'}`}>
                  <div className={`text-xs font-black w-12 text-center px-1.5 py-1 rounded border ${slot.position!=='BE'&&slot.position!=='IR'?(POS_COLORS[slot.position]||'text-slate-400 border-slate-700 bg-slate-800'):'text-slate-600 border-slate-800 bg-slate-900'}`}>
                    {slot.label}
                  </div>
                  {slot.player ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">{slot.player.name}</div>
                        <div className="text-xs text-slate-500">{slot.player.team}{slot.player.bye?` · Bye ${slot.player.bye}`:''}</div>
                      </div>
                      <button onClick={()=>undraftPlayer(slot.player!.id)} className="text-xs text-red-500/60 hover:text-red-400">undo</button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-700 italic">Empty</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (window.confirm('⚠️ Are you sure? This will wipe your entire draft and reload fresh rankings. This cannot be undone.')) {
                  doReset()
                }
              }}
              className="w-full py-3 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl hover:bg-red-500/10 transition-all active:scale-95 mt-2"
            >
              🗑️ Reset Draft
            </button>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="pt-4 flex flex-col" style={{height:'calc(100vh - 160px)'}}>
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {chat.map((msg,i)=>(
                <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
                  {msg.role==='ai'&&<div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">🤖</div>}
                  <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role==='user'?'bg-green-500 text-black font-medium rounded-br-sm':'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading&&(
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs mr-2">🤖</div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,150,300].map(d=><div key={d} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['Who should I pick next?','Best sleeper available?','Should I grab a QB now?','How\'s my team looking?'].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-full hover:border-green-500/50 hover:text-green-400 transition-all flex-shrink-0">{q}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                placeholder="Ask your draft analyst..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-green-500/50"/>
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                className="px-4 bg-green-500 text-black font-black rounded-xl disabled:opacity-40 hover:bg-green-400 active:scale-95 transition-all">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
