'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Star, Film, BarChart2, Scissors, Play, Loader2, MessageSquare, Check, X } from 'lucide-react'
import type { Player, Clip, PlayerStats, ClipComment } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/filmroom'

function msToTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function StatBox({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      {total !== undefined && total > 0 && (
        <div className="text-xs text-white/35 font-mono">{value}/{total}</div>
      )}
      <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
    </div>
  )
}

function ClipCard({ clip, videoUrl }: { clip: Clip; videoUrl?: string | null }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<ClipComment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    const data = await fetch(`/api/filmroom/comments?clip_id=${clip.id}`).then(r => r.json())
    setComments(Array.isArray(data) ? data : [])
    setShowComments(true)
  }

  const reply = async () => {
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch('/api/filmroom/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: clip.id, author_role: 'player', author_name: 'Player', text }),
    })
    const comment = await res.json()
    setComments(c => [...c, comment])
    setText('')
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden hover:border-white/12 transition-colors">
      {/* Mini video */}
      {videoUrl && (
        <div className="relative aspect-video bg-black">
          <video
            src={`${videoUrl}#t=${clip.start_time_ms / 1000},${clip.end_time_ms / 1000}`}
            className="w-full h-full object-contain"
            poster=""
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              onClick={(e) => {
                const v = e.currentTarget.parentElement?.previousElementSibling as HTMLVideoElement
                if (v) { v.currentTime = clip.start_time_ms / 1000; v.play() }
              }}
              className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </button>
          </div>
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {clip.is_highlight && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[clip.category]}`}>
              {CATEGORY_LABELS[clip.category]}
            </span>
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[10px] text-white/60 bg-black/50 px-1.5 py-0.5 rounded">
            {msToTimecode(clip.start_time_ms)}
          </div>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-sm font-medium text-white/80 mb-1">{clip.title}</h3>
        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {clip.tags.map(tag => (
              <span key={tag} className="text-[10px] text-white/35 bg-white/5 px-1.5 py-0.5 rounded-md">#{tag}</span>
            ))}
          </div>
        )}

        {/* Comments toggle */}
        <button onClick={loadComments}
          className="flex items-center gap-1 text-xs text-white/35 hover:text-white/60 transition-colors">
          <MessageSquare className="w-3 h-3" />
          Coach comments
          {showComments ? <X className="w-3 h-3" /> : null}
        </button>

        {showComments && (
          <div className="mt-2 space-y-2">
            {comments.map(c => (
              <div key={c.id} className={`rounded-xl px-3 py-2 text-xs ${c.author_role === 'coach' ? 'bg-blue-500/10 border border-blue-500/15' : 'bg-white/4 border border-white/8'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium ${c.author_role === 'coach' ? 'text-blue-300' : 'text-white/70'}`}>{c.author_name}</span>
                  <span className="text-white/25">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-white/70">{c.text}</p>
              </div>
            ))}
            <div className="flex gap-1.5">
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') reply() }}
                placeholder="Reply to coach..."
                className="flex-1 bg-black/20 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/40 placeholder-white/20" />
              <button onClick={reply} disabled={loading || !text.trim()}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-40 transition-colors">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlayerPortal() {
  const params = useParams()
  const playerId = params.playerId as string

  const [player, setPlayer] = useState<Player | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'clips' | 'stats'>('clips')

  useEffect(() => {
    Promise.all([
      fetch(`/api/filmroom/players?team_id=00000000-0000-0000-0000-000000000010`).then(r => r.json()),
      fetch(`/api/filmroom/clips?team_id=00000000-0000-0000-0000-000000000010`).then(r => r.json()),
      fetch(`/api/filmroom/stats?player_id=${playerId}`).then(r => r.json()),
    ]).then(([allPlayers, allClips, playerStats]) => {
      const p = (Array.isArray(allPlayers) ? allPlayers : []).find((x: Player) => x.id === playerId)
      setPlayer(p || null)
      // Filter clips that include this player
      const myClips = (Array.isArray(allClips) ? allClips : []).filter(
        (c: Clip) => c.players?.some((cp: Player) => cp.id === playerId)
      )
      setClips(myClips)
      setStats(Array.isArray(playerStats) ? playerStats : [])
      setLoading(false)
    })
  }, [playerId])

  if (loading) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  if (!player) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center text-white/40">
      Player not found.
    </div>
  )

  const highlights = clips.filter(c => c.is_highlight)
  const totalPts = stats.reduce((sum, s) => sum + s.pts, 0)
  const totalReb = stats.reduce((sum, s) => sum + s.reb, 0)
  const totalAst = stats.reduce((sum, s) => sum + s.ast, 0)
  const games = stats.length

  return (
    <div className="min-h-screen bg-[#0d0f12]">
      <header className="border-b border-white/8 sticky top-0 z-40 bg-[#0d0f12]/95 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/filmroom/roster" className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="font-bold text-blue-300 text-xs">{player.number ?? '?'}</span>
            </div>
            <span className="font-semibold text-sm">{player.name}</span>
            {player.position && <span className="text-xs text-white/40 bg-white/6 px-2 py-0.5 rounded-lg">{player.position}</span>}
          </div>
          <div className="flex-1" />
          <span className="text-xs text-white/25">Player Portal</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Season summary */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatBox label="Games" value={games} />
          <StatBox label="Pts/G" value={games > 0 ? Math.round(totalPts / games) : 0} />
          <StatBox label="Reb/G" value={games > 0 ? Math.round(totalReb / games) : 0} />
          <StatBox label="Ast/G" value={games > 0 ? Math.round(totalAst / games) : 0} />
        </div>

        {/* Highlights badge */}
        {highlights.length > 0 && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
            <span className="text-xs text-yellow-300">{highlights.length} highlight clip{highlights.length !== 1 ? 's' : ''} from the coaching staff</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/4 border border-white/8 rounded-xl p-0.5 mb-4">
          {([
            ['clips', 'My Clips', Film],
            ['stats', 'Stats', BarChart2],
          ] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Clips */}
        {tab === 'clips' && (
          <div>
            {clips.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="w-8 h-8 mx-auto text-white/15 mb-2" />
                <p className="text-sm text-white/30">No clips tagged yet.</p>
                <p className="text-xs text-white/20 mt-1">Your coach will tag you in plays from game film.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clips.map(clip => (
                  <ClipCard key={clip.id} clip={clip} videoUrl={null} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {tab === 'stats' && (
          <div className="space-y-3">
            {stats.length === 0 ? (
              <div className="text-center py-12">
                <BarChart2 className="w-8 h-8 mx-auto text-white/15 mb-2" />
                <p className="text-sm text-white/30">No stats entered yet.</p>
              </div>
            ) : (
              stats.map(s => (
                <div key={s.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="text-xs text-white/40 mb-3 font-medium">Game Stats</p>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      ['PTS', s.pts], ['REB', s.reb], ['AST', s.ast],
                      ['STL', s.stl], ['BLK', s.blk], ['TO', s.turnovers],
                    ].map(([label, val]) => (
                      <div key={label as string} className="text-center">
                        <div className="font-bold text-lg text-white">{val}</div>
                        <div className="text-[10px] text-white/35">{label}</div>
                      </div>
                    ))}
                  </div>
                  {(s.fg2a > 0 || s.fg3a > 0 || s.fta > 0) && (
                    <div className="mt-3 pt-3 border-t border-white/6 grid grid-cols-3 gap-2 text-center">
                      {[
                        ['2PT', s.fg2m, s.fg2a],
                        ['3PT', s.fg3m, s.fg3a],
                        ['FT', s.ftm, s.fta],
                      ].map(([label, m, a]) => (
                        <div key={label as string}>
                          <div className="text-xs font-mono text-white/60">{m}/{a}</div>
                          <div className="text-[10px] text-white/30">{label}</div>
                          {(a as number) > 0 && (
                            <div className="text-[10px] text-white/25">
                              {Math.round(((m as number) / (a as number)) * 100)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
