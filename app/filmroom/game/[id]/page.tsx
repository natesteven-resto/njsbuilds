'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft,
  Scissors, Bookmark, Star, MessageSquare,
  Users, BarChart2, Pencil, X, Check,
  Plus, Trash2, Loader2, ChevronDown, ChevronUp, Upload,
  ZoomIn, AlertCircle, CheckCircle2, BarChart, Maximize2, Minimize2,
} from 'lucide-react'
import type { Game, Clip, Player, ClipCategory, ClipComment } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS, TEST_TEAM_ID } from '@/types/filmroom'
import { DrawingOverlay, type DrawingData } from '@/app/filmroom/components/DrawingOverlay'

// ─── Utilities ───────────────────────────────────────────────────────────────

function msToTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const frames = Math.floor((ms % 1000) / 33) // ~30fps
  return `${m}:${String(s).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}

function msToDisplay(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(startMs: number, endMs: number): string {
  const dur = endMs - startMs
  const s = Math.floor(dur / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ─── Stat Entry Types ─────────────────────────────────────────────────────────

const STAT_TYPES = ['2M', '3M', 'FTM', '2X', '3X', 'FTX', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'DEF', 'TO', 'FOUL'] as const
type StatType = typeof STAT_TYPES[number]

// Legacy aliases for existing entries that used old stat types
const LEGACY_STAT_MAP: Partial<Record<string, StatType>> = {
  PTS: '2M', REB: 'OREB', AST: 'AST', STL: 'STL', BLK: 'BLK', TO: 'TO', '3M': '3M', FT: 'FTM',
}

function normaliseStatType(raw: string): StatType {
  if ((STAT_TYPES as readonly string[]).includes(raw)) return raw as StatType
  return (LEGACY_STAT_MAP[raw] ?? '2M') as StatType
}

interface StatDef {
  key: StatType
  label: string
  col: 'made' | 'miss' | 'other'
  redTint?: boolean
}

const STAT_DEFS: StatDef[] = [
  { key: '2M',   label: '2PT Made',   col: 'made' },
  { key: '3M',   label: '3PT Made',   col: 'made' },
  { key: 'FTM',  label: 'FT Made',    col: 'made' },
  { key: '2X',   label: '2PT Miss',   col: 'miss' },
  { key: '3X',   label: '3PT Miss',   col: 'miss' },
  { key: 'FTX',  label: 'FT Miss',    col: 'miss' },
  { key: 'OREB', label: 'Off Reb',    col: 'other' },
  { key: 'DREB', label: 'Def Reb',    col: 'other' },
  { key: 'AST',  label: 'Assist',     col: 'other' },
  { key: 'STL',  label: 'Steal',      col: 'other' },
  { key: 'BLK',  label: 'Block',      col: 'other' },
  { key: 'DEF',  label: 'Deflection', col: 'other' },
  { key: 'TO',   label: 'Turnover',   col: 'other', redTint: true },
  { key: 'FOUL', label: 'Foul',       col: 'other', redTint: true },
]

interface StatEntry {
  id: string
  player_id: string
  player_name: string
  player_number: string
  stat_type: StatType
  video_time_ms: number
  game_id: string
  created_at: string
}

// Raw entry from DB (includes nested players object)
interface RawStatEntry {
  id: string
  player_id: string
  stat_type: string
  video_time_ms: number
  game_id: string
  created_at: string
  players: { id: string; name: string; number: number | null } | null
}

function rawToEntry(raw: RawStatEntry): StatEntry {
  return {
    id: raw.id,
    player_id: raw.player_id,
    player_name: raw.players?.name ?? 'Unknown',
    player_number: raw.players?.number != null ? String(raw.players.number) : '?',
    stat_type: normaliseStatType(raw.stat_type),
    video_time_ms: raw.video_time_ms,
    game_id: raw.game_id,
    created_at: raw.created_at,
  }
}

// Opponent pseudo-player constant
const OPP_ID = '__opp__'
const OPP_PLAYER: Player = { id: OPP_ID, name: 'Opponent', number: null, position: null, team_id: '', parent_email: null, created_at: '' }

// ─── Stat Entry Panel ─────────────────────────────────────────────────────────

function StatEntryPanel({
  gameId,
  players,
  currentMs,
  sessionEntries,
  onLog,
  onUndo,
  onClose,
}: {
  gameId: string
  players: Player[]
  currentMs: number
  sessionEntries: StatEntry[]
  onLog: (entry: StatEntry) => void
  onUndo: () => void
  onClose: () => void
}) {
  const [selectedStat, setSelectedStat] = useState<StatType | null>(null)
  const [logging, setLogging] = useState(false)
  const [redoStack, setRedoStack] = useState<StatEntry[]>([])

  const allPlayers = [...players, OPP_PLAYER]

  const handleStatTap = (stat: StatType) => {
    setSelectedStat(prev => prev === stat ? null : stat)
  }

  const handlePlayerTap = async (player: Player) => {
    if (!selectedStat || logging) return
    setLogging(true)
    try {
      const res = await fetch('/api/filmroom/stat-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_id: player.id === OPP_ID ? null : player.id,
          stat_type: selectedStat,
          video_time_ms: currentMs,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const raw: RawStatEntry = await res.json()
      // For OPP entries the DB returns player_id null — patch the name/number
      const entry: StatEntry = player.id === OPP_ID
        ? { ...rawToEntry(raw), player_id: OPP_ID, player_name: 'Opponent', player_number: 'OPP' }
        : rawToEntry(raw)
      onLog(entry)
      setRedoStack([]) // new entry clears redo
      // Keep stat selected so coach can keep tapping players
    } catch {
      // silently ignore — entry was not saved
    } finally {
      setLogging(false)
    }
  }

  const handleUndo = async () => {
    const last = sessionEntries[sessionEntries.length - 1]
    if (!last) return
    setRedoStack(r => [...r, last])
    onUndo()
  }

  const made   = STAT_DEFS.filter(d => d.col === 'made')
  const miss   = STAT_DEFS.filter(d => d.col === 'miss')
  const other  = STAT_DEFS.filter(d => d.col === 'other')

  // Box score calculated from all session entries + existing entries passed in
  const calcBoxRow = (entries: StatEntry[]) => ({
    pts: entries.filter(e => e.stat_type === '2M').length * 2
      + entries.filter(e => e.stat_type === '3M').length * 3
      + entries.filter(e => e.stat_type === 'FTM').length,
    reb: entries.filter(e => e.stat_type === 'OREB' || e.stat_type === 'DREB').length,
    ast: entries.filter(e => e.stat_type === 'AST').length,
    stl: entries.filter(e => e.stat_type === 'STL').length,
    blk: entries.filter(e => e.stat_type === 'BLK').length,
  })

  const statLabel = (s: StatType) => STAT_DEFS.find(d => d.key === s)?.label ?? s

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.76)' }}
    >
      {/* Backdrop tap closes */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-3xl rounded-t-2xl flex flex-col"
        style={{ backgroundColor: '#15181f', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
          <span className="text-sm font-semibold text-white/80 tracking-wide">
            <span className="text-blue-400 font-bold">1</span>
            <span className="text-white/40 mx-1.5">·</span>
            TAP A STAT
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={sessionEntries.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-30 transition-all"
            >
              Undo
            </button>
            <button
              disabled
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/20 border border-white/6 disabled:opacity-30 cursor-not-allowed"
              title="Redo (coming soon)"
            >
              Redo
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* ── Stat grid ── */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="grid grid-cols-3 gap-2 items-start">

            {/* MADE + MISS span 2 cols, with Recent below */}
            <div className="col-span-2 grid grid-cols-2 gap-2">
              {/* MADE header + buttons */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest text-center">Made</p>
                {made.map(def => (
                  <button key={def.key} onClick={() => handleStatTap(def.key)}
                    className={`w-full h-10 rounded-xl text-xs font-semibold transition-all border ${
                      selectedStat === def.key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 border-blue-400/50' : 'border-white/15 text-white/85'
                    }`}
                    style={{ touchAction: 'manipulation', background: selectedStat === def.key ? undefined : 'rgba(255,255,255,0.09)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                  >{def.label}</button>
                ))}
              </div>
              {/* MISS header + buttons */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-red-400/60 uppercase tracking-widest text-center">Miss</p>
                {miss.map(def => (
                  <button key={def.key} onClick={() => handleStatTap(def.key)}
                    className={`w-full h-10 rounded-xl text-xs font-semibold transition-all border ${
                      selectedStat === def.key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 border-blue-400/50' : 'border-red-500/20 text-red-300'
                    }`}
                    style={{ touchAction: 'manipulation', background: selectedStat === def.key ? undefined : 'rgba(220,38,38,0.11)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                  >{def.label}</button>
                ))}
              </div>
              {/* Recent — spans full 2-col width below the buttons */}
              {sessionEntries.length > 0 && (
                <div className="col-span-2 mt-0.5 space-y-1">
                  <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-1">Recent</p>
                  {[...sessionEntries].reverse().slice(0, 8).map(e => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-white/40 shrink-0 font-medium">{e.player_number !== 'OPP' ? `#${e.player_number}` : 'OPP'}</span>
                      <span className="text-white/75 font-semibold truncate">{STAT_DEFS.find(d => d.key === e.stat_type)?.label ?? e.stat_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OTHER column */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest text-center">Other</p>
              {other.map(def => (
                <button key={def.key} onClick={() => handleStatTap(def.key)}
                  className={`w-full h-10 rounded-xl text-xs font-semibold transition-all border ${
                    selectedStat === def.key
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 border-blue-400/50'
                      : def.redTint ? 'border-red-500/20 text-red-300/80'
                      : 'border-white/10 text-white/75'
                  }`}
                  style={{ touchAction: 'manipulation', background: selectedStat === def.key ? undefined : def.redTint ? 'rgba(220,38,38,0.09)' : 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                >{def.label}</button>
              ))}
            </div>

          </div>
        </div>



        {/* ── Step 2 + Players — also NOT scrollable ── */}
        <div className="shrink-0 border-t border-white/8">
          <div className="px-5 py-2">
            <span className="text-sm font-semibold">
              <span className={selectedStat ? 'text-blue-400' : 'text-white/30'}>2 · </span>
              <span className={selectedStat ? 'text-white/80' : 'text-white/30'}>
                {selectedStat ? `TAP WHO — ${statLabel(selectedStat)}` : 'TAP WHO'}
              </span>
            </span>
          </div>
          <div className="px-4 pb-4">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(allPlayers.length, 5)}, 1fr)` }}>
              {allPlayers.map((p) => {
                const pts = sessionEntries.filter(e => e.player_id === p.id && e.stat_type === '2M').length * 2
                  + sessionEntries.filter(e => e.player_id === p.id && e.stat_type === '3M').length * 3
                  + sessionEntries.filter(e => e.player_id === p.id && e.stat_type === 'FTM').length
                const isOpp = p.id === OPP_ID
                const enabled = !!selectedStat && !logging
                return (
                  <button
                    key={p.id}
                    onPointerDown={(e) => { e.preventDefault(); if (enabled) handlePlayerTap(p) }}
                    style={{ touchAction: 'manipulation', opacity: enabled ? 1 : 0.4 }}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl border min-h-[70px] ${
                      enabled
                        ? isOpp ? 'border-white/15 bg-white/6' : 'border-white/10 bg-white/5'
                        : 'border-white/6 bg-white/3 cursor-not-allowed'
                    }`}
                  >
                    <span className={`font-black leading-none ${isOpp ? 'text-base text-white/50' : 'text-3xl text-white'}`}>
                      {isOpp ? 'OPP' : (p.number ?? '?')}
                    </span>
                    <span className="text-[11px] mt-1 text-white/50 text-center px-1 truncate w-full">
                      {isOpp ? 'Opponent' : p.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-white/30">{pts} pts</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Box Score Panel ──────────────────────────────────────────────────────────

const BOX_COLS: Array<{ key: StatType | 'pts_calc' | 'reb_calc'; label: string }> = [
  { key: 'pts_calc',  label: 'PTS' },
  { key: 'reb_calc',  label: 'REB' },
  { key: 'AST',       label: 'AST' },
  { key: 'STL',       label: 'STL' },
  { key: 'BLK',       label: 'BLK' },
  { key: 'TO',        label: 'TO' },
]

function calcPts(entries: StatEntry[]): number {
  let pts = 0
  for (const e of entries) {
    if (e.stat_type === '2M')  pts += 2
    else if (e.stat_type === '3M')  pts += 3
    else if (e.stat_type === 'FTM') pts += 1
  }
  return pts
}

function calcReb(entries: StatEntry[]): number {
  return entries.filter(e => e.stat_type === 'OREB' || e.stat_type === 'DREB').length
}

function countStat(entries: StatEntry[], stat: StatType): number {
  return entries.filter((e) => e.stat_type === stat).length
}

function BoxScorePanel({
  gameId,
  players,
  statEntries,
  onSeek,
  onDeleteEntry,
}: {
  gameId: string
  players: Player[]
  statEntries: StatEntry[]
  onSeek: (ms: number) => void
  onDeleteEntry: (id: string) => void
}) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Add players to your roster first.
      </div>
    )
  }

  if (statEntries.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart className="w-8 h-8 mx-auto text-white/15 mb-2" />
        <p className="text-xs text-white/30">No stats yet.</p>
        <p className="text-xs text-white/20 mt-1">Tap the stat button below the video to start tagging.</p>
      </div>
    )
  }

  const totals: Record<string, StatEntry[]> = {}
  for (const player of players) {
    totals[player.id] = statEntries.filter((e) => e.player_id === player.id)
  }

  const teamTotals = statEntries

  return (
    <div className="space-y-2">
      {/* Box score table */}
      <div className="overflow-x-auto -mx-3 px-3">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left text-white/40 font-medium pb-2 pr-2 sticky left-0 bg-[#13161b]">Player</th>
              {BOX_COLS.map((col) => (
                <th key={col.key} className="text-center text-white/40 font-medium pb-2 px-1 min-w-[30px]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {players.map((player) => {
              const playerEntries = totals[player.id] ?? []
              const isExpanded = expandedPlayerId === player.id
              return (
                <>
                  <tr
                    key={player.id}
                    onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                    className="hover:bg-white/3 transition-colors cursor-pointer"
                  >
                    <td className="py-2 pr-2 sticky left-0 bg-transparent">
                      <div className="flex items-center gap-1.5">
                        {isExpanded
                          ? <ChevronUp className="w-3 h-3 text-white/30 shrink-0" />
                          : <ChevronDown className="w-3 h-3 text-white/20 shrink-0" />
                        }
                        <span className="font-medium text-white/80 truncate max-w-[90px]">
                          #{player.number} {player.name.split(' ')[0]}
                        </span>
                      </div>
                    </td>
                    {BOX_COLS.map((col) => {
                      const val = col.key === 'pts_calc'
                        ? calcPts(playerEntries)
                        : col.key === 'reb_calc'
                          ? calcReb(playerEntries)
                          : countStat(playerEntries, col.key as StatType)
                      return (
                        <td key={col.key} className="text-center px-1 py-2">
                          <span className={val > 0 ? 'text-white/90 font-medium' : 'text-white/20'}>
                            {val}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  {isExpanded && playerEntries.length > 0 && (
                    <tr key={`${player.id}-expanded`}>
                      <td colSpan={BOX_COLS.length + 1} className="pb-2 pt-0">
                        <div className="ml-5 space-y-0.5">
                          {playerEntries
                            .slice()
                            .sort((a, b) => a.video_time_ms - b.video_time_ms)
                            .map((entry) => (
                              <button
                                key={entry.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSeek(entry.video_time_ms)
                                }}
                                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-blue-500/15 hover:border-blue-500/20 border border-transparent transition-all text-left group"
                              >
                                <Play className="w-3 h-3 text-white/20 group-hover:text-blue-400 shrink-0 transition-colors" />
                                <span className="font-mono text-white/40 tabular-nums text-[11px] w-10 shrink-0">
                                  {msToDisplay(entry.video_time_ms)}
                                </span>
                                <span className="font-bold text-blue-300 text-[11px] flex-1">{STAT_DEFS.find(d => d.key === entry.stat_type)?.label ?? entry.stat_type}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id) }}
                                  style={{ touchAction: 'manipulation' }}
                                  className="p-1 rounded text-white/20 hover:text-red-400 transition-all shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}

            {/* Team totals row */}
            <tr className="border-t-2 border-white/12">
              <td className="py-2 pr-2 sticky left-0 bg-transparent">
                <span className="font-semibold text-white/60 text-[11px] uppercase tracking-wide">Team</span>
              </td>
              {BOX_COLS.map((col) => {
                const val = col.key === 'pts_calc'
                  ? calcPts(teamTotals)
                  : col.key === 'reb_calc'
                    ? calcReb(teamTotals)
                    : countStat(teamTotals, col.key as StatType)
                return (
                  <td key={col.key} className="text-center px-1 py-2">
                    <span className={`font-semibold ${val > 0 ? 'text-white/70' : 'text-white/20'}`}>{val}</span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-white/20 pt-1">
        PTS = (2M × 2) + (3M × 3) + (FT × 1). Tap a player row to expand timeline. Tap a timestamp to jump.
      </p>
    </div>
  )
}

// ─── Video Upload Zone ───────────────────────────────────────────────────────

type UploadState =
  | { phase: 'idle' }
  | { phase: 'signing' }
  | { phase: 'uploading'; progress: number; method: 'stream' | 'r2'; partInfo?: string }
  | { phase: 'processing'; videoId?: string }
  | { phase: 'done'; url: string; videoId?: string }
  | { phase: 'error'; message: string }

function VideoUploadZone({
  gameId,
  onComplete,
}: {
  gameId: string
  onComplete: (url: string, videoId?: string) => void
}) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setState({ phase: 'signing' })
    try {
      // 1. Get upload URL from our API
      const signRes = await fetch('/api/filmroom/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          gameId,
          fileSizeBytes: file.size,
        }),
      })
      if (!signRes.ok) throw new Error(`Sign error ${signRes.status}: ${await signRes.text()}`)
      const sign = await signRes.json()

      setState({ phase: 'uploading', progress: 0, method: sign.method })

      if (sign.method === 'stream') {
        // Cloudflare Stream TUS upload
        await tusUpload(file, sign.uploadUrl, (p) =>
          setState({ phase: 'uploading', progress: p, method: 'stream' })
        )
        setState({ phase: 'processing', videoId: sign.videoId })
        // Poll until ready
        await pollStreamReady(sign.videoId)
        const hlsUrl = `https://videodelivery.net/${sign.videoId}/manifest/video.m3u8`
        onComplete(hlsUrl, sign.videoId)
        setState({ phase: 'done', url: hlsUrl, videoId: sign.videoId })
      } else {
        // R2 multipart upload (handles any file size, no single-PUT 5GB limit)
        const playbackUrl = await r2MultipartUpload(
          file,
          gameId,
          (p, partInfo) => setState({ phase: 'uploading', progress: p, method: 'r2', partInfo })
        )
        onComplete(playbackUrl)
        setState({ phase: 'done', url: playbackUrl })
      }
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) upload(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      upload(file)
      // Reset input so same file can be re-selected if needed
      e.target.value = ''
    }
  }

  const triggerPicker = () => {
    // Re-create the input click in a genuine user gesture context
    const input = inputRef.current
    if (!input) return
    input.value = ''
    input.click()
  }

  if (state.phase === 'done') return null // Player takes over

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full aspect-video bg-[#0e1015] rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors flex flex-col items-center justify-center gap-4 group"
    >
      {/* Input must NOT be display:none or visibility:hidden on Safari — use opacity:0 + position:absolute instead */}
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.m4v,.avi,.mkv,video/mp4,video/quicktime,video/x-m4v"
        onChange={handleFile}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />

      {state.phase === 'idle' && (
        <>
          <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center">
            <Upload className="w-7 h-7 text-white/30" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/50 font-medium">Select game film</p>
            <p className="text-xs text-white/25 mt-1">MP4, MOV, MKV · any size</p>
          </div>
          {/* Explicit button — required for Safari/iPadOS to fire onChange reliably */}
          <button
            type="button"
            onClick={triggerPicker}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors shadow-lg"
          >
            Choose Video
          </button>
          <p className="text-xs text-white/25 text-center max-w-xs">
            On iPad: tap Choose Video → use <strong className="text-white/40">Files app</strong> (not Photos).
            Save your video to iCloud Drive first if needed.
          </p>
        </>
      )}

      {state.phase === 'signing' && (
        <>
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-white/50">Preparing upload…</p>
        </>
      )}

      {state.phase === 'uploading' && (
        <div className="w-full max-w-xs px-6 text-center">
          <div className="mb-3">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin mx-auto" />
          </div>
          <p className="text-sm text-white/70 mb-3">
            Uploading via {state.method === 'stream' ? 'Cloudflare Stream' : 'R2'}… {state.progress}%
          {state.phase === 'uploading' && state.partInfo && (
            <span className="text-xs text-white/30 block mt-0.5">{state.partInfo}</span>
          )}
          </p>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === 'processing' && (
        <>
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-white/50">Processing video…</p>
          <p className="text-xs text-white/25">Cloudflare is transcoding. This takes about 30–60s.</p>
        </>
      )}

      {state.phase === 'error' && (
        <div className="text-center px-6">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300 mb-1">Upload failed</p>
          <p className="text-xs text-red-400/60 mb-3 max-w-xs">{state.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setState({ phase: 'idle' }) }}
            className="px-4 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs text-white/60 transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// R2 multipart upload — handles files of any size
// R2 single PUT limit = 5 GB; multipart supports up to 5 TB
// Part size: 100 MB (R2 min per part is 5 MB except last part)
async function r2MultipartUpload(
  file: File,
  gameId: string,
  onProgress: (percent: number, partInfo: string) => void
): Promise<string> {
  const CHUNK_SIZE = 100 * 1024 * 1024 // 100 MB per part
  const totalParts = Math.ceil(file.size / CHUNK_SIZE)

  // 1. Create multipart upload — server picks the key
  const createRes = await fetch('/api/filmroom/upload/multipart?action=create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4', gameId }),
  })
  if (!createRes.ok) throw new Error(`Multipart create failed: ${createRes.status}`)
  const { uploadId, key: confirmedKey, playbackUrl } = await createRes.json()

  const parts: { ETag: string; PartNumber: number }[] = []
  let bytesUploaded = 0

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      // 2. Get signed URL for this part
      const partRes = await fetch('/api/filmroom/upload/multipart?action=part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, key: confirmedKey, partNumber }),
      })
      if (!partRes.ok) throw new Error(`Part sign failed: ${partRes.status}`)
      const { signedUrl } = await partRes.json()

      // 3. Upload the chunk via XHR for progress tracking
      const etag = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const totalDone = bytesUploaded + e.loaded
            const pct = Math.round((totalDone / file.size) * 100)
            onProgress(pct, `Part ${partNumber} of ${totalParts}`)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('etag') ?? `"part-${partNumber}"`
            resolve(etag)
          } else {
            reject(new Error(`R2 PUT ${xhr.status} on part ${partNumber}`))
          }
        }
        xhr.onerror = () => reject(new Error(`Network error on part ${partNumber}`))
        xhr.send(chunk)
      })

      parts.push({ ETag: etag, PartNumber: partNumber })
      bytesUploaded += chunk.size
      onProgress(Math.round((bytesUploaded / file.size) * 100), `Part ${partNumber} of ${totalParts} done`)
    }

    // 4. Complete the multipart upload
    const completeRes = await fetch('/api/filmroom/upload/multipart?action=complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, key: confirmedKey, parts }),
    })
    if (!completeRes.ok) throw new Error(`Multipart complete failed: ${completeRes.status}`)

    return playbackUrl
  } catch (err) {
    // Abort on any failure to clean up the incomplete upload on R2
    fetch('/api/filmroom/upload/multipart?action=abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, key: confirmedKey }),
    }).catch(() => {})
    throw err
  }
}

