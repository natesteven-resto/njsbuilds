'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, X, Loader2, Users, Mail, Hash } from 'lucide-react'
import type { Player } from '@/types/filmroom'
import { TEST_TEAM_ID } from '@/types/filmroom'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

function PlayerCard({ player, onDelete }: { player: Player; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors group">
      {/* Jersey number */}
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
        <span className="font-bold text-blue-300 text-sm">{player.number ?? '—'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white/90">{player.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
          {player.position && <span className="text-white/60">{player.position}</span>}
          {player.parent_email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {player.parent_email}
            </span>
          )}
        </div>
      </div>
      <Link href={`/filmroom/player/${player.id}`}
        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/6 rounded-xl transition-all opacity-0 group-hover:opacity-100">
        View Portal →
      </Link>
      <button onClick={() => onDelete(player.id)}
        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function AddPlayerModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Player) => void }) {
  const [form, setForm] = useState({ name: '', number: '', position: '', parent_email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/filmroom/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: TEST_TEAM_ID,
          name: form.name,
          number: parseInt(form.number) || null,
          position: form.position || null,
          parent_email: form.parent_email || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const player = await res.json()
      onAdd(player)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Add Player</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Full Name *</label>
            <input required type="text" placeholder="Jordan Williams"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Jersey #</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input type="number" min="0" max="99" placeholder="23"
                  value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Position</label>
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 text-white/80">
                <option value="">—</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Parent Email <span className="text-white/25">(for portal access)</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input type="email" placeholder="parent@email.com"
                value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />} Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetch(`/api/filmroom/players?team_id=${TEST_TEAM_ID}`)
      .then(r => r.json())
      .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const deletePlayer = async (id: string) => {
    if (!confirm('Remove this player from the roster?')) return
    await fetch(`/api/filmroom/players/${id}`, { method: 'DELETE' })
    setPlayers(p => p.filter(x => x.id !== id))
  }

  const positionGroups = POSITIONS.map(pos => ({
    pos, players: players.filter(p => p.position === pos),
  })).filter(g => g.players.length > 0)
  const unpositioned = players.filter(p => !p.position)

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      {/* Header */}
      <header className="border-b border-white/8 sticky top-0 z-40 bg-[#0d0f12]/95 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/filmroom" className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm">Roster</span>
            <span className="text-white/30 text-sm">·</span>
            <span className="text-white/40 text-sm">Varsity Boys</span>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-white/30 mr-2">{players.length} player{players.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Player
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="font-semibold text-white/50 mb-2">Empty roster</h3>
            <p className="text-sm text-white/30 mb-6">Add your players to start tagging them in clips and entering stats.</p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Add First Player
            </button>
          </div>
        ) : (
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

      {showAdd && (
        <AddPlayerModal
          onClose={() => setShowAdd(false)}
          onAdd={p => setPlayers(prev => [...prev, p])}
        />
      )}
    </div>
  )
}
