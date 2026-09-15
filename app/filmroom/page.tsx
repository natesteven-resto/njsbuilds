'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AccountBar } from './components/AccountBar'
import { Film, Plus, Users, ChevronRight, Video, X, Loader2, Star, AlertCircle, RefreshCw } from 'lucide-react'
import type { Game } from '@/types/filmroom'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function GameCard({ game, onDelete, onSelect }: { game: Game; onDelete: (id: string) => void; onSelect: (id: string) => void }) {
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Delete game vs ${game.opponent} and all its clips?`)) return
    setDeleting(true); setDeleteError(null)
    const res = await fetch(`/api/filmroom/games/${game.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }))
      setDeleteError(err.error ?? 'Delete failed'); setDeleting(false); return
    }
    onDelete(game.id)
  }

  return (
    <div className="group block cursor-pointer" onClick={() => onSelect(game.id)}>
      <div className="relative rounded-lg border border-white/10 bg-[#111316] hover:border-white/20 hover:bg-[#14171c] transition-all duration-150 overflow-hidden">
        <div className="aspect-video bg-[#0a0b0d] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)' }} />
          {game.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.thumbnail_url} alt={`${game.opponent} thumbnail`} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Film className="w-6 h-6 text-white/15" aria-hidden />
              {game.video_url
                ? <span className="text-[10px] text-emerald-400/70 flex items-center gap-1"><Video className="w-3 h-3" aria-hidden />Film ready</span>
                : <span className="text-[10px] text-white/20">No film</span>}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 z-20" aria-hidden>
            <div className="w-10 h-10 rounded-full bg-[#2563EB]/90 flex items-center justify-center">
              <Video className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-semibold text-[13px] text-white truncate leading-tight group-hover:text-[#2563EB] transition-colors">vs {game.opponent}</h3>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 shrink-0 mt-0.5 transition-colors" aria-hidden />
          </div>
          <p className="text-[11px] text-white/35">{formatDate(game.game_date)}</p>
          {game.location && <p className="text-[11px] text-white/25 truncate mt-0.5">{game.location}</p>}
          {deleteError && <p role="alert" className="text-[10px] text-red-400 mt-1">{deleteError}</p>}
        </div>
        <button onClick={handleDelete} disabled={deleting}
          aria-label={`Delete game vs ${game.opponent}`}
          className="absolute top-1.5 right-1.5 z-30 p-1 rounded bg-black/70 hover:bg-red-600/90 text-white/40 hover:text-white transition-colors disabled:opacity-40">
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> : <X className="w-3 h-3" aria-hidden />}
        </button>
      </div>
    </div>
  )
}