// Minimal TUS client for Cloudflare Stream
async function tusUpload(
  file: File,
  uploadUrl: string,
  onProgress: (p: number) => void,
  chunkSize = 50 * 1024 * 1024 // 50 MB chunks
): Promise<void> {
  // PATCH in chunks
  let offset = 0
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    const res = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
      },
      body: chunk,
    })
    if (!res.ok) throw new Error(`TUS PATCH ${res.status}: ${await res.text()}`)
    offset += chunk.size
    onProgress(Math.round((offset / file.size) * 100))
  }
}

// Poll Stream until video is ready to stream
async function pollStreamReady(videoId: string, maxWaitMs = 120_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch(`/api/filmroom/upload?videoId=${videoId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.readyToStream) return
    }
  }
  throw new Error('Video took too long to process')
}

// ─── Video Player Component ───────────────────────────────────────────────────

// Extract R2 key from a stored video_url (the raw R2 endpoint URL)
// e.g. https://filmroom-videos.108ae2b237d537d16e57f93a1a13444f.r2.cloudflarestorage.com/games/...
// or   https://108ae2b237d537d16e57f93a1a13444f.r2.cloudflarestorage.com/filmroom-videos/games/...
function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('r2.cloudflarestorage.com')) return null
    // Virtual-hosted style: filmroom-videos.account.r2.cloudflarestorage.com/KEY
    if (u.hostname.startsWith('filmroom-videos.')) return u.pathname.replace(/^\//, '')
    // Path style: account.r2.cloudflarestorage.com/filmroom-videos/KEY
    return u.pathname.replace(/^\/filmroom-videos\//, '')
  } catch { return null }
}

function VideoPlayer({
  videoUrl,
  videoId,
  onTimeUpdate,
  onDurationChange,
  playerRef,
  isFullscreen,
}: {
  videoUrl: string | null
  videoId: string | null
  onTimeUpdate: (ms: number) => void
  onDurationChange: (ms: number) => void
  playerRef: React.RefObject<HTMLVideoElement | null>
  isFullscreen?: boolean
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    if (videoId) {
      setResolvedSrc(`https://videodelivery.net/${videoId}/manifest/video.m3u8`)
      return
    }
    if (!videoUrl) return
    // If it's a raw R2 endpoint URL, fetch a presigned playback URL
    const key = extractR2Key(videoUrl)
    if (key) {
      fetch(`/api/filmroom/upload/multipart?action=sign-get&key=${encodeURIComponent(key)}`)
        .then(r => r.json())
        .then(d => { if (d.signedUrl) setResolvedSrc(d.signedUrl) })
        .catch(() => setResolvedSrc(videoUrl)) // fallback to raw url
    } else {
      setResolvedSrc(videoUrl)
    }
  }, [videoUrl, videoId])

  if (!resolvedSrc) return null

  return (
    <video
      ref={playerRef}
      src={resolvedSrc}
      // In fullscreen: fill the flex container height; in normal layout: use aspect-video
      // but cap height so transport bar stays on screen without scrolling
      className={isFullscreen
        ? 'w-full h-full object-contain bg-black'
        : 'w-full bg-black' // no aspect-video — height driven by max-h on parent
      }
      style={isFullscreen ? undefined : { maxHeight: 'calc(100vh - 48px - 130px)', aspectRatio: '16/9' }}
      onTimeUpdate={(e) => onTimeUpdate(Math.round(e.currentTarget.currentTime * 1000))}
      onDurationChange={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      onLoadedMetadata={(e) => onDurationChange(Math.round(e.currentTarget.duration * 1000))}
      playsInline
      preload="metadata"
      controls={false}
    />
  )
}

