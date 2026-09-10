'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Film, Plus, Users, Trophy, ChevronRight, Calendar, MapPin, Video, Upload, X, Loader2, Star } from 'lucide-react'
import type { Game } from '@/types/filmroom'
import { TEST_TEAM_ID } from '@/types/filmroom'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function GameCard({ game, onDelete }: { game: Game; onDelete: (id: string) => void }) {
  const hasVideo = !!game.video_url

  return (
    <Link href={`/filmroom/game/${game.id}`} className="group block">
      <div className="relative rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/15 transition-all duration-200 overflow-hidden">
        {/* Thumbnail or placeholder */}
        <div className="aspect-video bg-[#1a1d23] relative overflow-hidden">
          {game.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.thumbnail_url} alt={game.opponent} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/6 flex items-center justify-center">
                <Film className="w-8 h-8 text-white/30" />
              </div>
              {hasVideo ? (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <Video className="w-3 h-3" /> Video ready
                </span>
              ) : (
                <span className="text-xs text-white/30">No video uploaded</span>
              )}
            </div>
          )}
          {/* Hover play overlay */}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                vs {game.opponent}
              </h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(game.game_date)}
                </span>
                {game.location && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" />
                    {game.location}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 shrink-0 mt-1 transition-colors" />
          </div>

          {game.notes && (
            <p className="mt-2 text-xs text-white/40 line-clamp-2">{game.notes}</p>
          )}
        </div>

        {/* Delete btn */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(game.id)
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 hover:bg-red-500/80 text-white/60 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </Link>
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Game</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Opponent *</label>
            <input
              type="text" required placeholder="Lincoln Eagles"
              value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Game Date *</label>
            <input
              type="date" required
              value={form.game_date} onChange={e => setForm(f => ({ ...f, game_date: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/60"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Location</label>
            <input
              type="text" placeholder="Home / Away / Arena name"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Video URL <span className="text-white/30">(optional — add later in film room)</span></label>
            <input
              type="url" placeholder="https://..."
              value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Notes</label>
            <textarea
              placeholder="Quick notes about the game..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
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

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#0d0f12]/95 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Film Room</span>
            <span className="text-white/20 text-sm">/</span>
            <span className="text-white/50 text-sm">Varsity Boys · 2025–26</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/filmroom/roster"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/6 transition-all">
              <Users className="w-3.5 h-3.5" /> Roster
            </Link>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Game
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Games', value: games.length, icon: Trophy, color: 'text-yellow-400' },
            { label: 'With Video', value: games.filter(g => g.video_url).length, icon: Video, color: 'text-blue-400' },
            { label: 'Highlights', value: 0, icon: Star, color: 'text-orange-400' },
            { label: 'Clips', value: 0, icon: Film, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">{label}</span>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <span className="text-2xl font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* Filters + section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Games</h2>
          <div className="flex gap-1 bg-white/4 border border-white/8 rounded-xl p-0.5">
            {(['all', 'video', 'no-video'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
                {f === 'all' ? 'All' : f === 'video' ? 'Has Video' : 'No Video'}
              </button>
            ))}
          </div>
        </div>

        {/* Game grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/4 flex items-center justify-center mb-4">
              <Film className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="font-semibold text-white/60 mb-2">No games yet</h3>
            <p className="text-sm text-white/30 mb-6 max-w-xs">
              Add your first game to start building your film library.
            </p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add First Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(game => (
              <GameCard key={game.id} game={game} onDelete={deleteGame} />
            ))}
            {/* Add card */}
            <button onClick={() => setShowAdd(true)}
              className="rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 bg-transparent hover:bg-white/2 transition-all flex flex-col items-center justify-center gap-3 aspect-[4/3] min-h-[160px]">
              <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center">
                <Plus className="w-5 h-5 text-white/40" />
              </div>
              <span className="text-xs text-white/30">Add Game</span>
            </button>
          </div>
        )}

        {/* Upload info */}
        {games.length > 0 && (
          <div className="mt-8 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 flex items-start gap-3">
            <Upload className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium">To upload game film</p>
              <p className="text-xs text-blue-400/60 mt-0.5">
                Click any game → drag-and-drop your video file in the film room. Cloudflare R2 storage is active. HLS playback via Cloudflare Stream available once a Stream API token is added.
              </p>
            </div>
          </div>
        )}
      </main>

      {showAdd && <AddGameModal onClose={() => setShowAdd(false)} onAdd={g => setGames(prev => [g, ...prev])} />}
    </div>
  )
}
