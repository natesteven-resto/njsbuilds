'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Film, Play, Star, Loader2 } from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import type { Player, Clip, Game } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/filmroom'

function msToDisplay(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type ClipWithGame = Clip & { game?: Game }

export default function PlayerDetailPage() {
  const { playerId } = useParams() as { playerId: string }
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [clips, setClips] = useState<ClipWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filter, setFilter] = useState<'all' | 'highlight'>('all')
  const [tagFilter, setTagFilter] = useState<string>('')

  useEffect(() => {
    setLoading(true); setNotFound(false)
    fetch(`/api/filmroom/players/${playerId}/clips`)
      .then(r => {
        if (r.status === 401) { router.replace('/filmroom/login'); return null }
        if (r.status === 403 || r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.ok ? r.json() : null
      })
      .then(d => {
        if (!d) return
        setPlayer(d.player)
        setClips(Array.isArray(d.clips) ? d.clips : [])
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [playerId, router])

  const allTags = Array.from(new Set(clips.flatMap(c => c.tags ?? []))).sort()
  const visible = clips.filter(c => {
    if (filter === 'highlight' && !c.is_highlight) return false
    if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#181917' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#181917', color: '#eee9df' }}>
      <Film className="w-10 h-10" style={{ color: 'rgba(238,233,223,0.20)' }} />
      <p style={{ color: 'rgba(238,233,223,0.60)' }}>Player not found or access denied.</p>
      <Link href="/filmroom/players"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
        style={{ background: '#c66a3e', color: '#181917' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>
    </div>
  )

  return (
    <div className="cs min-h-screen" style={{ background: '#181917', color: '#eee9df' }}>
      <header className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(24,25,23,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(238,233,223,0.10)' }}>
        <div className="px-4 h-12 flex items-center gap-3">
          <Link href="/filmroom/players" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(238,233,223,0.60)' }} aria-label="Back to players">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
              style={{ background: 'rgba(198,106,62,0.20)', color: '#c66a3e' }}>
              {player?.number ?? '?'}
            </div>
            <span className="font-bold text-sm truncate" style={{ color: '#eee9df' }}>{player?.name}</span>
            {player?.position && (
              <span className="text-xs shrink-0" style={{ color: 'rgba(238,233,223,0.50)' }}>{player.position}</span>
            )}
          </div>
          <div className="flex-1" />
          <AccountBar />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilter('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={filter === 'all' ? { background: '#c66a3e', color: '#181917' } : { color: 'rgba(238,233,223,0.60)' }}>
            All ({clips.length})
          </button>
          <button onClick={() => setFilter(f => f === 'highlight' ? 'all' : 'highlight')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={filter === 'highlight' ? { background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.30)' } : { color: 'rgba(238,233,223,0.60)' }}>
            <Star className="w-3 h-3" /> Highlights
          </button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(t => t === tag ? '' : tag)}
              className="px-2.5 py-1 rounded-lg text-xs transition-colors"
              style={tagFilter === tag
                ? { background: 'rgba(198,106,62,0.20)', color: '#c66a3e', border: '1px solid rgba(198,106,62,0.35)' }
                : { color: 'rgba(238,233,223,0.50)', border: '1px solid rgba(238,233,223,0.10)' }}>
              #{tag}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(238,233,223,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(238,233,223,0.50)' }}>No clips match this filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(clip => (
              <Link key={clip.id} href={`/filmroom/game/${clip.game_id}?clip=${clip.id}`}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors hover:border-[rgba(198,106,62,0.40)]"
                style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.10)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(238,233,223,0.05)' }}>
                  <Play className="w-3.5 h-3.5 ml-0.5" style={{ color: 'rgba(238,233,223,0.40)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {clip.is_highlight && <Star className="w-3 h-3 shrink-0" style={{ color: '#facc15', fill: '#facc15' }} />}
                    <p className="font-semibold text-sm truncate" style={{ color: '#eee9df' }}>{clip.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono text-[10px]" style={{ color: 'rgba(238,233,223,0.40)' }}>
                      {msToDisplay(clip.start_time_ms)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[clip.category]}`}>
                      {CATEGORY_LABELS[clip.category]}
                    </span>
                    {clip.game && (
                      <span className="text-[10px]" style={{ color: 'rgba(238,233,223,0.40)' }}>
                        vs {clip.game.opponent}
                      </span>
                    )}
                  </div>
                  {clip.coaching_note && (
                    <p className="text-xs mt-1 italic truncate" style={{ color: 'rgba(238,233,223,0.50)' }}>
                      {clip.coaching_note}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