// ─── Transport Bar ────────────────────────────────────────────────────────────

function TransportBar({
  isPlaying, currentMs, durationMs,
  onPlayPause, onSeek, onSkip, onFrameStep,
  markIn, markOut, onMarkIn, onMarkOut,
  isFullscreen,
}: {
  isPlaying: boolean
  currentMs: number
  durationMs: number
  onPlayPause: () => void
  onSeek: (ms: number) => void
  onSkip: (delta: number) => void
  onFrameStep: (dir: 1 | -1) => void
  markIn: number | null
  markOut: number | null
  onMarkIn: () => void
  onMarkOut: () => void
  isFullscreen?: boolean
}) {
  const pct = durationMs > 0 ? (currentMs / durationMs) * 100 : 0
  const inPct = (markIn != null && durationMs > 0) ? (markIn / durationMs) * 100 : null
  const outPct = (markOut != null && durationMs > 0) ? (markOut / durationMs) * 100 : null

  return (
    <div className={`space-y-3 px-4 py-3 bg-[#13161b] border-t border-white/8 ${isFullscreen ? '' : 'rounded-b-xl border border-t-0 border-white/8'}`}>
      {/* Scrubber */}
      <div className="relative group">
        <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const pct = x / rect.width
            onSeek(Math.round(pct * durationMs))
          }}>
          {/* Clip region highlight */}
          {inPct != null && outPct != null && (
            <div className="absolute top-0 h-full bg-blue-500/40 rounded-full"
              style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }} />
          )}
          {/* Progress */}
          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-none"
            style={{ width: `${pct}%` }} />
          {/* Thumb */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 6px)` }} />
          {/* Mark In */}
          {inPct != null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-green-400 rounded-sm"
              style={{ left: `${inPct}%` }} title="Mark In" />
          )}
          {/* Mark Out */}
          {outPct != null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-red-400 rounded-sm"
              style={{ left: `${outPct}%` }} title="Mark Out" />
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Frame back */}
        <button onClick={() => onFrameStep(-1)}
          className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Previous frame (← arrow)">
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Skip -5s */}
        <button onClick={() => onSkip(-5000)}
          className="px-2 py-1 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Back 5s (J)">
          -5s
        </button>

        {/* Play/Pause */}
        <button onClick={onPlayPause}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-colors" title="Play/Pause (Space)">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Skip +5s */}
        <button onClick={() => onSkip(5000)}
          className="px-2 py-1 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Forward 5s (L)">
          +5s
        </button>

        {/* Frame fwd */}
        <button onClick={() => onFrameStep(1)}
          className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Next frame (→ arrow)">
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        {/* Timecode */}
        <span className="font-mono text-xs text-white/50 tabular-nums">
          {msToTimecode(currentMs)} / {msToTimecode(durationMs)}
        </span>

        {/* Mark In / Out */}
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onMarkIn}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${markIn != null ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark In point (I)">
            <Scissors className="w-3 h-3" /> IN
          </button>
          <button onClick={onMarkOut}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${markOut != null ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark Out point (O)">
            OUT <Scissors className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="flex gap-3 text-[10px] text-white/20 border-t border-white/5 pt-2">
        <span><kbd className="font-mono bg-white/8 px-1 rounded">Space</kbd> play/pause</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">←</kbd><kbd className="font-mono bg-white/8 px-1 rounded">→</kbd> frame</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">J</kbd><kbd className="font-mono bg-white/8 px-1 rounded">L</kbd> ±5s</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">I</kbd> mark in</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">O</kbd> mark out</span>
        <span><kbd className="font-mono bg-white/8 px-1 rounded">S</kbd> save clip</span>
      </div>
    </div>
  )
}

// ─── Save Clip Modal ──────────────────────────────────────────────────────────

function SaveClipModal({
  gameId, teamId, startMs, endMs, players, drawingData,
  onClose, onSave,
}: {
  gameId: string
  teamId: string
  startMs: number
  endMs: number
  players: Player[]
  drawingData?: DrawingData | null
  onClose: () => void
  onSave: (clip: Clip) => void
}) {
  const [form, setForm] = useState({
    title: '', category: 'offense' as ClipCategory,
    tags: '', is_highlight: false, player_ids: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/filmroom/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          team_id: teamId,
          start_time_ms: startMs,
          end_time_ms: endMs,
          title: form.title || `${msToTimecode(startMs)} – ${msToTimecode(endMs)}`,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: form.category,
          is_highlight: form.is_highlight,
          player_ids: form.player_ids,
          drawing_data: drawingData ?? null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const clip = await res.json()
      onSave(clip)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (id: string) => {
    setForm(f => ({
      ...f,
      player_ids: f.player_ids.includes(id)
        ? f.player_ids.filter(p => p !== id)
        : [...f.player_ids, id],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Save Clip</h2>
            <p className="text-xs text-white/40 mt-0.5">{msToTimecode(startMs)} → {msToTimecode(endMs)} ({formatDuration(startMs, endMs)})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Clip Title</label>
            <input type="text" placeholder="e.g. Pick and roll coverage"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as ClipCategory[]).map(cat => (
                <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.category === cat ? CATEGORY_COLORS[cat] : 'border-white/8 text-white/40 hover:text-white/70'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Tags <span className="text-white/25">(comma-separated)</span></label>
            <input type="text" placeholder="closeout, help-D, zone"
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>

          {players.length > 0 && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Tag Players</label>
              <div className="flex flex-wrap gap-1.5">
                {players.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlayer(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs transition-all border ${form.player_ids.includes(p.id) ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'border-white/8 text-white/40 hover:text-white/70'}`}>
                    #{p.number} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, is_highlight: !f.is_highlight }))}
              className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${form.is_highlight ? 'bg-yellow-500 border-yellow-500' : 'border-white/20'}`}>
              {form.is_highlight && <Star className="w-2.5 h-2.5 text-black fill-black" />}
            </div>
            <span className="text-xs text-white/60">Mark as highlight</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Clip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Clip Comment Thread ──────────────────────────────────────────────────────

function CommentThread({ clipId }: { clipId: string }) {
  const [comments, setComments] = useState<ClipComment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    fetch(`/api/filmroom/comments?clip_id=${clipId}`)
      .then(r => r.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
  }, [clipId])

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch('/api/filmroom/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: clipId, author_role: 'coach', author_name: 'Coach Stevens', text }),
    })
    const comment = await res.json()
    setComments(c => [...c, comment])
    setText('')
    setLoading(false)
  }

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mb-2">
        <MessageSquare className="w-3 h-3" />
        {comments.length} comment{comments.length !== 1 ? 's' : ''}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-2">
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="Add coaching note..."
              className="flex-1 bg-black/20 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/40 placeholder-white/20" />
            <button onClick={submit} disabled={loading || !text.trim()}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-40 transition-colors">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clip List Item ───────────────────────────────────────────────────────────

function ClipItem({
  clip, isActive, onSelect, onDelete, onJumpTo,
}: {
  clip: Clip
  isActive: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  onJumpTo: (ms: number) => void
}) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${isActive ? 'border-blue-500/40 bg-blue-500/8' : 'border-white/6 bg-white/3 hover:bg-white/5'}`}>
      <div className="p-3 cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onJumpTo(clip.start_time_ms) }}
            className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-white/8 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
            title="Jump to clip">
            <Play className="w-2.5 h-2.5 ml-0.5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {clip.is_highlight && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
              <span className="text-xs font-medium text-white truncate">{clip.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-white/40 font-mono">{msToTimecode(clip.start_time_ms)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[clip.category]}`}>
                {CATEGORY_LABELS[clip.category]}
              </span>
              {clip.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] text-white/35 bg-white/5 px-1.5 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
            {clip.players && clip.players.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {clip.players.map((p: Player) => (
                  <span key={p.id} className="text-[10px] text-blue-300/70 bg-blue-500/8 border border-blue-500/15 px-1.5 py-0.5 rounded-md">
                    #{p.number} {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setShowComments(s => !s) }}
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
              <MessageSquare className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(clip.id) }}
              className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {showComments && <div className="px-3 pb-3"><CommentThread clipId={clip.id} /></div>}
    </div>
  )
}

// ─── Video URL Modal ──────────────────────────────────────────────────────────

function VideoUrlModal({ gameId, current, onClose, onSave }: {
  gameId: string; current: string | null; onClose: () => void; onSave: (url: string) => void
}) {
  const [url, setUrl] = useState(current || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    await fetch(`/api/filmroom/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: url }),
    })
    onSave(url)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold mb-4">Set Video URL</h2>
        <p className="text-xs text-white/40 mb-3">Paste any direct video URL. Cloudflare Stream URLs work natively.</p>
        <input type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 placeholder-white/20 mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FRAME_MS = 33 // ~30fps

type PanelTab = 'clips' | 'stats' | 'roster'

export default function GameFilmRoom() {
  const params = useParams()
  const gameId = params.id as string

  const videoRef = useRef<HTMLVideoElement>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)

  const [markIn, setMarkIn] = useState<number | null>(null)
  const [markOut, setMarkOut] = useState<number | null>(null)
  const [showSaveClip, setShowSaveClip] = useState(false)
  const [showVideoUrl, setShowVideoUrl] = useState(false)
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('clips')
  const [uploadDone, setUploadDone] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [drawingActive, setDrawingActive] = useState(false)
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null)

  // Stat entry state
  const [showStatPanel, setShowStatPanel] = useState(false)
  const [statEntries, setStatEntries] = useState<StatEntry[]>([])
  const [sessionStatEntries, setSessionStatEntries] = useState<StatEntry[]>([])

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`/api/filmroom/games/${gameId}`).then(r => r.json()),
      fetch(`/api/filmroom/clips?game_id=${gameId}`).then(r => r.json()),
      fetch(`/api/filmroom/players?team_id=${TEST_TEAM_ID}`).then(r => r.json()),
      fetch(`/api/filmroom/stat-entries?game_id=${gameId}`).then(r => r.json()),
    ]).then(([g, c, p, se]) => {
      setGame(g)
      setClips(Array.isArray(c) ? c : [])
      setPlayers(Array.isArray(p) ? p : [])
      if (Array.isArray(se)) {
        setStatEntries(se.map((raw: RawStatEntry) => rawToEntry(raw)))
      }
      setLoading(false)
    })
  }, [gameId])

  // Video controls
  const playPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const seek = useCallback((ms: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = ms / 1000
    setCurrentMs(ms)
  }, [])

  const seekAndPlay = useCallback((ms: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = ms / 1000
    setCurrentMs(ms)
    v.play()
    setIsPlaying(true)
  }, [])

  const skip = useCallback((deltaMs: number) => {
    const v = videoRef.current
    if (!v) return
    const ms = Math.max(0, Math.min(durationMs, currentMs + deltaMs))
    seek(ms)
  }, [currentMs, durationMs, seek])

  const frameStep = useCallback((dir: 1 | -1) => {
    const v = videoRef.current
    if (!v || v.paused === false) { v?.pause(); setIsPlaying(false) }
    skip(dir * FRAME_MS)
  }, [skip])

  // Stat panel: pause video when opening
  const openStatPanel = useCallback(() => {
    const v = videoRef.current
    if (v && !v.paused) { v.pause(); setIsPlaying(false) }
    setShowStatPanel(true)
  }, [])

  // Close stat panel: resume video if it was playing
  const closeStatPanel = useCallback(() => {
    setShowStatPanel(false)
  }, [])

  // Log a stat entry
  const handleLogEntry = useCallback((entry: StatEntry) => {
    setStatEntries(prev => [...prev, entry])
    setSessionStatEntries(prev => [...prev, entry])
  }, [])

  // Undo last session entry
  const handleUndo = useCallback(async () => {
    const last = sessionStatEntries[sessionStatEntries.length - 1]
    if (!last) return
    try {
      await fetch(`/api/filmroom/stat-entries?id=${last.id}`, { method: 'DELETE' })
      setStatEntries(prev => prev.filter(e => e.id !== last.id))
      setSessionStatEntries(prev => prev.slice(0, -1))
    } catch {
      // ignore
    }
  }, [sessionStatEntries])

  const handleDeleteEntry = useCallback(async (id: string) => {
    try {
      await fetch(`/api/filmroom/stat-entries?id=${id}`, { method: 'DELETE' })
      setStatEntries(prev => prev.filter(e => e.id !== id))
      setSessionStatEntries(prev => prev.filter(e => e.id !== id))
    } catch {
      // ignore
    }
  }, [])

  // Jump to clip
  const jumpToClip = useCallback((startMs: number) => {
    seek(startMs)
    const v = videoRef.current
    if (v && v.paused) { v.play(); setIsPlaying(true) }
  }, [seek])

  // Delete clip
  const deleteClip = async (id: string) => {
    if (!confirm('Delete this clip?')) return
    await fetch(`/api/filmroom/clips/${id}`, { method: 'DELETE' })
    setClips(c => c.filter(x => x.id !== id))
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (showStatPanel) return
      switch (e.key) {
        case ' ': e.preventDefault(); playPause(); break
        case 'ArrowLeft': e.preventDefault(); frameStep(-1); break
        case 'ArrowRight': e.preventDefault(); frameStep(1); break
        case 'j': case 'J': skip(-5000); break
        case 'l': case 'L': skip(5000); break
        case 'i': case 'I': setMarkIn(currentMs); break
        case 'o': case 'O': setMarkOut(currentMs); break
        case 's': case 'S':
          if (markIn !== null && markOut !== null && markOut > markIn) setShowSaveClip(true)
          break
        case 'f': case 'F': setIsFullscreen(f => !f); break
        case 'Escape': setIsFullscreen(false); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playPause, frameStep, skip, currentMs, markIn, markOut, showStatPanel, setIsFullscreen])

  if (loading) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  if (!game) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center text-white/40">
      Game not found.
    </div>
  )

  const highlights = clips.filter(c => c.is_highlight)
  const canSave = markIn !== null && markOut !== null && markOut > markIn
  const videoLoaded = !!game.video_url

  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="px-3 sm:px-4 h-12 flex items-center gap-3">
          <Link href="/filmroom" className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 text-sm min-w-0">
            <span className="text-white/40 shrink-0">Film Room</span>
            <span className="text-white/20 mx-1">/</span>
            <span className="font-medium truncate">vs {game.opponent}</span>
            <span className="text-white/30 text-xs ml-2 shrink-0">
              {new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex-1" />
          {game.video_url ? (
            <button onClick={() => setShowVideoUrl(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/6 transition-all border border-white/8 hover:border-white/15">
              <Upload className="w-3 h-3" /> Change Video
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-orange-400/80 border border-orange-500/20 bg-orange-500/5">
              <Upload className="w-3 h-3" /> Drop video below
            </span>
          )}
          {highlights.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-yellow-500/15 text-yellow-400 text-xs border border-yellow-500/25">
              <Star className="w-3 h-3 fill-yellow-400" /> {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video + transport */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
          <div className={`flex flex-col h-full ${isFullscreen ? 'p-0' : 'p-3 sm:p-4'}`}>
            {/* Upload zone — shown when no video + not mid-upload */}
            {!game.video_url && !uploadDone && (
              <div className="rounded-xl overflow-hidden border border-white/8 mb-0">
                <VideoUploadZone
                  gameId={gameId}
                  onComplete={async (url, videoId) => {
                    await fetch(`/api/filmroom/games/${gameId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ video_url: url, ...(videoId ? { video_id: videoId } : {}) }),
                    })
                    setGame(g => g ? { ...g, video_url: url, video_id: videoId ?? null } : g)
                    setUploadDone(true)
                  }}
                />
              </div>
            )}

            {/* Video player — shown when video_url is set */}
            {game.video_url && (
              <div className={`relative bg-black ${isFullscreen ? 'flex-1 min-h-0' : 'rounded-t-xl overflow-hidden border border-b-0 border-white/8'}`}>
                <VideoPlayer
                  videoUrl={game.video_url}
                  videoId={game.video_id}
                  onTimeUpdate={setCurrentMs}
                  onDurationChange={setDurationMs}
                  playerRef={videoRef}
                  isFullscreen={isFullscreen}
                />
                <DrawingOverlay
                  active={drawingActive}
                  onDataChange={setDrawingData}
                  initialData={null}
                />
                {/* Fullscreen toggle button — always visible on the video */}
                <button
                  onClick={() => setIsFullscreen(f => !f)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all z-10"
                  title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            )}
            {/* Transport — only active with video */}
            {game.video_url && <TransportBar
              isPlaying={isPlaying}
              currentMs={currentMs}
              durationMs={durationMs}
              onPlayPause={playPause}
              onSeek={seek}
              onSkip={skip}
              onFrameStep={frameStep}
              markIn={markIn}
              markOut={markOut}
              onMarkIn={() => setMarkIn(currentMs)}
              onMarkOut={() => setMarkOut(currentMs)}
              isFullscreen={isFullscreen}
            />}
            {/* Upload success banner — hidden in fullscreen */}
            {!isFullscreen && uploadDone && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">Video uploaded and ready — use the controls above to start marking clips.</p>
              </div>
            )}

            {/* Save clip CTA — hidden in fullscreen (use keyboard shortcuts instead) */}
            {!isFullscreen && canSave && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300">Clip marked</p>
                  <p className="text-xs text-blue-400/60">
                    {msToTimecode(markIn!)} → {msToTimecode(markOut!)} ({formatDuration(markIn!, markOut!)})
                  </p>
                </div>
                <button onClick={() => { setMarkIn(null); setMarkOut(null) }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                  Clear
                </button>
                <button onClick={() => setShowSaveClip(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors">
                  <Scissors className="w-3.5 h-3.5" /> Save Clip <kbd className="font-mono opacity-60 ml-1">S</kbd>
                </button>
              </div>
            )}

            {/* Drawing toggle — hidden in fullscreen */}
            {!isFullscreen && game.video_url && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setDrawingActive(a => !a)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    drawingActive
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white hover:bg-white/6'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {drawingActive ? 'Drawing On — click tools on video' : 'Draw on video'}
                </button>
                {drawingActive && (
                  <p className="text-xs text-white/30">Arrows, circles, freehand, text. Drawing saves with your clip.</p>
                )}
              </div>
            )}

            {/* Floating Stat Button — hidden in fullscreen */}
            {!isFullscreen && videoLoaded && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={openStatPanel}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-sm transition-all shadow-xl shadow-blue-500/20 border border-blue-500/30"
                >
                  <BarChart className="w-4 h-4" />
                  Tag Stat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Clip panel */}
        <div className="w-80 xl:w-96 shrink-0 border-l border-white/8 flex flex-col">
          {/* Panel tabs */}
          <div className="shrink-0 border-b border-white/8 flex">
            {([
              ['clips', 'Clips', Bookmark],
              ['stats', 'Stats', BarChart2],
              ['roster', 'Roster', Users],
            ] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-all ${panelTab === tab ? 'border-blue-500 text-blue-300' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}

              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* CLIPS tab */}
            {panelTab === 'clips' && (
              <div className="p-3 space-y-2">
                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className="text-xs text-white/30">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
                  {highlights.length > 0 && (
                    <span className="text-xs text-yellow-400/70 flex items-center gap-1 ml-auto">
                      <Star className="w-2.5 h-2.5 fill-yellow-400" /> {highlights.length} HL
                    </span>
                  )}
                </div>

                {clips.length === 0 ? (
                  <div className="text-center py-10">
                    <Scissors className="w-8 h-8 mx-auto text-white/15 mb-2" />
                    <p className="text-xs text-white/30">No clips yet.</p>
                    <p className="text-xs text-white/20 mt-1">Use I / O to mark in/out, then S to save.</p>
                  </div>
                ) : (
                  clips.map(clip => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      isActive={activeClipId === clip.id}
                      onSelect={() => setActiveClipId(id => id === clip.id ? null : clip.id)}
                      onDelete={deleteClip}
                      onJumpTo={(ms) => { jumpToClip(ms); setActiveClipId(clip.id) }}
                    />
                  ))
                )}
              </div>
            )}

            {/* STATS tab — read-only box score */}
            {panelTab === 'stats' && (
              <div className="p-3">
                <BoxScorePanel
                  gameId={gameId}
                  players={players}
                  statEntries={statEntries}
                  onSeek={seekAndPlay}
                  onDeleteEntry={handleDeleteEntry}
                />
              </div>
            )}

            {/* ROSTER tab */}
            {panelTab === 'roster' && (
              <div className="p-3">
                <RosterPanel players={players} onPlayersChange={setPlayers} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSaveClip && markIn !== null && markOut !== null && (
        <SaveClipModal
          gameId={gameId}
          teamId={game.team_id}
          startMs={markIn}
          endMs={markOut}
          players={players}
          drawingData={drawingData}
          onClose={() => setShowSaveClip(false)}
          onSave={(clip) => {
            setClips(c => [...c, clip])
            setMarkIn(null)
            setMarkOut(null)
            setDrawingActive(false)
            setDrawingData(null)
          }}
        />
      )}

      {showVideoUrl && (
        <VideoUrlModal
          gameId={gameId}
          current={game.video_url}
          onClose={() => setShowVideoUrl(false)}
          onSave={(url) => setGame(g => g ? { ...g, video_url: url } : g)}
        />
      )}

      {/* Stat Entry Panel */}
      {showStatPanel && (
        <StatEntryPanel
          gameId={gameId}
          players={players}
          currentMs={currentMs}
          sessionEntries={sessionStatEntries}
          onLog={handleLogEntry}
          onUndo={handleUndo}
          onClose={closeStatPanel}
        />
      )}
    </div>
  )
}

