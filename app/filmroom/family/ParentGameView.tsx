'use client'

import { useEffect, useRef, useState } from 'react'
import { usePrivatePlayback, type PlaybackQuality } from '../components/usePrivatePlayback'
import { PlaybackQualityControl } from '../components/PlaybackQualityControl'
import { ParentBoxScore } from './ParentBoxScore'
import type { BoxPlayer } from '@/lib/filmroom-box-score'
import { STAT_NAMES, type FilmStat } from '@/lib/filmroom-events'
import { AlertTriangle } from 'lucide-react'

// Updated SharedGame — team_id replaces bare stats bool for scope resolution;
// stats boolean is now derived server-side (stats:false if private+no link).
export type SharedGame = {
  id: string
  opponent: string
  game_date: string
  team: string
  team_id: string
  stats_mode: 'private' | 'team'
  film: boolean
  stats: boolean
  has_video: boolean
}

type BoxScoreResponse = {
  team_id: string
  stats_mode: 'private' | 'team'
  scope: 'team' | 'linked'
  entries: FilmStat[]
  players: BoxPlayer[]
}

type SharedClip = { id: string; title: string | null; category: string | null; start_time_ms: number; end_time_ms: number }
type Tab = 'clips' | 'stats' | 'shots'

const button = 'min-h-11 rounded-lg border border-white/15 px-3 text-sm hover:bg-white/10 disabled:opacity-40'
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

