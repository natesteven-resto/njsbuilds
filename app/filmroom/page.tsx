'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Film, Plus, Users, Trophy, ChevronRight, Calendar, MapPin, Video, X, Loader2, Star } from 'lucide-react'
import type { Game } from '@/types/filmroom'
import { TEST_TEAM_ID } from '@/types/filmroom'
import { TransitionOverlay } from './components/TransitionOverlay'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function GameCard({ game, onDelete, onSelect }: { game: Game; onDelete: (id: string) => void; onSelect: (id: string) => void }) {
  const hasVideo = !!game.video_url

  return (
    <div className="group block cursor-pointer" onClick={() => onSelect(game.id)}>
      <div className="relative rounded-lg border border-white/10 bg-[#111316] hover:border-white/20 hover:bg-[#14171c] transition-all duration-150 overflow-hidden">
        {/* Film strip thumbnail */}
        <div className="aspect-video bg-[#0a0b0d] relative overflow-hidden">
          {/* Scanline texture */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)',
            }}
          />
          {game.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.thumbnail_url} alt={game.opponent} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
              {/* Film frame placeholder */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-14 h-10 border border-white/10 rounded flex items-center justify-center relative"
                  style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)' }}
                >
                  {/* Film perforation dots */}
                  <div className="absolute -left-0 top-0 bottom-0 w-2.5 flex flex-col justify-around items-center py-1">
                    {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-sm bg-white/8" />)}
                  </div>
                  <div className="absolute -right-0 top-0 bottom-0 w-2.5 flex flex-col justify-around items-center py-1">
                    {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-sm bg-white/8" />)}
                  </div>
                  <Film className="w-4 h-4 text-white/15" />
                </div>
                {hasVideo ? (
                  <span className="text-[10px] font-medium text-emerald-400 tracking-wide uppercase flex items-center gap-1">
                    <Video className="w-2.5 h-2.5" /> Ready
                  </span>
                ) : (
                  <span className="text-[10px] text-white/20 tracking-wide uppercase">No Film</span>
                )}
              </div>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent z-10" />

          {/* Video badge */}
          {hasVideo && !game.thumbnail_url && (
            <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-[#2563EB]/90 text-[10px] font-semibold tracking-wide uppercase text-white">
              Film
            </div>
          )}

          {/* Hover play */}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 z-20">
              <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5 ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[13px] text-white truncate leading-tight group-hover:text-[#2563EB] transition-colors">
                vs {game.opponent}
              </h3>
              <div className="mt-1 flex items-center gap-2.5 text-[11px] text-white/40">
                <span className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(game.game_date)}
                </span>
                {game.location && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5" />
                      {game.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 shrink-0 mt-0.5 transition-colors" />
          </div>

          {game.notes && (
            <p className="mt-1.5 text-[11px] text-white/30 line-clamp-1 border-t border-white/6 pt-1.5">{game.notes}</p>
          )}
        </div>

        {/* Delete btn */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(game.id)
          }}
          className="absolute top-1.5 right-1.5 z-30 p-1 rounded bg-black/70 hover:bg-red-600/90 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function AddGameModal({ onClose, onAdd }: { onClose: () => void; onAdd: (game: Game) => void }) {
  const [form, setForm] = useState({ opponent: '', game_date: '', location: '', video_url: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/filmroom/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, team_id: TEST_TEAM_ID }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const game = await res.json()
      onAdd(game)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111316] border border-white/12 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Add Game</h2>
            <p className="text-xs text-white/40 mt-0.5">New entry to your film library</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Opponent *</label>
            <input
              type="text" required placeholder="Lincoln Eagles"
              value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Game Date *</label>
            <input
              type="date" required
              value={form.game_date} onChange={e => setForm(f => ({ ...f, game_date: e.target.value }))}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Location</label>
            <input
              type="text" placeholder="Home / Away / Arena name"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">
              Video URL <span className="text-white/25 normal-case">(optional — add later)</span>
            </label>
            <input
              type="url" placeholder="https://..."
              value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea
              placeholder="Quick notes about the game..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563EB]/60 placeholder-white/20 resize-none transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded px-2.5 py-1.5">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Game
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FilmRoomHome() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'video' | 'no-video'>('all')
  const [transitionGame, setTransitionGame] = useState<Game | null>(null)

  const handleSelectGame = useCallback((id: string) => {
    const game = games.find(g => g.id === id) ?? null
    setTransitionGame(game)
  }, [games])

  useEffect(() => {
    fetch(`/api/filmroom/games?team_id=${TEST_TEAM_ID}`)
      .then(r => r.json())
      .then(data => { setGames(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const deleteGame = async (id: string) => {
    if (!confirm('Delete this game and all its clips?')) return
    await fetch(`/api/filmroom/games/${id}`, { method: 'DELETE' })
    setGames(g => g.filter(x => x.id !== id))
  }

  const filtered = games.filter(g => {
    if (filter === 'video') return !!g.video_url
    if (filter === 'no-video') return !g.video_url
    return true
  })

  const statsRow = [
    { label: 'Games', value: games.length },
    { label: 'With Video', value: games.filter(g => g.video_url).length },
    { label: 'Highlights', value: 0 },
    { label: 'Clips', value: 0 },
  ]

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-[#2563EB]" />

      {/* Header */}
      <header className="border-b border-white/8 bg-[#0d0f12]/98 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Main header row */}
          <div className="h-12 flex items-center justify-between gap-4">
            {/* Left: breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-[#2563EB] flex items-center justify-center shrink-0">
                <Film className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">Film Room</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
              {/* Team badge */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-white/4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                <span className="text-xs font-medium text-white/80 whitespace-nowrap">Varsity Boys</span>
                <span className="text-white/25 text-xs">·</span>
                <span className="text-xs text-white/50">2025–26</span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Link href="/filmroom/roster"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/8 text-xs text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Roster</span>
              </Link>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2563EB] hover:bg-[#1d4ed8] text-xs font-semibold text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Game</span>
              </button>
            </div>
          </div>

          {/* Stats ticker bar */}
          <div className="flex items-stretch border-t border-white/6 divide-x divide-white/6">
            {statsRow.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2 first:pl-0">
                <span className="text-lg font-bold text-white leading-none tabular-nums">{value}</span>
                <span className="text-[11px] text-white/35 uppercase tracking-wide leading-none">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Section header + filter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white/80 uppercase tracking-widest">Games</span>
            <span className="text-[11px] text-white/30 tabular-nums">{filtered.length}</span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {(['all', 'video', 'no-video'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                  filter === f
                    ? 'bg-[#2563EB] text-white'
                    : 'text-white/40 hover:text-white/70 border border-white/8 hover:border-white/15'
                }`}
              >
                {f === 'all' ? 'All' : f === 'video' ? 'Has Film' : 'No Film'}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 mb-5" />

        {/* Game grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-white/25" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-12 border border-white/10 rounded flex items-center justify-center mb-5 relative"
              style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)' }}
            >
              <div className="absolute -left-0 top-0 bottom-0 w-2.5 flex flex-col justify-around items-center py-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-sm bg-white/8" />)}
              </div>
              <div className="absolute -right-0 top-0 bottom-0 w-2.5 flex flex-col justify-around items-center py-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-sm bg-white/8" />)}
              </div>
              <Film className="w-5 h-5 text-white/15" />
            </div>
            <h3 className="text-sm font-semibold text-white/50 mb-1">No games in library</h3>
            <p className="text-xs text-white/25 mb-5 max-w-xs">
              Add your first game to start building your film library.
            </p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] rounded text-sm font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add First Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(game => (
              <GameCard key={game.id} game={game} onDelete={deleteGame} onSelect={handleSelectGame} />
            ))}

            {/* Add game card */}
            <button
              onClick={() => setShowAdd(true)}
              className="group rounded-lg border border-white/8 border-dashed hover:border-[#2563EB]/50 bg-transparent hover:bg-[#2563EB]/4 transition-all flex flex-col items-center justify-center gap-2 aspect-video min-h-[120px]"
            >
              <div className="w-8 h-8 rounded border border-white/10 group-hover:border-[#2563EB]/40 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4 text-white/25 group-hover:text-[#2563EB]/70 transition-colors" />
              </div>
              <span className="text-[11px] text-white/25 group-hover:text-white/50 font-medium uppercase tracking-wider transition-colors">
                Add Game
              </span>
            </button>
          </div>
        )}
      </main>

      {showAdd && <AddGameModal onClose={() => setShowAdd(false)} onAdd={g => setGames(prev => [g, ...prev])} />}

      {/* Cinematic transition overlay */}
      {transitionGame && (
        <TransitionOverlay
          gameId={transitionGame.id}
          videoUrl={transitionGame.video_url}
          videoId={transitionGame.video_id ?? null}
          gameTitle={transitionGame.opponent}
          onExit={() => {
            // Exit cinema → go to normal film room UI
            if (transitionGame) window.location.href = `/filmroom/game/${transitionGame.id}`
            setTransitionGame(null)
          }}
          onCancel={() => setTransitionGame(null)}
        />
      )}
    </div>
  )
}