function AddGameModal({ teamId, onClose, onAdd }: { teamId: string | null; onClose: () => void; onAdd: (g: Game) => void }) {
  const [form, setForm] = useState({ opponent: '', game_date: '', location: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId) { setError('No team found. Please reload.'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/filmroom/games', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, opponent: form.opponent.trim(), game_date: form.game_date, location: form.location.trim() || null, notes: form.notes.trim() || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create game'); setLoading(false); return
    }
    onAdd(await res.json()); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111316] border border-white/12 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="text-base font-semibold tracking-tight">Add Game</h2><p className="text-xs text-white/40 mt-0.5">New entry to your film library</p></div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" aria-hidden /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {[
            { id: 'opponent', label: 'Opponent *', type: 'text', required: true, placeholder: 'Lincoln Eagles', key: 'opponent' as const },
            { id: 'game_date', label: 'Game Date *', type: 'date', required: true, placeholder: '', key: 'game_date' as const },
            { id: 'location', label: 'Location', type: 'text', required: false, placeholder: 'Home / Away / Arena', key: 'location' as const },
          ].map(f => (
            <div key={f.id}>
              <label htmlFor={f.id} className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">{f.label}</label>
              <input id={f.id} type={f.type} required={f.required} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 transition-colors" />
            </div>
          ))}
          <div>
            <label htmlFor="notes" className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea id="notes" rows={2} placeholder="Quick notes..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 resize-none transition-colors" />
          </div>
          {error && <div role="alert" className="flex items-start gap-2 text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded px-2.5 py-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />{error}</div>}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}Add Game
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FilmRoomHome() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('My Library')
  const [totalClips, setTotalClips] = useState(0)
  const [totalHighlights, setTotalHighlights] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'video' | 'no-video'>('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const gRes = await fetch('/api/filmroom/games')
      if (gRes.status === 401) { router.push('/filmroom/login?next=/filmroom'); return }
      if (!gRes.ok) { setError('Failed to load library'); setLoading(false); return }
      const loadedGames: Game[] = await gRes.json()
      setGames(loadedGames)

      // Load aggregate clip counts across ALL games (not just those with video)
      let clipCount = 0, highlightCount = 0
      await Promise.all(loadedGames.map(async g => {
        try {
          const cr = await fetch(`/api/filmroom/clips?game_id=${g.id}`)
          if (cr.ok) {
            const clips = await cr.json() as Array<{ is_highlight: boolean }>
            clipCount += clips.length
            highlightCount += clips.filter(c => c.is_highlight).length
          }
        } catch { /* skip — counts are cosmetic */ }
      }))
      setTotalClips(clipCount)
      setTotalHighlights(highlightCount)

      // Provision or fetch default team
      const tRes = await fetch('/api/filmroom/teams')
      if (tRes.ok) {
        const teams = await tRes.json()
        if (Array.isArray(teams) && teams.length > 0) {
          setTeamId(teams[0].id); setTeamName(teams[0].name)
        } else {
          // No teams yet — provision via POST (RPC handles idempotency)
          const pRes = await fetch('/api/filmroom/teams', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Team', season: '2025-26', sport: 'basketball' }),
          })
          if (pRes.ok) { const t = await pRes.json(); setTeamId(t.id); setTeamName(t.name) }
        }
      }
    } catch { setError('Failed to load library') }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  const handleSelectGame = useCallback((id: string) => { window.location.href = `/filmroom/game/${id}` }, [])
  const handleDeleteGame = useCallback((id: string) => setGames(g => g.filter(x => x.id !== id)), [])

  const filtered = games.filter(g =>
    filter === 'video' ? !!g.video_url : filter === 'no-video' ? !g.video_url : true
  )

  const statsRow = [
    { label: 'Games',      value: games.length },
    { label: 'With Film',  value: games.filter(g => g.video_url).length },
    { label: 'Clips',      value: totalClips },
    { label: 'Highlights', value: totalHighlights },
  ]

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      <div className="h-[2px] w-full bg-[#2563EB]" />
      <header className="border-b border-white/8 bg-[#0d0f12]/98 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center shrink-0"><Film className="w-3.5 h-3.5 text-white" aria-hidden /></div>
              <span className="text-sm font-semibold text-white tracking-tight">Film Room</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" aria-hidden />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-white/4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden />
                <span className="text-xs font-medium text-white/80 whitespace-nowrap">{teamName}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link href="/filmroom/roster" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/8 text-xs text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                <Users className="w-3.5 h-3.5" aria-hidden /><span className="hidden sm:inline">Roster</span>
              </Link>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#1d4ed8] text-xs font-semibold text-white transition-colors">
                <Plus className="w-3.5 h-3.5" aria-hidden /><span>Add Game</span>
              </button>
              <AccountBar />
            </div>
          </div>
          {!loading && !error && (
            <div className="flex items-stretch border-t border-white/6 divide-x divide-white/6">
              {statsRow.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2.5 px-4 py-2 first:pl-0">
                  <span className="text-lg font-bold text-white leading-none tabular-nums">{value}</span>
                  <span className="text-[11px] text-white/35 uppercase tracking-wide leading-none">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div role="alert" className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400/60" aria-hidden />
            <p className="text-sm text-white/50">{error}</p>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />Retry
            </button>
          </div>
        )}
        {loading && !error && (
          <div className="flex items-center justify-center py-20" aria-live="polite" aria-label="Loading library">
            <Loader2 className="w-5 h-5 animate-spin text-white/25" aria-hidden />
          </div>
        )}
        {!loading && !error && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-white/80 uppercase tracking-widest">Games</span>
                <span className="text-[11px] text-white/30 tabular-nums">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="Filter games">
                {(['all', 'video', 'no-video'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${filter === f ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:text-white/70 border border-white/8 hover:border-white/15'}`}>
                    {f === 'all' ? 'All' : f === 'video' ? 'Has Film' : 'No Film'}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-white/8 mb-5" />
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Film className="w-10 h-10 text-white/10 mb-4" aria-hidden />
                <h3 className="text-sm font-semibold text-white/50 mb-1">
                  {filter === 'all' ? 'No games in library' : `No games ${filter === 'video' ? 'with film' : 'without film'}`}
                </h3>
                <p className="text-xs text-white/25 mb-5 max-w-xs">
                  {filter === 'all' ? 'Add your first game to start building your film library.' : 'Try changing the filter.'}
                </p>
                {filter === 'all' && (
                  <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] rounded text-sm font-semibold transition-colors">
                    <Plus className="w-3.5 h-3.5" aria-hidden />Add First Game
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(game => (
                  <GameCard key={game.id} game={game} onDelete={handleDeleteGame} onSelect={handleSelectGame} />
                ))}
                <button onClick={() => setShowAdd(true)} aria-label="Add new game"
                  className="group rounded-lg border border-white/8 border-dashed hover:border-[#2563EB]/50 bg-transparent hover:bg-[#2563EB]/4 transition-all flex flex-col items-center justify-center gap-2 aspect-video min-h-[120px]">
                  <Plus className="w-4 h-4 text-white/25 group-hover:text-[#2563EB]/70 transition-colors" aria-hidden />
                  <span className="text-[11px] text-white/25 group-hover:text-white/50 font-medium uppercase tracking-wider transition-colors">Add Game</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {showAdd && <AddGameModal teamId={teamId} onClose={() => setShowAdd(false)} onAdd={g => setGames(prev => [g, ...prev])} />}
    </div>
  )
}