export function ParentGameView({ game, onBack }: { game: SharedGame; onBack: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [quality, setQuality] = useState<PlaybackQuality>('original')
  // Desired tab selected by the user
  const [tab, setTab] = useState<Tab>(() => game.film ? 'clips' : game.stats ? 'stats' : 'clips')

  const [clips, setClips] = useState<SharedClip[]>([])
  const [entries, setEntries] = useState<FilmStat[]>([])
  const [roster, setRoster] = useState<BoxPlayer[]>([])
  const [statsScope, setStatsScope] = useState<'team' | 'linked' | null>(null)

  const [activeClip, setActiveClip] = useState<SharedClip | null>(null)
  const [clipError, setClipError] = useState('')
  const [statsError, setStatsError] = useState('')
  const [controlError, setControlError] = useState('')
  const [loading, setLoading] = useState(true)

  // Player filter — reset when scope indicates revoked link or roster changes
  const [player, setPlayer] = useState('all')
  // Previous video position ref — preserve ordinary (non-clip) position when permissions unchanged
  const savedPositionRef = useRef(0)
  const [speed, setSpeed] = useState(1)

  const { error: videoError, loading: videoLoading } = usePrivatePlayback(
    video, game.id, quality, () => setQuality('original'), '', game.film && game.has_video,
  )
  const canPlay = game.film && game.has_video

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      // Snapshot video position before refresh so non-clip position can be preserved
      if (video.current && !activeClip) savedPositionRef.current = video.current.currentTime
      await Promise.all([
        game.film && fetch('/api/filmroom/family?view=clips&game_id=' + game.id, { cache: 'no-store' })
          .then(async r => {
            if (!r.ok) throw new Error('Shared clips are unavailable.')
            return r.json()
          })
          .then((data: SharedClip[]) => {
            if (cancelled) return
            setClips(data)
            setClipError('')
            setActiveClip(old => {
              const current = old ? data.find(c => c.id === old.id) : null
              if (old && !current) video.current?.pause()
              return current ?? null
            })
          })
          .catch(e => {
            if (!cancelled) { setClips([]); setActiveClip(null); video.current?.pause(); setClipError(e.message) }
          }),
        // Always fetch stats when game.stats OR when we already have a scope (server is authoritative)
        (game.stats || statsScope !== null) && fetch('/api/filmroom/family?view=box-score&game_id=' + game.id, { cache: 'no-store' })
          .then(async r => {
            if (!r.ok) {
              const body = await r.json().catch(() => ({}))
              throw new Error(body?.error ?? 'Shared stats are unavailable.')
            }
            return r.json()
          })
          .then((data: BoxScoreResponse) => {
            if (cancelled) return
            // Use returned scope as source of truth; clear data when scope is null (fail closed)
            const resolvedScope = data.scope ?? null
            setEntries(resolvedScope ? (data.entries ?? []) : [])
            setRoster(resolvedScope ? (data.players ?? []) : [])
            setStatsScope(resolvedScope)
            setStatsError('')
            // Reset invalid player filter after scope change (e.g. link revoked)
            setPlayer(old => {
              const validIds = new Set((data.players ?? []).map((p: BoxPlayer) => p.id))
              return old !== 'all' && !validIds.has(old) ? 'all' : old
            })
          })
          .catch(e => {
            if (!cancelled) { setEntries([]); setRoster([]); setStatsScope(null); setStatsError(e.message) }
          }),
      ])
      if (!cancelled) setLoading(false)
    }

    void refresh()
    const timer = setInterval(() => void refresh(), 40000)
    return () => { cancelled = true; clearInterval(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, game.film, game.stats, game.stats_mode])

  useEffect(() => { if (video.current) video.current.playbackRate = speed }, [speed])

  // Derive the active tab from current access rights — if access was revoked, fall back
  const visibleTab: Tab = (() => {
    if (tab === 'clips' && game.film) return 'clips'
    if ((tab === 'stats' || tab === 'shots') && game.stats && statsScope !== null) return tab
    // Access revoked or tab no longer available — fall back gracefully
    if (game.film) return 'clips'
    if (game.stats && statsScope !== null) return 'stats'
    return 'clips'
  })()

  function playAt(ms: number, clip: SharedClip | null = null) {
    const v = video.current; if (!v) return
    setActiveClip(clip); setControlError(''); v.currentTime = Math.max(0, ms / 1000)
    void v.play().catch(() => setControlError('Press play on the video to continue.'))
  }

  function togglePlay() {
    const v = video.current; if (!v) return
    if (v.paused) void v.play().catch(() => setControlError('Press play to retry.'))
    else v.pause()
  }

  function enforceClip() {
    const v = video.current
    if (v && activeClip && v.currentTime >= activeClip.end_time_ms / 1000) {
      if (!v.paused) v.pause()
      if (v.currentTime > activeClip.end_time_ms / 1000) v.currentTime = activeClip.end_time_ms / 1000
    }
  }

  function resumeClip() {
    const v = video.current
    if (v && activeClip && (v.currentTime < activeClip.start_time_ms / 1000 || v.currentTime >= activeClip.end_time_ms / 1000))
      v.currentTime = activeClip.start_time_ms / 1000
  }

  // Scope determines what stats are available. When scope==='linked', server has already
  // filtered to approved linked players — never show TEAM/opponent aggregate rows or chart.
  const isLinkedScope = statsScope === 'linked'

  // Build player list for the filter dropdown
  const playerIds = Array.from(new Set([
    ...roster.map(p => p.id),
    ...entries.filter(e => e.player_id && e.player_id !== '__opp__').map(e => e.player_id),
  ]))

  // Filter entries to the selected player (only non-aggregate entries)
  const filtered = entries.filter(e => {
    if (e.player_id === '__opp__') return false // never expose opponent totals in linked scope; handled below
    if (isLinkedScope && !e.player_id) return false // no team-level entries in linked scope
    return player === 'all' || e.player_id === player
  })

  const shots = filtered.filter(e =>
    ['2M', '2X', '3M', '3X', 'FTM', 'FTX'].includes(e.stat_type) &&
    typeof e.shot_x === 'number' && typeof e.shot_y === 'number',
  )

  // Stats tab availability
  const availableTabs: Tab[] = []
  if (game.film) availableTabs.push('clips')
  if (game.stats) { availableTabs.push('stats'); availableTabs.push('shots') }

  function moment(e: FilmStat) {
    return (
      <button
        key={e.id}
        disabled={!canPlay}
        onClick={() => playAt(e.video_time_ms - 5000)}
        className={button + ' w-full py-2 text-left'}
      >
        {clock(e.video_time_ms)} · {e.player_name} · {STAT_NAMES[e.stat_type] || e.stat_type}
      </button>
    )
  }

  return (
    <section aria-label="Shared game workspace" className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={onBack} className={button}>← All games</button>
        <div>
          <p className="text-xs text-[#e49269]">{game.team} · {game.game_date}</p>
          <h1 className="text-2xl font-semibold">{game.opponent}</h1>
        </div>
        <span className="ml-auto text-xs text-[#c9c3b8]">Viewer · Read only</span>
      </div>

      <div
        ref={workspace}
        className="grid min-h-0 gap-4 bg-[#181917] lg:grid-cols-[minmax(0,1fr)_360px] [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-4"
      >
        {/* Left: video + controls */}
        <div className="min-w-0 space-y-3">
          {canPlay ? (
            <>
              <video
                ref={video}
                playsInline
                preload="metadata"
                tabIndex={0}
                aria-label="Game video. Click or press Space to play or pause."
                onClick={togglePlay}
                onKeyDown={e => { if (e.key === ' ') { e.preventDefault(); togglePlay() } }}
                onTimeUpdate={() => { setPosition(video.current?.currentTime || 0); enforceClip() }}
                onPlay={() => { setPlaying(true); resumeClip() }}
                onPause={() => setPlaying(false)}
                onVolumeChange={() => setMuted(!!video.current?.muted)}
                onLoadedMetadata={() => { if (video.current) { video.current.playbackRate = speed; setDuration(video.current.duration) } }}
                className="aspect-video max-h-[78vh] w-full rounded-lg bg-black"
              />
              <div className="rounded-lg border border-white/10 bg-[#13161a] p-3">
                <input
                  aria-label="Video timeline"
                  type="range"
                  min={0}
                  max={Number.isFinite(duration) ? duration : 0}
                  step={0.1}
                  value={position}
                  onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value) }}
                  className="mb-3 w-full accent-[#c66a3e]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button className={button + ' bg-[#c66a3e] font-semibold'} onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
                  <button className={button} onClick={() => { if (video.current) video.current.currentTime = Math.max(activeClip ? activeClip.start_time_ms / 1000 : 0, video.current.currentTime - 5) }}>−5s</button>
                  <button className={button} onClick={() => { if (video.current) video.current.currentTime = Math.min(Number.isFinite(duration) ? duration : Infinity, video.current.currentTime + 5) }}>+5s</button>
                  <span className="text-xs tabular-nums text-[#c9c3b8]">
                    {clock(position * 1000)} / {clock((Number.isFinite(duration) ? duration : 0) * 1000)}
                  </span>
                  <button className={button} onClick={() => { if (video.current) video.current.muted = !video.current.muted }}>
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                  <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
                    Speed
                    <select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="rounded bg-[#252622] p-2">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}×</option>)}
                    </select>
                  </label>
                  <button
                    className={button}
                    onClick={() => {
                      if (document.fullscreenElement) {
                        void document.exitFullscreen()
                      } else if (workspace.current?.requestFullscreen) {
                        void workspace.current.requestFullscreen().catch(() => setControlError('Fullscreen is unavailable in this browser.'))
                      } else {
                        const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
                        if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
                        else setControlError('Fullscreen is unavailable in this browser.')
                      }
                    }}
                  >Fullscreen</button>
                  <PlaybackQualityControl gameId={game.id} quality={quality} onChange={setQuality} />
                </div>
              </div>
              {activeClip ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c66a3e]/40 p-3 text-sm">
                  <span>Clip: <strong>{activeClip.title || 'Untitled clip'}</strong> · Stops at {clock(activeClip.end_time_ms)}</span>
                  <button className={button} onClick={() => { setActiveClip(null); void video.current?.play().catch(() => {}) }}>Continue full game</button>
                </div>
              ) : (
                <p className="text-xs text-[#c9c3b8]">Watching full game. Choose a shared clip in Clips to watch a teaching moment.</p>
              )}
              {videoLoading && <p role="status">Loading video…</p>}
              {videoError && <p role="alert" className="text-red-300">{videoError}</p>}
              {controlError && <p role="status">{controlError}</p>}
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 p-6 text-center text-[#c9c3b8]">
              {game.film ? 'Your coach has not attached a video yet.' : 'Your coach has shared stats for this game. Video access has not been shared.'}
            </div>
          )}
        </div>

        {/* Right: tabs */}
        <aside className="min-w-0 rounded-lg border border-white/10 bg-[#1e201d]">
          <div role="tablist" aria-label="Game details" className="flex border-b border-white/10">
            {availableTabs.map(t => (
              <button
                key={t}
                id={`parent-tab-${t}`}
                role="tab"
                aria-selected={visibleTab === t}
                aria-controls="parent-panel"
                onClick={() => setTab(t)}
                className={'min-h-12 flex-1 border-b-2 text-sm font-semibold ' + (visibleTab === t ? 'border-[#c66a3e] text-[#eee9df]' : 'border-transparent text-[#aaa99f]')}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div
            id="parent-panel"
            role="tabpanel"
            aria-labelledby={`parent-tab-${visibleTab}`}
            className="max-h-[80vh] space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-color:#55574f_#1e201d] [scrollbar-width:thin]"
          >
            {loading && <p role="status">Loading shared game details…</p>}

            {/* Clips tab */}
            {visibleTab === 'clips' && (
              <>
                <p className="text-xs text-[#c9c3b8]">{clips.length} shared {clips.length === 1 ? 'clip' : 'clips'} · From your coach</p>
                {clipError && <p role="alert" className="text-red-300">{clipError}</p>}
                {!loading && !clips.length && !clipError && (
                  <p className="py-6 text-sm text-[#c9c3b8]">No clips shared yet. Your coach&apos;s clips will appear here unless marked private.</p>
                )}
                {clips.map(c => (
                  <button
                    key={c.id}
                    disabled={!canPlay}
                    onClick={() => playAt(c.start_time_ms, c)}
                    aria-pressed={activeClip?.id === c.id}
                    className={'w-full rounded-xl border p-4 text-left disabled:opacity-50 ' + (activeClip?.id === c.id ? 'border-[#c66a3e] bg-[#c66a3e]/10' : 'border-white/10 bg-[#252722] hover:border-white/30')}
                  >
                    <span className="block font-semibold">▶ {c.title || 'Untitled clip'}</span>
                    <span className="mt-2 block text-xs text-[#c9c3b8]">
                      {clock(c.start_time_ms)} – {clock(c.end_time_ms)}{c.category ? ' · ' + c.category : ''}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Player filter — shown on stats and shots tabs */}
            {(visibleTab === 'stats' || visibleTab === 'shots') && (
              <>
                {/* Stats scope context */}
                {statsScope === 'linked' && (
                  <div className="flex items-start gap-2 rounded border border-white/10 bg-[#1b1c1a] px-3 py-2 text-xs text-[#c9c3b8]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
                    Showing stats for your linked players only.
                  </div>
                )}
                {game.stats === false && (
                  <div className="rounded border border-white/10 bg-[#1b1c1a] px-3 py-2 text-xs text-[#c9c3b8]">
                    Stats are private; ask your coach for a player connection to see stats.
                  </div>
                )}
                {statsError && <p role="alert" className="text-red-300">{statsError}</p>}

                {/* Player selector — only meaningful when scope has multiple players */}
                {!isLinkedScope || playerIds.length > 1 ? (
                  <label className="block text-xs text-[#c9c3b8]">
                    Player
                    <select
                      value={player}
                      onChange={e => setPlayer(e.target.value)}
                      className="mt-2 min-h-11 w-full rounded border border-white/15 bg-[#252722] px-3 text-sm"
                    >
                      <option value="all">
                        {isLinkedScope ? 'All approved players' : 'All players'}
                      </option>
                      {playerIds.map(id => {
                        const p = roster.find(p => p.id === id)
                        const e = entries.find(e => e.player_id === id)
                        return (
                          <option key={id} value={id}>
                            #{p?.number ?? e?.player_number ?? '?'} {p?.name ?? e?.player_name}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                ) : null}
              </>
            )}

            {/* Stats tab — only render when scope confirms access (fail closed) */}
            {visibleTab === 'stats' && !loading && !statsError && game.stats && statsScope !== null && (
              <ParentBoxScore
                entries={entries}
                players={roster}
                playerId={player}
                scope={statsScope}
                canPlay={canPlay}
                onSeek={ms => playAt(ms)}
              />
            )}

            {/* Shots tab — only render when scope confirms access (fail closed) */}
            {visibleTab === 'shots' && statsScope !== null && (
              <>
                <p className="text-xs text-[#c9c3b8]">● Made · × Missed{canPlay ? ' · Select a shot to watch' : ''}</p>
                <svg viewBox="0 0 50 47" role="img" aria-label="Shared shot chart" className="w-full rounded bg-[#181a17]">
                  <g fill="none" stroke="#62665c" strokeWidth=".4">
                    <rect x="1" y="1" width="48" height="45" />
                    <rect x="16" y="1" width="18" height="19" />
                    <circle cx="25" cy="20" r="6" />
                    <path d="M4 1 Q4 35 25 38 Q46 35 46 1" />
                    <circle cx="25" cy="5" r="1.2" />
                  </g>
                  {shots.map(e => (
                    <g
                      key={e.id}
                      transform={`translate(${1 + e.shot_x! * 48},${1 + e.shot_y! * 45})`}
                      role={canPlay ? 'button' : undefined}
                      tabIndex={canPlay ? 0 : undefined}
                      aria-label={`${e.player_name}: ${STAT_NAMES[e.stat_type]} at ${clock(e.video_time_ms)}`}
                      onClick={() => canPlay && playAt(e.video_time_ms - 5000)}
                      onKeyDown={event => {
                        if (canPlay && ['Enter', ' '].includes(event.key)) {
                          event.preventDefault(); playAt(e.video_time_ms - 5000)
                        }
                      }}
                      className={canPlay ? 'cursor-pointer' : ''}
                    >
                      {e.stat_type.endsWith('M')
                        ? <circle r="1.1" fill="#e49269" />
                        : <path d="M-1 -1 L1 1 M1 -1 L-1 1" stroke="#e6e1d6" strokeWidth=".55" />}
                    </g>
                  ))}
                </svg>
                {!loading && !shots.length && <p className="text-sm text-[#c9c3b8]">No shot locations recorded yet.</p>}
                <div className="space-y-2">{shots.map(moment)}</div>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