// ─── Inline Roster Panel ──────────────────────────────────────────────────────

function RosterPanel({ players, onPlayersChange }: { players: Player[]; onPlayersChange: (p: Player[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '', parent_email: '' })
  const [loading, setLoading] = useState(false)

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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
    const player = await res.json()
    onPlayersChange([...players, player])
    setForm({ name: '', number: '', position: '', parent_email: '' })
    setAdding(false)
    setLoading(false)
  }

  const removePlayer = async (id: string) => {
    await fetch(`/api/filmroom/players/${id}`, { method: 'DELETE' })
    onPlayersChange(players.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-2">
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
            {p.number ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{p.name}</p>
            {p.position && <p className="text-[10px] text-white/35">{p.position}</p>}
          </div>
          <button onClick={() => removePlayer(p.id)}
            className="p-1 rounded-lg text-white/20 hover:text-red-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={addPlayer} className="space-y-2 p-3 rounded-xl bg-white/3 border border-blue-500/25">
          <div className="grid grid-cols-2 gap-1.5">
            <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="#" type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="PG/SG/SF/PF/C" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
            <input placeholder="Parent email" type="email" value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 placeholder-white/20" />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setAdding(false)}
              className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />} Add
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-xs text-white/30 hover:text-white/60 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Player
        </button>
      )}
    </div>
  )
}
