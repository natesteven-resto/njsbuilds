'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, X, Loader2, Users, Mail, Hash, AlertCircle, RefreshCw } from 'lucide-react'
import type { Player } from '@/types/filmroom'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

function PlayerCard({ player, onDelete }: { player: Player; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Remove ${player.name} from the roster?`)) return
    setDeleting(true); setError(null)
    const res = await fetch(`/api/filmroom/players/${player.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Failed to remove player')
      setDeleting(false)
      return
    }
    onDelete(player.id)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
        <span className="font-bold text-blue-300 text-sm">{player.number ?? '—'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white/90">{player.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
          {player.position && <span className="text-white/60">{player.position}</span>}
          {player.parent_email && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" aria-hidden />{player.parent_email}</span>
          )}
        </div>
        {error && <p role="alert" className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
      <Link href={`/filmroom/player/${player.id}`}
        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/6 rounded-xl transition-all opacity-0 group-hover:opacity-100">
        View Portal →
      </Link>
      <button onClick={handleDelete} disabled={deleting}
        aria-label={`Remove ${player.name} (#${player.number ?? '?'})`}
        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40">
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <X className="w-4 h-4" aria-hidden />}
      </button>
    </div>
  )
}

function AddPlayerModal({ teamId, onClose, onAdd }: {
  teamId: string
  onClose: () => void
  onAdd: (p: Player) => void
}) {
  const [form, setForm] = useState({ name: '', number: '', position: '', parent_email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/filmroom/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: teamId,
        name: form.name.trim(),
        // jersey 0 is valid — only null when empty or non-numeric
        number: form.number !== '' ? (isNaN(parseInt(form.number, 10)) ? null : parseInt(form.number, 10)) : null,
        position: form.position || null,
        parent_email: form.parent_email.trim() || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to add player')
      setLoading(false)
      return
    }
    const player = await res.json()
    onAdd(player)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Add Player</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-all">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="player-name" className="block text-xs text-white/50 mb-1">Full Name *</label>
            <input id="player-name" required type="text" placeholder="Jordan Williams"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="player-number" className="block text-xs text-white/50 mb-1">Jersey #</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" aria-hidden />
                <input id="player-number" type="number" min="0" max="99" placeholder="23"
                  value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
              </div>
            </div>
            <div>
              <label htmlFor="player-position" className="block text-xs text-white/50 mb-1">Position</label>
              <select id="player-position" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 text-white/80">
                <option value="">—</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="player-email" className="block text-xs text-white/50 mb-1">Parent Email <span className="text-white/25">(for portal access)</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" aria-hidden />
              <input id="player-email" type="email" placeholder="parent@email.com"
                value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            </div>
          </div>
          {error && <div role="alert" className="flex items-center gap-2 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />{error}</div>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RosterPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('Roster')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Get team first (owner-scoped, no TEST_TEAM_ID)
      const tRes = await fetch('/api/filmroom/teams')
      if (tRes.status === 401) { router.push('/filmroom/login?next=/filmroom/roster'); return }
      if (!tRes.ok) { setError('Failed to load roster'); setLoading(false); return }
      const teams = await tRes.json()
      const team = Array.isArray(teams) && teams.length > 0 ? teams[0] : null
      if (!team) { setTeamId(null); setLoading(false); return }
      setTeamId(team.id)
      setTeamName(team.name)

      // Load players for this team
      const pRes = await fetch(`/api/filmroom/players?team_id=${team.id}`)
      if (!pRes.ok) { setError('Failed to load players'); setLoading(false); return }
      const data = await pRes.json()
      setPlayers(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load roster') }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  const deletePlayer = (id: string) => setPlayers(p => p.filter(x => x.id !== id))

  const positionGroups = POSITIONS.map(pos => ({
    pos, players: players.filter(p => p.position === pos),
  })).filter(g => g.players.length > 0)
  const unpositioned = players.filter(p => !p.position)

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      <header className="border-b border-white/8 sticky top-0 z-40 bg-[#0d0f12]/95 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/filmroom" className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-all" aria-label="Back to Film Room">
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" aria-hidden />
            <span className="font-semibold text-sm">Roster</span>
            {teamName !== 'Roster' && <><span className="text-white/30 text-sm">·</span><span className="text-white/40 text-sm">{teamName}</span></>}
          </div>
          <div className="flex-1" />
          {!loading && !error && <span className="text-xs text-white/30 mr-2">{players.length} player{players.length !== 1 ? 's' : ''}</span>}
          {teamId && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" aria-hidden />Add Player
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div role="alert" className="flex flex-col items-center py-20 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400/60" aria-hidden />
            <p className="text-sm text-white/50">{error}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />Retry
            </button>
          </div>
        )}
        {loading && !error && (
          <div className="flex items-center justify-center py-20" aria-label="Loading roster">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" aria-hidden />
          </div>
        )}
        {!loading && !error && players.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white/20" aria-hidden />
            </div>
            <h3 className="font-semibold text-white/50 mb-2">Empty roster</h3>
            <p className="text-sm text-white/30 mb-6">Add your players to start tagging them in clips and entering stats.</p>
            {teamId && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors mx-auto">
                <Plus className="w-4 h-4" aria-hidden />Add First Player
              </button>
            )}
          </div>
        )}
        {!loading && !error && players.length > 0 && (
          <div className="space-y-6">
            {positionGroups.map(({ pos, players: grp }) => (
              <div key={pos}>
                <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">{pos}</h3>
                <div className="space-y-2">
                  {grp.map(p => <PlayerCard key={p.id} player={p} onDelete={deletePlayer} />)}
                </div>
              </div>
            ))}
            {unpositioned.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">No Position</h3>
                <div className="space-y-2">
                  {unpositioned.map(p => <PlayerCard key={p.id} player={p} onDelete={deletePlayer} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showAdd && teamId && (
        <AddPlayerModal
          teamId={teamId}
          onClose={() => setShowAdd(false)}
          onAdd={p => setPlayers(prev => [...prev, p])}
        />
      )}
    </div>
  )
}
