'use client'
import { CustomClipTags } from '@/app/filmroom/components/CustomClipTags'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft,
  Scissors, Bookmark, Star, MessageSquare,
  Users, BarChart2, Pencil, X, Check,
  Plus, Trash2, Loader2, ChevronDown, ChevronUp, Upload,
  ZoomIn, AlertCircle, CheckCircle2, BarChart, Maximize2, Minimize2,
} from 'lucide-react'
import type { Game, Clip, Player, ClipCategory, ClipComment, Playlist } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS, PLAY_TYPES, normalizeDrawingData } from '@/types/filmroom'
import { DrawingOverlay, type DrawingData } from '@/app/filmroom/components/DrawingOverlay'
import { EventTimeline } from '@/app/filmroom/components/EventTimeline'
import { JogWheel } from '@/app/filmroom/components/JogWheel'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import { PresentationMode, type PresentationClip } from '@/app/filmroom/components/PresentationMode'

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

function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = async () => {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        className="font-medium bg-transparent border-b border-[#c66a3e] outline-none text-sm text-white w-40 px-0.5"
        disabled={saving}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="font-medium truncate text-sm hover:text-[#c66a3e] transition-colors flex items-center gap-1 group"
      title="Tap to edit"
    >
      {value}
      <span className="opacity-0 group-hover:opacity-60 text-[10px] text-white/40">(edit)</span>
    </button>
  )
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
  shot_x?: number | null
  shot_y?: number | null
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
  shot_x?: number | null
  shot_y?: number | null
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
    shot_x: raw.shot_x ?? null,
    shot_y: raw.shot_y ?? null,
  }
}

// Quick-stat preference helpers — user-scoped localStorage key
// Key is filmroom:quickStatPrefs:<userId>. No fallback to global key (avoids cross-user leakage).

function quickStatPrefsKey(userId: string): string {
  return `filmroom:quickStatPrefs:${userId}`
}

function readQuickStatPrefs(userId: string): StatType[] | null {
  if (!userId) return null
  try {
    const v = localStorage.getItem(quickStatPrefsKey(userId))
    if (!v) return null
    const parsed = JSON.parse(v)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((s): s is StatType => (STAT_TYPES as readonly string[]).includes(s))
  } catch { return null }
}

function writeQuickStatPrefs(userId: string, prefs: StatType[]): void {
  if (!userId) return
  try { localStorage.setItem(quickStatPrefsKey(userId), JSON.stringify(prefs)) } catch {}
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
  userId,
  onLog,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoPending,
  redoPending,
  undoError,
  redoError,
  onClose,
}: {
  gameId: string
  players: Player[]
  currentMs: number
  sessionEntries: StatEntry[]
  userId: string
  onLog: (entry: StatEntry) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  undoPending: boolean
  redoPending: boolean
  undoError: string | null
  redoError: string | null
  onClose: () => void
}) {
  const [selectedStat, setSelectedStat] = useState<StatType | null>(null)
  const [logging, setLogging] = useState(false)
  const [logError,setLogError]=useState<string|null>(null)
  // Staged shot location: set by tapping the court SVG, cleared after player tap
  const [stagedShot, setStagedShot] = useState<{ x: number; y: number } | null>(null)
  const [showCourtCapture, setShowCourtCapture] = useState(false)
  // Quick-stat preferences — start empty, load from localStorage once userId is known
  const [quickPrefs, setQuickPrefs] = useState<StatType[]>([])
  const [editingPrefs, setEditingPrefs] = useState(false)

  useEffect(() => {
    if (!userId) return
    const saved = readQuickStatPrefs(userId)
    if (saved) setQuickPrefs(saved)
  }, [userId])

  const togglePref = (stat: StatType) => {
    setQuickPrefs(prev => {
      const next = prev.includes(stat) ? prev.filter(s => s !== stat) : [...prev, stat]
      writeQuickStatPrefs(userId, next)
      return next
    })
  }

  const SHOT_TYPES_SET = new Set(['2M','3M','FTM','2X','3X','FTX'])

  const allPlayers = [...players, OPP_PLAYER]

  const handleStatTap = (stat: StatType) => {
    const next = selectedStat === stat ? null : stat
    setSelectedStat(next)
    // Auto-show court when a shot stat is selected, hide for non-shots
    if (next && SHOT_TYPES_SET.has(next)) setShowCourtCapture(true)
    else { setShowCourtCapture(false); setStagedShot(null) }
  }

  const handleCourtTap = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg=e.currentTarget, matrix=svg.getScreenCTM()
    if(!matrix)return
    const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY
    const local=point.matrixTransform(matrix.inverse())
    const x=Math.max(0,Math.min(1,(local.x-1)/48))
    const y=Math.max(0,Math.min(1,(local.y-1)/45))
    setStagedShot({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) })
  }

  const handlePlayerTap = async (player: Player) => {
    if (!selectedStat || logging) return
    setLogging(true);setLogError(null)
    try {
      const body: Record<string, unknown> = {
        game_id: gameId,
        player_id: player.id === OPP_ID ? null : player.id,
        stat_type: selectedStat,
        video_time_ms: currentMs,
      }
      // Include staged shot coords only for shot stat types
      if (stagedShot && SHOT_TYPES_SET.has(selectedStat)) {
        body.shot_x = stagedShot.x
        body.shot_y = stagedShot.y
      }
      const res = await fetch('/api/filmroom/stat-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      const raw: RawStatEntry = await res.json()
      // For OPP entries the DB returns player_id null — patch the name/number
      const entry: StatEntry = player.id === OPP_ID
        ? { ...rawToEntry(raw), player_id: OPP_ID, player_name: 'Opponent', player_number: 'OPP' }
        : rawToEntry(raw)
      onLog(entry)
      setStagedShot(null) // clear after commit; keep stat selected for rapid entry
    } catch {
      setLogError('The stat was not saved. Please try again.')
    } finally {
      setLogging(false)
    }
  }

  const handleUndo = () => { if (canUndo) onUndo() }
  const handleRedo = () => { if (canRedo) onRedo() }

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
        className="relative w-full max-w-3xl rounded-t-2xl flex flex-col overflow-y-auto overscroll-contain"
        style={{ backgroundColor: '#15181f', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90dvh' }}
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
              disabled={!canUndo || undoPending}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-30 transition-all"
              title="Undo last stat entry"
            >
              {undoPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Undo'}
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo || redoPending}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-30 transition-all"
              title="Redo last undone entry"
            >
              {redoPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Redo'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors" style={{background:"#c66a3e",color:"#181917"}}
            >
              Done
            </button>
          </div>
        </div>

        {(undoError || redoError) && (
          <p role="alert" className="px-4 py-1.5 text-xs text-red-300 border-b border-red-500/15">
            {undoError ?? redoError}
          </p>
        )}
        {logError && <p role="alert" className="px-4 py-2 text-sm text-red-300">{logError}</p>}

        {/* ── Quick-stat pinned row + preference toggle ── */}
        {quickPrefs.length > 0 && !editingPrefs && (
          <div className="shrink-0 px-4 pt-2 pb-1 border-b border-white/6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-semibold text-white/25 uppercase tracking-widest mr-1">Quick</span>
              {quickPrefs.map(stat => {
                const def = STAT_DEFS.find(d => d.key === stat)
                if (!def) return null
                return (
                  <button key={stat}
                    onClick={() => handleStatTap(stat)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      selectedStat === stat
                        ? 'bg-blue-500 text-white border-blue-400/50'
                        : def.col === 'miss' ? 'border-red-500/25 text-red-300 bg-red-950/20'
                        : def.redTint ? 'border-red-500/20 text-red-300/70 bg-red-950/15'
                        : 'border-white/12 text-white/80 bg-white/6'
                    }`}
                    style={{ touchAction: 'manipulation' }}>
                    {def.label}
                  </button>
                )
              })}
              <button onClick={() => setEditingPrefs(true)}
                className="ml-auto text-[9px] text-white/25 hover:text-white/50 border border-white/8 rounded px-1.5 py-1 transition-all">
                Edit
              </button>
            </div>
          </div>
        )}

        {/* ── Pref editor: toggle which stats appear in quick bar ── */}
        {editingPrefs && (
          <div className="shrink-0 px-4 pt-2 pb-2 border-b border-white/6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Quick-stat pins</span>
              <button onClick={() => setEditingPrefs(false)}
                className="text-[10px] text-[#c66a3e] hover:text-[#e07a4a] font-medium">Done</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAT_DEFS.map(def => (
                <button key={def.key}
                  onClick={() => togglePref(def.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    quickPrefs.includes(def.key)
                      ? 'bg-[rgba(198,106,62,0.18)] border-[rgba(198,106,62,0.40)] text-[#c66a3e]'
                      : 'border-white/10 text-white/40 hover:text-white/70'
                  }`}
                  style={{ touchAction: 'manipulation' }}>
                  {def.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(!quickPrefs.length && !editingPrefs) && (
          <div className="shrink-0 px-4 pt-2 flex justify-end">
            <button onClick={() => setEditingPrefs(true)}
              className="text-[9px] text-white/20 hover:text-white/40 underline underline-offset-2">Pin quick stats</button>
          </div>
        )}

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
                      <span className="text-white/50 shrink-0">{e.player_number !== 'OPP' ? e.player_name.split(' ')[0] : 'Opponent'}</span>
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



        {/* ── Court shot capture — visible when a shot stat is selected ── */}
        {showCourtCapture && (
          <div className="shrink-0 border-t border-white/8 px-4 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(238,233,223,0.50)' }}>Tap court to place shot</span>
              {stagedShot
                ? <span className="text-[10px] font-semibold" style={{ color: '#c66a3e' }}>✓ Location set</span>
                : <span className="text-[10px]" style={{ color: 'rgba(238,233,223,0.35)' }}>Optional</span>}
            </div>
            <svg viewBox="0 0 50 47" role="button" tabIndex={0} aria-label="Shot location. Click court or use arrow keys to position the shot."
              onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;e.preventDefault();setStagedShot(p=>{const x=p?.x??.5,y=p?.y??.5;return{x:Math.max(0,Math.min(1,x+(e.key==='ArrowRight'?.025:e.key==='ArrowLeft'?-.025:0))),y:Math.max(0,Math.min(1,y+(e.key==='ArrowDown'?.025:e.key==='ArrowUp'?-.025:0)))}})}}
              className="w-full rounded-lg cursor-crosshair"
              style={{ background: '#1a1d23', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 110, display: 'block' }}
              onClick={handleCourtTap}>
              <rect x="1" y="1" width="48" height="45" rx="1" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <rect x="16" y="1" width="18" height="19" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <circle cx="25" cy="20" r="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <path d="M 4 1 Q 4 35 25 38 Q 46 35 46 1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
              <circle cx="25" cy="5" r="1.2" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />
              {stagedShot && (
                <circle cx={1 + stagedShot.x * 48} cy={1 + stagedShot.y * 45}
                  r="1.8" fill="#c66a3e" stroke="#e07a4a" strokeWidth="0.4"
                  style={{ pointerEvents: 'none' }} />
              )}
            </svg>
            {stagedShot && (
              <button onClick={() => setStagedShot(null)}
                className="mt-1 w-full text-center text-[10px]"
                style={{ color: 'rgba(238,233,223,0.40)' }}>Clear location</button>
            )}
          </div>
        )}

        {/* ── Step 2 + Players — also NOT scrollable ── */}
        <div className="shrink-0 border-t border-white/8">
          <div className="px-5 py-2">
            <span className="text-sm font-semibold">
              <span className={selectedStat ? 'text-[#c66a3e]' : 'text-white/30'}>2 · </span>
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
                    onClick={() => { if (enabled) handlePlayerTap(p) }}
                    disabled={!enabled}
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

// ── Box score calculation helpers ──────────────────────────────────────────

function calcPts(entries: StatEntry[]): number {
  let pts = 0
  for (const e of entries) {
    if (e.stat_type === '2M')  pts += 2
    else if (e.stat_type === '3M')  pts += 3
    else if (e.stat_type === 'FTM') pts += 1
  }
  return pts
}

function countStat(entries: StatEntry[], stat: StatType): number {
  return entries.filter((e) => e.stat_type === stat).length
}

function pct(made: number, att: number): string {
  if (att === 0) return '-'
  return Math.round((made / att) * 100) + '%'
}

interface BoxRow {
  fg: string; fgPct: string
  threePt: string; threePct: string
  ft: string; ftPct: string
  oreb: number; dreb: number
  def: number; foul: number
  stl: number; to: number
  blk: number; ast: number
  pts: number
}

function calcBoxRow(entries: StatEntry[]): BoxRow {
  const twoM  = countStat(entries, '2M')
  const twoX  = countStat(entries, '2X')
  const threeM = countStat(entries, '3M')
  const threeX = countStat(entries, '3X')
  const ftm   = countStat(entries, 'FTM')
  const ftx   = countStat(entries, 'FTX')
  return {
    fg:      `${twoM + threeM}-${twoM + twoX + threeM + threeX}`,
    fgPct:   pct(twoM + threeM, twoM + twoX + threeM + threeX),
    threePt: `${threeM}-${threeM + threeX}`,
    threePct: pct(threeM, threeM + threeX),
    ft:      `${ftm}-${ftm + ftx}`,
    ftPct:   pct(ftm, ftm + ftx),
    oreb:    countStat(entries, 'OREB'),
    dreb:    countStat(entries, 'DREB'),
    def:     countStat(entries, 'DEF'),
    foul:    countStat(entries, 'FOUL'),
    stl:     countStat(entries, 'STL'),
    to:      countStat(entries, 'TO'),
    blk:     countStat(entries, 'BLK'),
    ast:     countStat(entries, 'AST'),
    pts:     calcPts(entries),
  }
}

const BOX_HEADERS = [
  'fg', 'fg%', '3pt', '3pt%', 'ft', 'ft%',
  'oreb', 'dreb', 'def', 'foul', 'stl', 'to', 'blk', 'ast', 'pts',
] as const

function renderBoxRow(row: BoxRow, highlight = false) {
  const cells = [
    row.fg, row.fgPct, row.threePt, row.threePct, row.ft, row.ftPct,
    row.oreb, row.dreb, row.def, row.foul, row.stl, row.to, row.blk, row.ast, row.pts,
  ]
  return cells.map((v, i) => {
    const isZero = v === 0 || v === '-' || v === '0-0' || v === '0%'
    const isPts  = i === cells.length - 1
    return (
      <td key={i} className="text-center px-1.5 py-2">
        <span className={`${
          isPts ? 'font-bold text-sm' : 'text-xs'
        } ${
          isZero ? 'text-white/55' : highlight ? 'text-white' : 'text-white/85'
        }`}>{String(v)}</span>
      </td>
    )
  })
}

// ─── Stats Event List ────────────────────────────────────────────────────────
// Expandable per-player event list with seek + delete
function PlayerEventList({
  entries,
  onSeek,
  onDeleteEntry,
}: {
  entries: StatEntry[]
  onSeek: (ms: number) => void
  onDeleteEntry: (id: string) => void
}) {
  if (entries.length === 0) return null
  const sorted = [...entries].sort((a, b) => a.video_time_ms - b.video_time_ms)
  return (
    <div className="space-y-0.5 mt-1">
      {sorted.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 px-2 py-1 rounded-lg group hover:bg-[rgba(198,106,62,0.08)]">
          <button
            onClick={() => onSeek(entry.video_time_ms)}
            className="flex items-center gap-2 flex-1 text-left min-w-0"
            aria-label={`Seek to ${STAT_DEFS.find(d => d.key === entry.stat_type)?.label ?? entry.stat_type} at ${msToDisplay(entry.video_time_ms)}`}
          >
            <Play className="w-3 h-3 text-white/30 group-hover:text-[#c66a3e] shrink-0" aria-hidden />
            <span className="font-mono text-white/40 tabular-nums text-[11px] shrink-0 w-10">{msToDisplay(entry.video_time_ms)}</span>
            <span className="text-[11px] font-semibold truncate" style={{ color: '#c66a3e' }}>
              {STAT_DEFS.find(d => d.key === entry.stat_type)?.label ?? entry.stat_type}
            </span>
          </button>
          <button
            onClick={() => onDeleteEntry(entry.id)}
            aria-label={`Delete ${STAT_DEFS.find(d => d.key === entry.stat_type)?.label ?? entry.stat_type} at ${msToDisplay(entry.video_time_ms)}`}
            className="p-1 rounded text-white/20 hover:text-red-400 shrink-0 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <X className="w-3 h-3" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Stats Panel: desktop table + phone grouped cards ─────────────────────────
// Desktop (md+): sticky-player-column table, full stat columns, no horizontal scroll.
// Phone: stacked player cards with grouped stat pill counts, expandable event list.
function BoxScorePanel({
  players,
  statEntries,
  onSeek,
  onDeleteEntry,
}: {
  players: Player[]
  statEntries: StatEntry[]
  onSeek: (ms: number) => void
  onDeleteEntry: (id: string) => void
}) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Add players to your roster first.</p>
      </div>
    )
  }

  if (statEntries.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart className="w-8 h-8 mx-auto text-white/15 mb-2" />
        <p className="text-xs text-white/30">No stats yet.</p>
        <p className="text-xs text-white/50 mt-1">Tap <strong className="text-white/40">Tag Stat</strong> below the video to start tagging.</p>
      </div>
    )
  }

  const totals: Record<string, StatEntry[]> = {}
  for (const player of players) {
    totals[player.id] = statEntries.filter(e => e.player_id === player.id)
  }
  const teamEntries = statEntries.filter(e => e.player_id !== null && e.player_id !== OPP_ID)
  const oppEntries  = statEntries.filter(e => e.player_id === null || e.player_id === OPP_ID)

  const allRows: Array<{ id: string; label: string; entries: StatEntry[]; isTotal?: boolean; isOpp?: boolean; player?: Player }> = [
    ...players.map(p => ({ id: p.id, label: `#${p.number ?? '?'} ${p.name.split(' ')[0]}`, entries: totals[p.id] ?? [], player: p })),
    { id: '__team__', label: 'Team', entries: teamEntries, isTotal: true },
    ...(oppEntries.length > 0 ? [{ id: '__opp__', label: 'OPP', entries: oppEntries, isOpp: true }] : []),
  ]

  return (
    <>
      {/* ── Desktop table (md+) ── */}
      <div className="hidden lg:block">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-white/65 font-medium pb-2 pr-4 min-w-[110px]">Player</th>
              {BOX_HEADERS.map(h => (
                <th key={h} className="text-center text-white/65 font-medium pb-2 px-1 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {allRows.map(row => {
              const box = calcBoxRow(row.entries)
              const isExpanded = expandedPlayerId === row.id
              const canExpand = !row.isTotal && !row.isOpp && row.entries.length > 0
              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => canExpand && setExpandedPlayerId(isExpanded ? null : row.id)}
                    tabIndex={canExpand?0:undefined}
                    aria-expanded={canExpand?isExpanded:undefined}
                    onKeyDown={e=>{if(canExpand&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setExpandedPlayerId(isExpanded?null:row.id)}}}
                    className={`transition-colors ${canExpand ? 'cursor-pointer hover:bg-white/3' : ''} ${row.isTotal ? 'border-t-2 border-white/12' : ''} ${row.isOpp ? 'bg-red-950/10' : ''}`}
                  >
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1 min-w-0">
                        {canExpand && (isExpanded
                          ? <ChevronUp className="w-3 h-3 text-white/30 shrink-0" />
                          : <ChevronDown className="w-3 h-3 text-white/20 shrink-0" />
                        )}
                        <span className={`font-medium truncate text-[11px] ${row.isOpp ? 'text-red-400/80' : row.isTotal ? 'text-white/60 uppercase tracking-wide' : 'text-white/80'}`}>
                          {row.label}
                        </span>
                      </div>
                    </td>
                    {renderBoxRow(box, row.isOpp)}
                  </tr>
                  {isExpanded && row.entries.length > 0 && (
                    <tr>
                      <td colSpan={BOX_HEADERS.length + 1} className="pb-2 pt-0 pl-4">
                        <PlayerEventList entries={row.entries} onSeek={onSeek} onDeleteEntry={onDeleteEntry} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        <p className="text-[10px] text-white/20 pt-2">
          Click a player row to expand their event timeline. Click a timestamp to jump to that moment.
        </p>
      </div>

      {/* ── Phone: grouped player cards (< md) ── */}
      <div className="lg:hidden space-y-2">
        {allRows.map(row => {
          const box = calcBoxRow(row.entries)
          const isExpanded = expandedPlayerId === row.id
          const canExpand = !row.isTotal && !row.isOpp && row.entries.length > 0

          // Grouped stat pills: shooting, rebounds, playmaking, negative
          const groups: Array<{ label: string; items: Array<{ key: string; val: string | number; dim?: boolean }> }> = [
            {
              label: 'Shooting',
              items: [
                { key: 'PTS', val: box.pts },
                { key: 'FG', val: box.fg, dim: box.fg === '0-0' },
                { key: 'FG%', val: box.fgPct },
                { key: '3PT', val: box.threePt, dim: box.threePt === '0-0' },
                { key: '3PT%', val: box.threePct },
                { key: 'FT', val: box.ft, dim: box.ft === '0-0' },
                { key: 'FT%', val: box.ftPct },
              ],
            },
            {
              label: 'Other',
              items: [
                { key: 'OREB', val: box.oreb }, { key: 'DREB', val: box.dreb }, { key: 'DEF', val: box.def },
                { key: 'AST', val: box.ast, dim: box.ast === 0 },
                { key: 'STL', val: box.stl, dim: box.stl === 0 },
                { key: 'BLK', val: box.blk, dim: box.blk === 0 },
                { key: 'TO', val: box.to, dim: box.to === 0 },
                { key: 'FOUL', val: box.foul, dim: box.foul === 0 },
              ],
            },
          ]

          return (
            <div key={row.id}
              className={`rounded-xl border px-3 py-2.5 ${row.isOpp ? 'border-red-500/20 bg-red-950/10' : row.isTotal ? 'border-white/12 bg-white/3' : 'border-white/8 bg-white/2'}`}>
              <button
                className="w-full flex items-center gap-2 text-left"
                onClick={() => canExpand && setExpandedPlayerId(isExpanded ? null : row.id)}
                aria-expanded={canExpand ? isExpanded : undefined}
                disabled={!canExpand}
              >
                <span className={`font-semibold text-sm flex-1 min-w-0 truncate ${row.isOpp ? 'text-red-400' : row.isTotal ? 'text-white/60' : 'text-white/90'}`}>
                  {row.label}
                </span>
                <span className="font-black text-lg text-white tabular-nums">{box.pts}</span>
                <span className="text-[10px] text-white/30">PTS</span>
                {canExpand && (
                  <span className="ml-1 text-white/30">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
                )}
              </button>

              {/* Stat groups */}
              <div className="mt-2 space-y-1.5">
                {groups.map(g => (
                  <div key={g.label} className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-white/60 uppercase tracking-widest w-full">{g.label}</span>
                    {g.items.map(item => (
                      <span key={item.key}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${item.dim ? 'text-white/60' : 'bg-white/6 text-white/80'}`}>
                        <span className="text-white/65">{item.key}</span>
                        <span className={item.dim ? '' : 'font-semibold'}>{item.val}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Expanded event list */}
              {isExpanded && (
                <div className="mt-2 border-t border-white/6 pt-1">
                  <PlayerEventList entries={row.entries} onSeek={onSeek} onDeleteEntry={onDeleteEntry} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
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
          game_id: gameId,   // server expects snake_case
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
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-lg" style={{background:"#c66a3e",color:"#181917"}}
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
          <Loader2 className="w-8 h-8 animate-spin" style={{color:"#c66a3e"}} />
          <p className="text-sm text-white/50">Preparing upload…</p>
        </>
      )}

      {state.phase === 'uploading' && (
        <div className="w-full max-w-xs px-6 text-center">
          <div className="mb-3">
            <Loader2 className="w-7 h-7 animate-spin mx-auto" style={{color:"#c66a3e"}} />
          </div>
          <p className="text-sm text-white/70 mb-3">
            Uploading via {state.method === 'stream' ? 'Cloudflare Stream' : 'R2'}… {state.progress}%
          {state.phase === 'uploading' && state.partInfo && (
            <span className="text-xs text-white/30 block mt-0.5">{state.partInfo}</span>
          )}
          </p>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%`, background: '#c66a3e' }}
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
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4', game_id: gameId, fileSizeBytes: file.size }),
  })
  if (!createRes.ok) throw new Error(`Multipart create failed: ${createRes.status}: ${await createRes.text()}`)
  const { sessionId, playbackUrl } = await createRes.json()
  if (!sessionId) throw new Error(`Multipart create failed: no sessionId returned`)

  // Persist session for resume on reload
  try { sessionStorage.setItem(`upload_session_${gameId}`, JSON.stringify({ sessionId, filename: file.name, fileSizeBytes: file.size })) } catch {}

  const parts: { ETag: string; PartNumber: number }[] = []
  let bytesUploaded = 0
  const MAX_PART_RETRIES = 3
  let r2MayBeComplete = false // once true, never abort (R2 object may exist)

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      let etag: string | null = null
      for (let attempt = 0; attempt < MAX_PART_RETRIES; attempt++) {
        // Fresh signed URL each retry
        const partRes = await fetch('/api/filmroom/upload/multipart?action=part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, partNumber }),
        })
        if (!partRes.ok) {
          if (partRes.status >= 400 && partRes.status < 500) throw new Error(`Part sign failed: ${partRes.status}`)
          if (attempt === MAX_PART_RETRIES - 1) throw new Error(`Part sign failed after retries: ${partRes.status}`)
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        const { signedUrl } = await partRes.json()

        const result = await new Promise<{ ok: boolean; etag: string | null; status: number }>((resolve) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', signedUrl)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((bytesUploaded + e.loaded) / file.size * 100), `Part ${partNumber}/${totalParts}`)
            }
          }
          xhr.onload = () => {
            const rawEtag = xhr.getResponseHeader('ETag') ?? xhr.getResponseHeader('etag')
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, etag: rawEtag, status: xhr.status })
          }
          xhr.onerror = () => resolve({ ok: false, etag: null, status: 0 })
          xhr.send(chunk)
        })

        if (result.ok) {
          if (!result.etag) throw new Error(`Missing ETag on part ${partNumber} — upload cannot continue`)
          etag = result.etag
          break
        }
        if (result.status >= 400 && result.status < 500) throw new Error(`R2 PUT ${result.status} on part ${partNumber}`)
        if (attempt === MAX_PART_RETRIES - 1) throw new Error(`Part ${partNumber} failed after ${MAX_PART_RETRIES} retries`)
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      }

      if (!etag) throw new Error(`No ETag for part ${partNumber}`)
      parts.push({ ETag: etag, PartNumber: partNumber })
      bytesUploaded += chunk.size
      onProgress(Math.round(bytesUploaded / file.size * 100), `Part ${partNumber}/${totalParts} done`)
    }

    r2MayBeComplete = true // from here on, never abort
    // Complete: retry up to 3 times (handles lost HTTP responses after R2 completes)
    // Server returns idempotent success for already-complete sessions.
    // NEVER abort after attempting complete — R2 object may already exist.
    let completeOk = false
    let lastCompleteError = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      const completeRes = await fetch('/api/filmroom/upload/multipart?action=complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, parts, totalBytes: file.size }),
      })
      if (completeRes.ok) {
        const data = await completeRes.json()
        if (data.ok) { completeOk = true; break }
        // recoverable=true means attachment failed but R2 is done — retry complete
        if (data.recoverable === false) throw new Error(data.error ?? 'Upload superseded')
        lastCompleteError = data.error ?? 'Attachment failed'
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      } else if (completeRes.status >= 500) {
        // Server error — retry (R2 may have completed, DB attachment may have failed)
        lastCompleteError = `Complete server error ${completeRes.status}`
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      } else {
        // 4xx — non-recoverable
        const errData = await completeRes.json().catch(() => ({}))
        throw new Error(errData.error ?? `Complete failed: ${completeRes.status}`)
      }
    }
    if (!completeOk) throw new Error(`Complete failed after retries: ${lastCompleteError}`)

    try { sessionStorage.removeItem(`upload_session_${gameId}`) } catch {}
    return playbackUrl
  } catch (err) {
    try { sessionStorage.removeItem(`upload_session_${gameId}`) } catch {}
    // Abort only if R2 CompleteMultipartUpload was never called
    if (!r2MayBeComplete) {
      fetch('/api/filmroom/upload/multipart?action=abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {})
    }
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

// Video token cache: {src, type, expiresAt, refreshAfterSeconds}
let _videoTokenCache: { gameId: string; src: string; type: string; expiresAt: number; refreshAfterSeconds: number | null } | null = null

async function fetchVideoToken(gameId: string): Promise<{ src: string; type: string; refreshAfterSeconds: number | null }> {
  const res = await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Video token failed'), { status: res.status })
  }
  const data = await res.json()
  _videoTokenCache = {
    gameId,
    src: data.src,
    type: data.type,
    expiresAt: data.expiresInSeconds ? Date.now() + data.expiresInSeconds * 1000 : Infinity,
    refreshAfterSeconds: data.refreshAfterSeconds ?? null,
  }
  return { src: data.src, type: data.type, refreshAfterSeconds: data.refreshAfterSeconds ?? null }
}

function VideoPlayer({
  gameId,
  onTimeUpdate,
  onDurationChange,
  playerRef,
  isFullscreen,
}: {
  gameId: string
  onTimeUpdate: (ms: number) => void
  onDurationChange: (ms: number) => void
  playerRef: React.RefObject<HTMLVideoElement | null>
  isFullscreen?: boolean
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    // Recursive refresh loop: fires every refreshAfterSeconds, indefinitely.
    // Uses loadedmetadata event (not load()) to restore position after src swap.
    async function scheduleRefresh(afterSeconds: number) {
      if (cancelled) return
      refreshTimerRef.current = setTimeout(async () => {
        if (cancelled) return
        const v = playerRef.current
        const wasPlaying = v ? !v.paused : false
        const savedTime = v ? v.currentTime : 0
        try {
          const { src: newSrc, refreshAfterSeconds } = await fetchVideoToken(gameId)
          if (cancelled) return
          setResolvedSrc(newSrc)
          if (v) {
            // Restore position on loadedmetadata — src change triggers async load
            const restoreOnMetadata = () => {
              v.currentTime = savedTime
              if (wasPlaying) v.play().catch(() => {})
              v.removeEventListener('loadedmetadata', restoreOnMetadata)
            }
            v.addEventListener('loadedmetadata', restoreOnMetadata)
            v.src = newSrc
            v.load() // non-blocking; loadedmetadata fires when ready
          }
          // Schedule next refresh cycle
          if (refreshAfterSeconds) scheduleRefresh(refreshAfterSeconds)
        } catch {
          // Token refresh failed — keep playing with old URL until it expires
          // Retry refresh in 60s
          if (!cancelled) scheduleRefresh(60)
        }
      }, afterSeconds * 1000)
    }

    async function load() {
      try {
        const { src, refreshAfterSeconds } = await fetchVideoToken(gameId)
        if (cancelled) return
        setResolvedSrc(src)
        setTokenError(null)
        if (refreshAfterSeconds) scheduleRefresh(refreshAfterSeconds)
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { status?: number }).status
        setTokenError(
          status === 401 ? 'Please sign in to watch this video' :
          status === 403 ? 'You do not have access to this video' :
          'Failed to load video'
        )
      }
    }

    load()
    return () => {
      cancelled = true
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [gameId, playerRef])

  if (tokenError) return (
    <div className={`flex items-center justify-center bg-black text-white/40 text-sm ${
      isFullscreen ? 'w-full h-full' : 'w-full aspect-video'
    }`}>{tokenError}</div>
  )

  if (!resolvedSrc) return (
    <div className={`flex items-center justify-center bg-black ${
      isFullscreen ? 'w-full h-full' : 'w-full aspect-video'
    }`}>
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" aria-label="Loading video" />
    </div>
  )

  return (
    <video
      ref={playerRef}
      src={resolvedSrc ?? ''}
      // In fullscreen: fill the flex container height; in normal layout: use aspect-video
      // but cap height so transport bar stays on screen without scrolling
      className={isFullscreen
        ? 'w-full h-full object-contain bg-black'
        : 'w-full object-contain bg-black'
      }
      style={isFullscreen ? undefined : { maxHeight: 'calc(100vh - 48px - 130px)' }}
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
  isFullscreen, onStatTap, coachingTools,
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
  onStatTap?: () => void
  coachingTools?: React.ReactNode
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
            <div className="absolute top-0 h-full rounded-full"
              style={{ left: `${inPct}%`, width: `${outPct - inPct}%`, background: 'rgba(198,106,62,0.35)' }} />
          )}
          {/* Progress */}
          <div className="absolute top-0 left-0 h-full rounded-full transition-none"
            style={{ width: `${pct}%`, background: '#c66a3e' }} />
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
      <div className="flex flex-wrap items-center gap-1">
        {/* Frame back */}
        <button onClick={() => onFrameStep(-1)}
          className="p-2 min-w-9 min-h-11 text-white/65 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Previous frame (← arrow)">
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Skip -5s */}
        <button onClick={() => onSkip(-5000)}
          className="px-2 py-3 min-w-9 min-h-11 text-xs text-white/65 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Back 5s (J)">
          -5s
        </button>

        {/* Play/Pause */}
        <button onClick={onPlayPause}
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors" style={{background:"#c66a3e",color:"#181917"}} title="Play/Pause (Space)">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Skip +5s */}
        <button onClick={() => onSkip(5000)}
          className="px-2 py-3 min-w-9 min-h-11 text-xs text-white/65 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Forward 5s (L)">
          +5s
        </button>

        {/* Frame fwd */}
        <button onClick={() => onFrameStep(1)}
          className="p-2 min-w-9 min-h-11 text-white/65 hover:text-white rounded-lg hover:bg-white/6 transition-all" title="Next frame (→ arrow)">
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {coachingTools}
        <div className="hidden sm:block flex-1" />

        {/* Timecode */}
        <span className="w-full sm:w-auto whitespace-nowrap font-mono text-xs text-white/65 tabular-nums">
          {msToTimecode(currentMs)} / {msToTimecode(durationMs)}
        </span>

        {/* Mark In / Out */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 sm:ml-2">
          <button onClick={onMarkIn}
            className={`flex items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all ${markIn != null ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark In point (I)">
            <Scissors className="w-3 h-3" /> IN
          </button>
          <button onClick={onMarkOut}
            className={`flex items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all ${markOut != null ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white hover:bg-white/6'}`}
            title="Mark Out point (O)">
            OUT <Scissors className="w-3 h-3" />
          </button>
          {onStatTap && (
            <button
              onClick={onStatTap}
              className="flex items-center gap-1.5 px-2 py-3 rounded-lg active:scale-95 text-xs font-semibold transition-all ml-1 border"
              style={{ touchAction: 'manipulation', background: '#c66a3e', color: '#181917', borderColor: 'rgba(198,106,62,0.5)' }}
            >
              <BarChart className="w-3 h-3" /> Tag Stat
            </button>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="hidden md:flex flex-wrap gap-3 text-[10px] text-white/50 border-t border-white/5 pt-2">
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
  gameId, teamId, startMs, endMs, players, drawingData, videoDurationMs,
  onClose, onSave,
}: {
  gameId: string
  teamId: string
  startMs: number
  endMs: number
  players: Player[]
  drawingData?: DrawingData | null
  videoDurationMs:number
  onClose: () => void
  onSave: (clip: Clip) => void
}) {
  const [range,setRange]=useState({start:startMs/1000,end:endMs/1000})
  const [form, setForm] = useState({
    title: '', category: 'offense' as ClipCategory,
    tags: '', is_highlight: false, player_ids: [] as string[],
    coaching_note: '', play_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!Number.isFinite(range.start)||!Number.isFinite(range.end)||range.start<0||range.end<=range.start||(videoDurationMs>0&&range.end*1000>videoDurationMs)){setError('Choose a valid start and end within the video.');return}
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/filmroom/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          team_id: teamId,
          start_time_ms: Math.round(range.start*1000),
          end_time_ms: Math.round(range.end*1000),
          title: form.title || `${msToTimecode(range.start*1000)} – ${msToTimecode(range.end*1000)}`,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: form.category,
          is_highlight: form.is_highlight,
          player_ids: form.player_ids,
          drawing_data: drawingData ?? null,
          coaching_note: form.coaching_note.trim() || null,
          play_type: form.play_type || null,
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
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Save Clip</h2>
            <p className="text-xs text-white/40 mt-0.5">{msToTimecode(range.start*1000)} → {msToTimecode(range.end*1000)} ({formatDuration(range.start*1000, range.end*1000)})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">{(['start','end'] as const).map(k=><label key={k} className="text-xs text-white/65">{k==='start'?'Clip start (seconds)':'Clip end (seconds)'}<input type="number" min={0} step={.01} required value={range[k]} onChange={e=>setRange(r=>({...r,[k]:Number(e.target.value)}))} className="block w-full bg-black/30 border border-white/15 rounded-md p-2 mt-1 text-[#eee9df]"/></label>)}</div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Clip Title</label>
            <input type="text" placeholder="e.g. Pick and roll coverage"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
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
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
          </div>

          {players.length > 0 && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Tag Players</label>
              <div className="flex flex-wrap gap-1.5">
                {players.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlayer(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs transition-all border ${form.player_ids.includes(p.id) ? 'bg-[rgba(198,106,62,0.15)] text-[#eee9df] border-[rgba(198,106,62,0.35)]' : 'border-white/8 text-white/50 hover:text-white/80'}`}>
                    #{p.number} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coaching note */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Coaching note <span className="text-white/25">(optional)</span></label>
            <textarea
              value={form.coaching_note}
              onChange={e => setForm(f => ({ ...f, coaching_note: e.target.value }))}
              placeholder="What to watch for…"
              rows={2}
              maxLength={500}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20 resize-none"
            />
          </div>

          {/* Play type */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Play type</label>
            <div className="flex flex-wrap gap-1.5">
              {PLAY_TYPES.map(pt => (
                <button key={pt} type="button"
                  onClick={() => setForm(f => {const next=f.play_type===pt?'':pt;return{...f,play_type:next,tags:Array.from(new Set([...f.tags.split(',').map(t=>t.trim()).filter(t=>t&&t!==f.play_type),...(next?[next]:[])])).join(', ')}})}
                  className={`px-2 py-1 rounded-lg text-xs transition-all border ${
                    form.play_type === pt
                      ? 'border-[rgba(198,106,62,0.5)] bg-[rgba(198,106,62,0.15)] text-[#c66a3e]'
                      : 'border-white/8 text-white/40 hover:text-white/70'
                  }`}>
                  {pt}
                </button>
              ))}
            </div>
          </div>

          <CustomClipTags selected={form.tags.split(',').map(t=>t.trim())} toggle={tag=>setForm(f=>{const tags=f.tags.split(',').map(t=>t.trim()).filter(Boolean);return {...f,tags:(tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag]).join(', ')}})}/>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.is_highlight}
              onChange={e => setForm(f => ({ ...f, is_highlight: e.target.checked }))}
              aria-label="Mark as highlight"
            />
            <span
              aria-hidden
              className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${form.is_highlight ? 'bg-yellow-500 border-yellow-500' : 'border-white/20'}`}>
              {form.is_highlight && <Star className="w-2.5 h-2.5 text-black fill-black" aria-hidden />}
            </span>
            <span className="text-xs text-white/60">Mark as highlight</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50" style={{background:"#c66a3e",color:"#181917"}}>
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
            <div key={c.id} className={`rounded-xl px-3 py-2 text-xs ${c.author_role === 'coach' ? 'bg-[rgba(198,106,62,0.10)] border border-[rgba(198,106,62,0.18)]' : 'bg-white/4 border border-white/8'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-medium ${c.author_role === 'coach' ? 'text-[#c66a3e]' : 'text-white/70'}`}>{c.author_name}</span>
                <span className="text-white/25">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-white/70">{c.text}</p>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="Add coaching note..."
              className="flex-1 bg-black/20 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[rgba(198,106,62,0.40)] placeholder-white/20" />
            <button onClick={submit} disabled={loading || !text.trim()}
              className="p-1.5 rounded-xl disabled:opacity-40 transition-colors" style={{background:"#c66a3e",color:"#181917"}}>
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
  clip, isActive, onSelect, onDelete, onJumpTo, onAddToPlaylist,
}: {
  clip: Clip
  isActive: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  onJumpTo: (ms: number) => void
  onAddToPlaylist?: (clipId: string) => void
}) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${isActive ? 'border-[rgba(198,106,62,0.40)] bg-[rgba(198,106,62,0.08)]' : 'border-white/6 bg-white/3 hover:bg-white/5'}`}>
      <div className="p-3 cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onJumpTo(clip.start_time_ms) }}
            className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-white/8 hover:bg-[rgba(198,106,62,0.25)] flex items-center justify-center transition-colors"
            aria-label={`Jump to clip: ${clip.title}`}>
            <Play className="w-2.5 h-2.5 ml-0.5" aria-hidden />
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
            {onAddToPlaylist && (
              <button onClick={(e) => { e.stopPropagation(); onAddToPlaylist(clip.id) }}
                aria-label={`Add ${clip.title} to playlist`}
                title="Add to playlist"
                className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
                <Plus className="w-3 h-3" aria-hidden />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setShowComments(s => !s) }}
              aria-label={showComments ? 'Hide comments' : 'Show comments'}
              aria-expanded={showComments}
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all">
              <MessageSquare className="w-3 h-3" aria-hidden />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(clip.id) }}
              aria-label={`Delete clip: ${clip.title}`}
              className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3 h-3" aria-hidden />
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
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20 mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50" style={{background:"#c66a3e",color:"#181917"}}>
            {loading && <Loader2 className="w-3 h-3 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bookmark Bar ─────────────────────────────────────────────────────────────
// Quarter/game-clock bookmarks. UI + local state only; persistence goes via
// root's PATCH /api/filmroom/games/:id with body { review_meta: { bookmarks } }.

type GameBookmark = {
  id: string
  label: string
  period: string
  clock: string
  position_ms: number
}

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'OT', 'OT2'] as const

function BookmarkBar({
  bookmarks,
  currentMs,
  durationMs,
  pending,
  error,
  onSeek,
  onAdd,
  onDelete, adding, setAdding,
}: {
  adding: boolean
  setAdding: (value: boolean) => void
  bookmarks: GameBookmark[]
  currentMs: number
  durationMs: number
  pending: boolean
  error: string | null
  onSeek: (ms: number) => void
  onAdd: (bm: GameBookmark) => void
  onDelete: (id: string) => void
}) {
  const [form, setForm] = useState({ label: '', period: 'Q1' as typeof PERIODS[number], clock: '' })

  // Disable add while a mutation is in flight
  const canAdd = !pending

  const commit = () => {
    if (!canAdd) return
    const label = form.label.trim() || `${form.period}${form.clock ? ` ${form.clock}` : ''}`
    const bm: GameBookmark = {
      id: Math.random().toString(36).slice(2),
      label,
      period: form.period,
      clock: form.clock.trim(),
      position_ms: currentMs,
    }
    onAdd(bm)
    setForm({ label: '', period: 'Q1', clock: '' })
    setAdding(false)
  }

  return (
    <div className="mt-2 px-1">
      {/* Pending / error feedback */}
      {pending && (
        <p className="text-[9px] text-white/30 flex items-center gap-1 mb-1">
          <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden /> Saving…
        </p>
      )}
      {error && !pending && (
        <p role="alert" className="text-[10px] text-red-400 mb-1">{error}</p>
      )}
      {/* Scrubber bookmark markers */}
      {durationMs > 0 && bookmarks.length > 0 && (
        <div className="relative h-1 mb-2">
          {bookmarks.map(bm => {
            const pct = Math.min(100, (bm.position_ms / durationMs) * 100)
            return (
              <button
                key={bm.id}
                onClick={() => onSeek(bm.position_ms)}
                title={`${bm.label} — ${msToDisplay(bm.position_ms)}`}
                aria-label={`Seek to bookmark: ${bm.label}`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-4 rounded-sm bg-yellow-400/80 hover:bg-yellow-300 transition-colors z-10"
                style={{ left: `${pct}%` }}
              />
            )
          })}
        </div>
      )}

      {/* Bookmark chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {bookmarks.map(bm => (
          <div key={bm.id}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 group">
            <button
              onClick={() => onSeek(bm.position_ms)}
              className="text-[11px] text-yellow-300/90 hover:text-yellow-200 font-medium"
              aria-label={`Jump to ${bm.label} at ${msToDisplay(bm.position_ms)}`}
            >
              {bm.period && <span className="text-yellow-500/70 mr-0.5">{bm.period}</span>}
              {bm.clock && <span className="font-mono mr-0.5">{bm.clock}</span>}
              {bm.label}
            </button>
            <button
              onClick={() => onDelete(bm.id)}
              aria-label={`Delete bookmark: ${bm.label}`}
              className="min-h-9 min-w-9 text-yellow-500/70 hover:text-red-400 transition-all"
            >
              <X className="w-2.5 h-2.5" aria-hidden />
            </button>
          </div>
        ))}

        {/* Inline add form */}
        {adding && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={form.period}
              onChange={e => setForm(f => ({ ...f, period: e.target.value as typeof PERIODS[number] }))}
              className="bg-black/40 border border-white/10 rounded text-[11px] px-1.5 py-1 text-white/70 outline-none focus:border-yellow-500/40"
              aria-label="Period"
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={form.clock}
              onChange={e => setForm(f => ({ ...f, clock: e.target.value }))}
              placeholder="4:32"
              aria-label="Game clock (optional)"
              className="w-14 bg-black/40 border border-white/10 rounded text-[11px] px-1.5 py-1 text-white/70 placeholder-white/20 outline-none focus:border-yellow-500/40 font-mono"
            />
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Note (optional)"
              aria-label="Bookmark label" maxLength={120}
              className="w-28 bg-black/40 border border-white/10 rounded text-[11px] px-1.5 py-1 text-white/70 placeholder-white/20 outline-none focus:border-yellow-500/40"
            />
            <button onClick={commit}
              className="px-2 py-1 rounded text-[11px] font-semibold"
              style={{ background: '#c66a3e', color: '#181917' }}>Save</button>
            <button onClick={() => setAdding(false)}
              className="px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/70 border border-white/8">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FRAME_MS = 33 // ~30fps

type PanelTab = 'clips' | 'stats' | 'roster' | 'shot-chart'

export default function GameFilmRoom() {
  const params = useParams()
  const gameId = params.id as string
  const searchParams = useSearchParams()

  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  // Initial seek: one-shot ref so token refreshes / retries don't re-seek
  const initialSeekDoneRef = useRef(false)
  const onDrawingChange=useCallback((data:DrawingData)=>setDrawingData({...data,time_ms:Math.round((videoRef.current?.currentTime??0)*1000)}),[])
  const [game, setGame] = useState<Game | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [clipTag,setClipTag]=useState('')
  const [clipCategory,setClipCategory]=useState('')
  const [clipPlayer,setClipPlayer]=useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [gameError, setGameError] = useState<'not_found' | 'error' | null>(null)
  const [retryKey, setRetryKey] = useState(0)

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
  const [statsFullscreen, setStatsFullscreen] = useState(false)
  const [statEntries, setStatEntries] = useState<StatEntry[]>([])
  const [sessionStatEntries, setSessionStatEntries] = useState<StatEntry[]>([])

  // Courtside additions
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [addingBookmark, setAddingBookmark] = useState(false)
  const [showPresentation, setShowPresentation] = useState(false)
  const [presentationClips, setPresentationClips] = useState<PresentationClip[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<string | null>(null) // clipId
  const [instantClipPulse, setInstantClipPulse] = useState(false)

  // Section-level error states for retry without full page reload
  const [clipsError, setClipsError] = useState(false)
  const [playersError, setPlayersError] = useState(false)
  const [statsError, setStatsError] = useState(false)
  const [sectionRetryKey, setSectionRetryKey] = useState(0)

  // Bookmarks (from game.review_meta — read on load, mutations queued to root API)
  type GameBookmark = NonNullable<NonNullable<Game['review_meta']>['bookmarks'][number]>
  const [bookmarks, setBookmarks] = useState<GameBookmark[]>([])
  const [showBookmarkBar, setShowBookmarkBar] = useState(false)

  // Undo/Redo stacks (lifted from StatEntryPanel so Redo can re-POST)
  const undoStack = useRef<StatEntry[]>([])
  const redoStack = useRef<StatEntry[]>([])
  const undoRedoInFlight = useRef(false) // prevents double-click races
  const [undoPending, setUndoPending] = useState(false)
  const [redoPending, setRedoPending] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)
  const [redoError, setRedoError] = useState<string | null>(null)

  // Authenticated user ID — loaded once on mount for per-user localStorage scoping
  const [userId, setUserId] = useState('')

  // Load authenticated user ID once on mount (for per-user localStorage key scoping)
  useEffect(() => {
    import('@/lib/filmroom-supabase-browser').then(({ getSupabaseBrowser }) => {
      getSupabaseBrowser().auth.getUser().then(({ data }) => {
        if (data?.user?.id) setUserId(data.user.id)
      })
    })
  }, [])

  // Bookmark optimistic state — serialize mutations to avoid lost-update races
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  // Serialization ref: latest committed bookmark list from a successful PATCH
  const lastCommittedBookmarks = useRef<GameBookmark[]>([])

  // Load data
  useEffect(() => {
    // Reset state for new game/retry so stale data never renders
    setGame(null)
    setClips([])
    setPlayers([])
    setStatEntries([])
    setLoading(true)
    setGameError(null)
    setClipsError(false)
    setPlayersError(false)
    setStatsError(false)
    initialSeekDoneRef.current = false

    const controller = new AbortController()
    const { signal } = controller

    async function loadGame() {
      try {
        const gameRes = await fetch(`/api/filmroom/games/${gameId}`, { signal })
        if (gameRes.status === 401) {
          if (!signal.aborted) router.replace('/filmroom/login')
          return
        }
        if (gameRes.status === 403 || gameRes.status === 404) {
          if (!signal.aborted) { setGameError('not_found'); setLoading(false) }
          return
        }
        if (!gameRes.ok) {
          if (!signal.aborted) { setGameError('error'); setLoading(false) }
          return
        }
        const g = await gameRes.json()
        // Guard: if response JSON is not a valid game object (e.g. error body used as game)
        if (!g || typeof g !== 'object' || !g.id) {
          if (!signal.aborted) { setGameError('error'); setLoading(false) }
          return
        }

        // Fetch sections independently so one failure doesn't blank everything
        const [cRes, pRes, seRes] = await Promise.all([
          fetch(`/api/filmroom/clips?game_id=${gameId}`, { signal }),
          fetch(`/api/filmroom/players`, { signal }),
          fetch(`/api/filmroom/stat-entries?game_id=${gameId}`, { signal }),
        ])

        if (signal.aborted) return

        const c = cRes.ok ? await cRes.json() : null
        const p = pRes.ok ? await pRes.json() : null
        const se = seRes.ok ? await seRes.json() : null

        if (!cRes.ok) setClipsError(true)
        if (!pRes.ok) setPlayersError(true)
        if (!seRes.ok) setStatsError(true)

        setGame(g)
        // Seed bookmarks from review_meta
        if (g.review_meta?.bookmarks) {
          setBookmarks(g.review_meta.bookmarks)
          lastCommittedBookmarks.current = g.review_meta.bookmarks
        }
        setClips(Array.isArray(c) ? c : [])
        setPlayers(Array.isArray(p) ? p : [])
        if (Array.isArray(se)) {
          setStatEntries(se.map((raw: RawStatEntry) => rawToEntry(raw)))
        }
        setLoading(false)
      } catch (err) {
        if (signal.aborted) return // normal cleanup, not an error
        setGameError('error')
        setLoading(false)
      }
    }
    loadGame()
    return () => controller.abort()
  }, [gameId, router, retryKey])

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

  // Close stat panel: only resume if video was playing before panel opened
  const closeStatPanel = useCallback(() => {
    setShowStatPanel(false)
    // isPlaying tracks state before panel opened (openStatPanel paused if playing)
    // Re-check: only resume if we were actually playing before
    if (isPlaying) {
      const video = videoRef.current
      if (video && video.src) video.play().catch(() => {})
    }
  }, [isPlaying])

  // Log a stat entry — push to undo stack, clear redo stack
  const handleLogEntry = useCallback((entry: StatEntry) => {
    setStatEntries(prev => [...prev, entry])
    setSessionStatEntries(prev => [...prev, entry])
    undoStack.current.push(entry)
    redoStack.current = []
  }, [])

  // Undo last session entry — delete from DB, push to redo stack.
  // In-flight ref prevents double-click races.
  const handleUndo = useCallback(async () => {
    if (undoRedoInFlight.current) return
    const last = undoStack.current[undoStack.current.length - 1]
    if (!last) return
    undoRedoInFlight.current = true
    setUndoPending(true)
    setUndoError(null)
    try {
      const res = await fetch(`/api/filmroom/stat-entries?id=${last.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setStatEntries(prev => prev.filter(e => e.id !== last.id))
      setSessionStatEntries(prev => prev.filter(e => e.id !== last.id))
      undoStack.current.pop()
      redoStack.current.push(last)
    } catch (e) {
      setUndoError(e instanceof Error ? e.message : 'Undo failed — try again')
    } finally {
      setUndoPending(false)
      undoRedoInFlight.current = false
    }
  }, [])

  // Redo: re-POST the last undone entry. In-flight ref prevents races.
  const handleRedo = useCallback(async () => {
    if (undoRedoInFlight.current) return
    const entry = redoStack.current[redoStack.current.length - 1]
    if (!entry) return
    undoRedoInFlight.current = true
    setRedoPending(true)
    setRedoError(null)
    try {
      const res = await fetch('/api/filmroom/stat-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: entry.game_id,
          player_id: entry.player_id === OPP_ID ? null : entry.player_id,
          stat_type: entry.stat_type,
          video_time_ms: entry.video_time_ms,
          shot_x: entry.shot_x ?? undefined,
          shot_y: entry.shot_y ?? undefined,
        }),
      })
      if (!res.ok) throw new Error(`Redo failed (${res.status})`)
      const raw: RawStatEntry = await res.json()
      const newEntry: StatEntry = entry.player_id === OPP_ID
        ? { ...rawToEntry(raw), player_id: OPP_ID, player_name: 'Opponent', player_number: 'OPP' }
        : rawToEntry(raw)
      setStatEntries(prev => [...prev, newEntry])
      setSessionStatEntries(prev => [...prev, newEntry])
      redoStack.current.pop()
      undoStack.current.push(newEntry)
    } catch (e) {
      setRedoError(e instanceof Error ? e.message : 'Redo failed — try again')
    } finally {
      setRedoPending(false)
      undoRedoInFlight.current = false
    }
  }, [])

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

  // Playback speed — applied to <video> element
  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Instant clip: mark last 10s → now, clamped to 0
  const instantClip = useCallback(() => {
    const inMs = Math.max(0, currentMs - 10_000)
    const outMs = currentMs
    if (outMs - inMs < 500) return // too short
    setMarkIn(inMs)
    setMarkOut(outMs)
    videoRef.current?.pause();setIsPlaying(false);setShowSaveClip(true)
    setInstantClipPulse(true)
    setTimeout(() => setInstantClipPulse(false), 400)
  }, [currentMs])

  // Helper: persist current video position via PATCH keepalive.
  // Skips flush if the initial seek hasn't fired yet (avoids writing position=0
  // over a stored resume position before the video has even started).
  const flushResumePosition = useCallback(() => {
    if (!initialSeekDoneRef.current) return // skip — initial seek not yet applied
    const gid = game?.id
    if (!gid) return
    const v = videoRef.current
    if (!v || v.duration <= 0) return
    const ms = Math.round(v.currentTime * 1000)
    if (ms <= 0) return
    // keepalive: survives tab close and client-side navigation (sendBeacon is POST-only)
    fetch(`/api/filmroom/games/${gid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_position_ms: ms }),
      keepalive: true,
    }).catch(() => {})
  }, [game?.id])

  // Resume persistence: every 5s while playing + flush on pause + pagehide + unmount
  useEffect(() => {
    if (!game?.id) return
    const interval = setInterval(() => {
      const v = videoRef.current
      if (!v || v.paused || !isPlaying) return
      flushResumePosition()
    }, 5000)
    const onUnload = () => flushResumePosition()
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('pagehide', onUnload)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('pagehide', onUnload)
      // Flush on client-side unmount (Next.js route navigation)
      flushResumePosition()
    }
  }, [game?.id, isPlaying, flushResumePosition])

  // Flush on video pause event
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPause = () => flushResumePosition()
    v.addEventListener('pause', onPause)
    return () => v.removeEventListener('pause', onPause)
  }, [flushResumePosition, game?.id, durationMs])

  // Initial seek: clip param > resume_position_ms > 0
  // Fires once on loadedmetadata after the video element gets its src.
  // initialSeekDoneRef prevents re-seek on token refresh / src swap.
  useEffect(() => {
    if (!game) return
    const clipParam = searchParams?.get('clip')
    const resumeMs = game.resume_position_ms ?? 0

    const doSeek = (v: HTMLVideoElement) => {
      if (initialSeekDoneRef.current) return
      initialSeekDoneRef.current = true
      if (clipParam) {
        // Find the clip matching the param and seek to its start
        const target = clips.find(c => c.id === clipParam)
        if (target && target.start_time_ms >= 0) {
          v.currentTime = Math.min(target.start_time_ms / 1000, Math.max(0,v.duration-.01))
          setCurrentMs(Math.round(v.currentTime*1000))
          setActiveClipId(target.id)
          return
        }
      }
      if (resumeMs > 0) {
        v.currentTime = Math.min(resumeMs / 1000, Math.max(0,v.duration-.01))
        setCurrentMs(Math.round(v.currentTime*1000))
      }
    }

    const v = videoRef.current
    if (!v) return
    if (v.readyState >= 1) {
      // Metadata already loaded (e.g. src was already set before this effect ran)
      doSeek(v)
    } else {
      const onMeta = () => { doSeek(v); v.removeEventListener('loadedmetadata', onMeta) }
      v.addEventListener('loadedmetadata', onMeta)
      return () => v.removeEventListener('loadedmetadata', onMeta)
    }
  // clips changes when section retry re-fetches; searchParams is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.resume_position_ms, searchParams, clips, durationMs])

  // Retry individual sections without full page reload
  const retrySection = useCallback(async (section: 'clips' | 'players' | 'stats') => {
    try {
    if (section === 'clips') {
      setClipsError(false)
      const res = await fetch(`/api/filmroom/clips?game_id=${gameId}`)
      if (res.ok) { const d = await res.json(); setClips(Array.isArray(d) ? d : []) }
      else setClipsError(true)
    }
    if (section === 'players') {
      setPlayersError(false)
      const res = await fetch('/api/filmroom/players')
      if (res.ok) { const d = await res.json(); setPlayers(Array.isArray(d) ? d : []) }
      else setPlayersError(true)
    }
    if (section === 'stats') {
      setStatsError(false)
      const res = await fetch(`/api/filmroom/stat-entries?game_id=${gameId}`)
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d)) setStatEntries(d.map((raw: RawStatEntry) => rawToEntry(raw)))
      } else setStatsError(true)
    }
    } catch { if(section==='clips')setClipsError(true);if(section==='players')setPlayersError(true);if(section==='stats')setStatsError(true) }
  }, [gameId])

  // Fetch playlists lazily when add-to-playlist is opened
  const fetchPlaylists = useCallback(async () => {
    if (playlists.length > 0) return
    const res = await fetch('/api/filmroom/playlists')
    if (res.ok) setPlaylists(await res.json())
  }, [playlists.length])

  // Start presentation for all clips in the game
  const startPresentation = useCallback(async () => {
    if (clips.length === 0) return
    videoRef.current?.pause();setIsPlaying(false)
    setPresentationClips(clips.map(clip => ({ clip, gameId, src:'' })))
    setShowPresentation(true)
  }, [clips, gameId])

  // Bookmark persistence helper — serialized, checks HTTP success, no setState side effects
  const persistBookmarks = useCallback(async (next: GameBookmark[]) => {
    const gid = game?.id
    if (!gid) return
    setBookmarkPending(true)
    setBookmarkError(null)
    try {
      const res = await fetch(`/api/filmroom/games/${gid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_meta: { bookmarks: next } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `Save failed (${res.status})`)
      }
      lastCommittedBookmarks.current = next
    } catch (e) {
      // Roll back optimistic update to last committed state
      setBookmarks(lastCommittedBookmarks.current)
      setBookmarkError(e instanceof Error ? e.message : 'Failed to save bookmark')
    } finally {
      setBookmarkPending(false)
    }
  }, [game?.id])

  const handleAddBookmark = useCallback((bm: GameBookmark) => {
    if (bookmarkPending) return // prevent overlapping lost updates
    const next = [...bookmarks, bm]
    setBookmarks(next)           // optimistic
    persistBookmarks(next)
  }, [bookmarkPending, bookmarks, persistBookmarks])

  const handleDeleteBookmark = useCallback((id: string) => {
    if (bookmarkPending) return // prevent overlapping lost updates
    const next = bookmarks.filter(b => b.id !== id)
    setBookmarks(next)           // optimistic
    persistBookmarks(next)
  }, [bookmarkPending, bookmarks, persistBookmarks])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when focus is in any interactive form element or a modal is open
      if (e.target instanceof HTMLInputElement) return
      if (e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLButtonElement) return
      if (e.target instanceof HTMLSelectElement) return
      if (e.target instanceof HTMLAnchorElement) return
      if (showStatPanel || showSaveClip || showVideoUrl || showAddToPlaylist) return
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
        // Instant clip: last 10s (Q key) — guard against input elements above
        case 'q': case 'Q': instantClip(); break
        // Speed toggles
        case '-': setPlaybackSpeed(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2)))); break
        case '=': setPlaybackSpeed(s => Math.min(2, parseFloat((s + 0.25).toFixed(2)))); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playPause, frameStep, skip, currentMs, markIn, markOut, showStatPanel, setIsFullscreen, instantClip])

  if (loading) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  // 'unauthorized' variant removed — 401 redirects immediately in the effect
  if (gameError === 'not_found') return (
    <div className="cs min-h-screen bg-[#181917] text-[#eee9df] flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
        <AlertCircle className="w-6 h-6 text-white/30" />
      </div>
      <div>
        <p className="text-white/70 font-medium">Game unavailable</p>
        <p className="text-sm text-white/35 mt-1">This game doesn&apos;t exist or you don&apos;t have access to it.</p>
      </div>
      <Link
        href="/filmroom"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-sm text-white/70 hover:text-white transition-colors border border-white/10"
      >
        <ChevronLeft className="w-4 h-4" /> Back to library
      </Link>
    </div>
  )

  if (gameError === 'error') return (
    <div className="cs min-h-screen bg-[#181917] text-[#eee9df] flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
        <AlertCircle className="w-6 h-6 text-red-400/60" />
      </div>
      <div>
        <p className="text-white/70 font-medium">Something went wrong</p>
        <p className="text-sm text-white/35 mt-1">Failed to load game data. Check your connection and try again.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/filmroom"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-sm text-white/70 hover:text-white transition-colors border border-white/10"
        >
          <ChevronLeft className="w-4 h-4" /> Back to library
        </Link>
        <button
          onClick={() => { setGameError(null); setLoading(true); setRetryKey(k => k + 1) }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )

  if (!game) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center text-white/40">
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  const clipTags=Array.from(new Set(clips.flatMap(c=>[...(c.tags??[]),...(c.play_type?[c.play_type]:[])]))).sort()
  const filteredClips=clips.filter(c=>(!clipTag||(c.tags??[]).includes(clipTag)||c.play_type===clipTag)&&(!clipCategory||c.category===clipCategory)&&(!clipPlayer||c.primary_player_id===clipPlayer||c.players?.some(p=>p.id===clipPlayer)))
  const highlights = clips.filter(c => c.is_highlight)
  const canSave = markIn !== null && markOut !== null && markOut > markIn
  const videoLoaded = !!game.video_url

  return (
    <div className="cs min-h-screen bg-[#181917] text-[#eee9df] flex flex-col">
      {/* Presentation mode — full-screen overlay */}
      {showPresentation && presentationClips.length > 0 && (
        <PresentationMode
          clips={presentationClips}
          onExit={() => setShowPresentation(false)}
        />
      )}
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/8 bg-[#181917] sticky top-0 z-40">
        <div className="px-3 sm:px-4 h-12 flex items-center gap-3">
          <Link href="/filmroom" className="p-1.5 rounded-lg hover:bg-white/8 text-white/60 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 text-sm min-w-0">
            <span className="text-white/40 shrink-0">Film Room</span>
            <span className="text-white/20 mx-1">/</span>
            <EditableTitle
              value={game.opponent}
              onSave={async (val) => {
                await fetch(`/api/filmroom/games/${gameId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent: val }) })
                setGame(g => g ? { ...g, opponent: val } : g)
              }}
            />
            <span className="text-white/30 text-xs ml-2 shrink-0">
              {new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex-1" />
          {/* Video action — grouped with highlights to the left of account controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {highlights.length > 0 && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-yellow-500/15 text-yellow-400 text-xs border border-yellow-500/25">
                <Star className="w-3 h-3 fill-yellow-400" aria-hidden /> {highlights.length} HL
              </span>
            )}
            {game.video_url ? (
              <button onClick={() => setGame(g => g ? { ...g, video_url: null, video_id: null } : g)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/6 transition-all border border-white/8 hover:border-white/15"
                aria-label="Replace game video (upload new file)">
                <Upload className="w-3 h-3" aria-hidden />
                <span className="hidden sm:inline">Replace Video</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-orange-400/80 border border-orange-500/20 bg-orange-500/5">
                <Upload className="w-3 h-3" aria-hidden />
                <span className="hidden sm:inline">Drop video below</span>
              </span>
            )}
            {/* Account controls inline — no fixed overlay collision */}
            <AccountBar />
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
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
                  gameId={gameId}
                  onTimeUpdate={setCurrentMs}
                  onDurationChange={setDurationMs}
                  playerRef={videoRef}
                  isFullscreen={isFullscreen}
                />
                <DrawingOverlay
                  active={drawingActive}
                  onDataChange={onDrawingChange}
                  initialData={null}
                />

                {/* Tap-to-pause overlay — invisible div over video, doesn't block drawing */}
                {!drawingActive && (
                  <div
                    className="absolute inset-0 z-10"
                    style={{ touchAction: 'manipulation' }}
                    onClick={playPause}
                  />
                )}

                {/* Jog wheel — appears when paused */}
                <div className="hidden sm:block"><JogWheel
                  visible={!isPlaying && durationMs > 0}
                  currentMs={currentMs}
                  onScrub={(deltaMs) => {
                    const v = videoRef.current
                    if (!v || !v.duration) return
                    // Clamp to valid range but allow unlimited rotation direction
                    const next = Math.max(0, Math.min(v.duration, v.currentTime + deltaMs / 1000))
                    v.currentTime = next
                    setCurrentMs(Math.round(next * 1000))
                  }}
                  onTap={playPause}
                /></div>

                {/* Fullscreen toggle */}
                <button
                  onClick={() => setIsFullscreen(f => !f)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all z-20"
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
              onStatTap={videoLoaded ? openStatPanel : undefined}
              coachingTools={!isFullscreen ? <div className="flex flex-wrap items-center gap-1">
                <button onClick={() => setAddingBookmark(a => !a)} disabled={bookmarkPending}
                  aria-label="Add bookmark at current position" title="Add bookmark at current position"
                  className="flex items-center gap-1 px-2 py-2 text-xs text-yellow-400/80 rounded-lg hover:bg-white/6 disabled:opacity-40">
                  <Bookmark className="w-3 h-3" /> Add
                </button>
                {/* Draw */}
                <button
                  onClick={() => setDrawingActive(a => !a)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium transition-all border ${
                    drawingActive
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white hover:bg-white/6'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {drawingActive ? 'Drawing On' : 'Draw'}
                </button>

                {/* Instant clip: last 10s (Q) */}
                <button
                  onClick={instantClip}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium transition-all border border-white/8 bg-white/3 text-white/40 hover:text-white hover:bg-white/6 ${
                    instantClipPulse ? 'cs-pulse' : ''
                  }`}
                  title="Mark last 10s as clip (Q)"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Last 10s
                </button>

                {/* Speed control */}
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-white/8 bg-white/3">
                  <button onClick={() => setPlaybackSpeed(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))))}
                    className="text-white/40 hover:text-white text-xs px-1" aria-label="Decrease speed">−</button>
                  <span className="text-xs text-white/60 w-8 text-center tabular-nums">{playbackSpeed}x</span>
                  <button onClick={() => setPlaybackSpeed(s => Math.min(2, parseFloat((s + 0.25).toFixed(2))))}
                    className="text-white/40 hover:text-white text-xs px-1" aria-label="Increase speed">+</button>
                </div>

              </div> : null}
            />}
            {!isFullscreen && game.video_url && (
              <BookmarkBar
                adding={addingBookmark}
                setAdding={setAddingBookmark}
                bookmarks={bookmarks}
                currentMs={currentMs}
                durationMs={durationMs}
                pending={bookmarkPending}
                error={bookmarkError}
                onSeek={seek}
                onAdd={handleAddBookmark}
                onDelete={handleDeleteBookmark}
              />
            )}
            {!isFullscreen&&<EventTimeline clips={clips} stats={statEntries} durationMs={durationMs} currentMs={currentMs} selectedId={activeClipId} onSeek={seekAndPlay} onClip={c=>{setActiveClipId(c.id);jumpToClip(c.start_time_ms)}}/>}
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


          </div>
        </div>

        {/* Right: Clip panel */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-white/8 flex flex-col">
          {/* Panel tabs */}
          <div className="shrink-0 border-b border-white/8 flex">
            {([
              ['clips', 'Clips', Bookmark],
              ['stats', 'Stats', BarChart2],
              ['shot-chart', 'Shots', ZoomIn],
              ['roster', 'Roster', Users],
            ] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-all ${panelTab === tab ? 'border-[#c66a3e] text-[#eee9df]' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}

              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* CLIPS tab */}
            {panelTab === 'clips' && (
              <div className="p-3 space-y-2">
                {clipsError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
                    <span className="text-xs text-red-300 flex-1">Failed to load clips.</span>
                    <button onClick={() => retrySection('clips')}
                      className="text-xs text-red-400 hover:text-red-300 font-medium underline underline-offset-2">Retry</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="Filter clips by tag" value={clipTag} onChange={e=>setClipTag(e.target.value)} className="min-h-11 bg-[#252621] border border-white/10 rounded-md px-2 text-xs"><option value="">All tags</option>{clipTags.map(t=><option key={t}>{t}</option>)}</select>
                  <select aria-label="Filter clips by category" value={clipCategory} onChange={e=>setClipCategory(e.target.value)} className="min-h-11 bg-[#252621] border border-white/10 rounded-md px-2 text-xs"><option value="">All categories</option>{Object.entries(CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
                  <select aria-label="Filter clips by player" value={clipPlayer} onChange={e=>setClipPlayer(e.target.value)} className="col-span-2 min-h-11 bg-[#252621] border border-white/10 rounded-md px-2 text-xs"><option value="">All players</option>{players.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select>
                </div>
                {!!clips.length&&!filteredClips.length&&<p className="py-4 text-sm text-white/65">No clips match these filters.</p>}
                {/* Presentation mode */}
                {clips.length > 0 && (
                  <button
                    onClick={startPresentation}
                    className="flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-xl text-xs font-medium border border-white/8 bg-white/3 text-white/75 hover:text-white hover:bg-white/6 transition-all"
                    title="Play all saved clips in presentation mode"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Present clips
                  </button>
                )}
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
                    <p className="text-xs text-white/50 mt-1">
                      Tap <strong className="text-white/35">IN</strong> on the timeline, then <strong className="text-white/35">OUT</strong>, then <strong className="text-white/35">Save Clip</strong>.
                      On desktop use <kbd className="font-mono bg-white/8 px-1 rounded text-[10px]">I</kbd> and <kbd className="font-mono bg-white/8 px-1 rounded text-[10px]">O</kbd> keys.
                    </p>
                  </div>
                ) : (
                  filteredClips.map(clip => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      isActive={activeClipId === clip.id}
                      onSelect={() => setActiveClipId(id => id === clip.id ? null : clip.id)}
                      onDelete={deleteClip}
                      onJumpTo={(ms) => { jumpToClip(ms); setActiveClipId(clip.id) }}
                      onAddToPlaylist={(clipId) => setShowAddToPlaylist(clipId)}
                    />
                  ))
                )}
              </div>
            )}

            {/* STATS tab — read-only box score */}
            {panelTab === 'stats' && (
              <div className="p-3">
                {statsError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
                    <span className="text-xs text-red-300 flex-1">Failed to load stats.</span>
                    <button onClick={() => retrySection('stats')}
                      className="text-xs text-red-400 hover:text-red-300 font-medium underline underline-offset-2">Retry</button>
                  </div>
                )}
                {/* Desktop: box score renders full-width below video; sidebar shows a pointer */}
                <div className="hidden lg:flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <BarChart2 className="w-7 h-7 text-white/15" />
                  <p className="text-xs text-white/40">Box score is displayed below the video on this screen.</p>
                  <button onClick={() => setStatsFullscreen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
                    <Maximize2 className="w-3 h-3" /> Full Screen
                  </button>
                </div>
                {/* Phone: compact card view directly in the panel */}
                <div className="lg:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/30 font-medium">Box Score</span>
                    <button
                      onClick={() => setStatsFullscreen(true)}
                      style={{ touchAction: 'manipulation' }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white border border-white/8 hover:border-white/20 transition-all"
                    >
                      <Maximize2 className="w-3 h-3" /> Full Screen
                    </button>
                  </div>
                  <BoxScorePanel
                    players={players}
                    statEntries={statEntries}
                    onSeek={seekAndPlay}
                    onDeleteEntry={handleDeleteEntry}
                  />
                </div>
              </div>
            )}

            {/* Full-screen box score modal (phone / explicit expand) */}
            {statsFullscreen && (
              <div className="fixed inset-0 z-50 bg-[#0d0f12] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-widest mb-0.5">Box Score</p>
                    <p className="font-bold text-white text-lg">vs {game.opponent}</p>
                  </div>
                  <button
                    onClick={() => setStatsFullscreen(false)}
                    style={{ touchAction: 'manipulation' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/25 transition-all"
                  >
                    <Minimize2 className="w-3.5 h-3.5" /> Close
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <BoxScorePanel
                    players={players}
                    statEntries={statEntries}
                    onSeek={(ms) => { setStatsFullscreen(false); seekAndPlay(ms) }}
                    onDeleteEntry={handleDeleteEntry}
                  />
                </div>
              </div>
            )}

            {/* SHOT CHART tab */}
            {panelTab === 'shot-chart' && (
              <ShotChartPanel statEntries={statEntries} players={players} onSeek={seekAndPlay} />
            )}

            {/* ROSTER tab */}
            {panelTab === 'roster' && (
              <div className="p-3">
                {playersError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
                    <span className="text-xs text-red-300 flex-1">Failed to load roster.</span>
                    <button onClick={() => retrySection('players')}
                      className="text-xs text-red-400 hover:text-red-300 font-medium underline underline-offset-2">Retry</button>
                  </div>
                )}
                <RosterPanel players={players} teamId={game.team_id} onPlayersChange={setPlayers} />
              </div>
            )}
          </div>
        </div>
      </div>

            {/* Desktop full-width stats panel — appears below video when Stats tab active */}
            {panelTab === 'stats' && !statsFullscreen && (
              <div className="hidden lg:block mx-4 mb-4 mt-3 rounded-xl border border-white/8 bg-[#20211e] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Box Score — vs {game.opponent}</p>
                  {statsError && (
                    <button onClick={() => retrySection('stats')} className="text-xs text-red-400 underline underline-offset-2">Retry</button>
                  )}
                  <button
                    onClick={() => setStatsFullscreen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/40 hover:text-white border border-white/8 hover:border-white/20 transition-all"
                  >
                    <Maximize2 className="w-3 h-3" /> Expand
                  </button>
                </div>
                <BoxScorePanel
                  players={players}
                  statEntries={statEntries}
                  onSeek={seekAndPlay}
                  onDeleteEntry={handleDeleteEntry}
                />
              </div>
            )}


      {/* Modals */}
      {showSaveClip && markIn !== null && markOut !== null && (
        <SaveClipModal
          gameId={gameId}
          teamId={game.team_id}
          startMs={markIn}
          endMs={markOut}
          players={players}
          drawingData={drawingData}
          videoDurationMs={durationMs}
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
          userId={userId}
          onLog={handleLogEntry}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.current.length > 0 && !undoRedoInFlight.current}
          canRedo={redoStack.current.length > 0 && !undoRedoInFlight.current}
          undoPending={undoPending}
          redoPending={redoPending}
          undoError={undoError}
          redoError={redoError}
          onClose={closeStatPanel}
        />
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylist && (
        <AddToPlaylistModal
          clipId={showAddToPlaylist}
          onClose={() => setShowAddToPlaylist(null)}
        />
      )}
    </div>
  )
}

// ─── Shot Chart Panel ───────────────────────────────────────────────────────
// Manual shot chart: court SVG + normalized [0,1] coordinates from stat_entries.
// Clicking a made/miss dot seeks the video to that moment.
// No automatic tracking claims — coaches place shots during stat entry.

const SHOT_TYPES = new Set(['2M','3M','FTM','2X','3X','FTX'])

function ShotChartPanel({
  statEntries, players, onSeek,
}: {
  statEntries: StatEntry[]
  players: Player[]
  onSeek: (ms: number) => void
}) {
  const [playerFilter, setPlayerFilter] = useState<string>('all')

  const shotEntries = statEntries.filter(
    e => SHOT_TYPES.has(e.stat_type) &&
    typeof (e as StatEntry & { shot_x?: number }).shot_x === 'number'
  ) as (StatEntry & { shot_x: number; shot_y: number })[]

  const filtered = playerFilter === 'all'
    ? shotEntries
    : shotEntries.filter(e => e.player_id === playerFilter)

  const made  = filtered.filter(e => e.stat_type.endsWith('M'))
  const missed = filtered.filter(e => e.stat_type.endsWith('X'))

  if (shotEntries.length === 0) return (
    <div className="p-4 text-center py-10">
      <ZoomIn className="w-7 h-7 mx-auto mb-2 text-white/15" />
      <p className="text-xs text-white/30">No shot locations yet.</p>
      <p className="text-xs text-white/50 mt-1">Set shot coordinates when tagging shots in the stat panel.</p>
    </div>
  )

  // Half-court SVG viewBox 0 0 50 47 (standard NCAA half-court proportions)
  return (
    <div className="p-3 space-y-3">
      {players.length > 1 && (
        <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg text-xs border outline-none bg-black/20 border-white/10 text-white/70">
          <option value="all">All players</option>
          {players.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
        </select>
      )}
      <svg viewBox="0 0 50 47" className="w-full rounded-lg" style={{ background: '#1a1d23', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Half-court outline */}
        <rect x="1" y="1" width="48" height="45" rx="1" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        {/* Lane */}
        <rect x="16" y="1" width="18" height="19" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Free-throw circle */}
        <circle cx="25" cy="20" r="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Three-point arc (simplified) */}
        <path d="M 4 1 Q 4 35 25 38 Q 46 35 46 1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Basket */}
        <circle cx="25" cy="5" r="1.2" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="0.5" />

        {/* Made shots — orange circles */}
        {made.map(e => (
          <circle key={e.id}
            cx={1 + e.shot_x * 48} cy={1 + e.shot_y * 45}
            r="1.2" fill="#c66a3e" fillOpacity="0.85" stroke="#e07a4a" strokeWidth="0.3"
            style={{ cursor: 'pointer' }}
            onClick={() => onSeek(e.video_time_ms)}
            role="button" aria-label={`${e.stat_type} at ${Math.round(e.video_time_ms/1000)}s — click to seek`}
          />
        ))}
        {/* Missed shots — white X marks */}
        {missed.map(e => {
          const cx = 1 + e.shot_x * 48
          const cy = 1 + e.shot_y * 45
          return (
            <g key={e.id} style={{ cursor: 'pointer' }} onClick={() => onSeek(e.video_time_ms)}
              role="button" aria-label={`${e.stat_type} miss at ${Math.round(e.video_time_ms/1000)}s — click to seek`}>
              <line x1={cx-1} y1={cy-1} x2={cx+1} y2={cy+1} stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeLinecap="round" />
              <line x1={cx+1} y1={cy-1} x2={cx-1} y2={cy+1} stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeLinecap="round" />
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:'#c66a3e'}} /> Made ({made.length})</span>
        <span className="flex items-center gap-1">× Miss ({missed.length})</span>
        <span className="ml-auto">Tap to seek</span>
      </div>
    </div>
  )
}

// ─── Add to Playlist Modal ────────────────────────────────────────────────────
function AddToPlaylistModal({ clipId, onClose }: { clipId: string; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<{ id: string; name: string; clip_count?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/filmroom/playlists')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setPlaylists(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addToPlaylist = async (playlistId: string) => {
    setAdding(playlistId)
    await fetch(`/api/filmroom/playlists/${playlistId}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: clipId }),
    })
    setDone(d => new Set([...d, playlistId]))
    setAdding(null)
  }

  const createAndAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    const res = await fetch('/api/filmroom/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const pl = await res.json()
      setPlaylists(prev => [{ ...pl, clip_count: 0 }, ...prev])
      await addToPlaylist(pl.id)
      setNewName('')
    }
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1d23] border border-white/10 rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Add to Playlist</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/60"><X className="w-4 h-4" /></button>
        </div>
        {/* New playlist inline */}
        <div className="flex gap-2 mb-3">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createAndAdd()}
            placeholder="New playlist name…"
            maxLength={120}
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-[#c66a3e]/60 placeholder-white/20" />
          <button onClick={createAndAdd} disabled={creating || !newName.trim()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
            style={{ background: '#c66a3e', color: '#181917' }}>
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
          </button>
        </div>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
        ) : playlists.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No playlists yet — create one above.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {playlists.map(pl => (
              <div key={pl.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white/80">{pl.name}</p>
                  <p className="text-[10px] text-white/30">{pl.clip_count ?? 0} clips</p>
                </div>
                <button onClick={() => !done.has(pl.id) && addToPlaylist(pl.id)}
                  disabled={adding === pl.id || done.has(pl.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={done.has(pl.id) ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80' } : { background: '#c66a3e', color: '#181917' }}>
                  {adding === pl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : done.has(pl.id) ? <Check className="w-3 h-3" /> : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Roster Panel ──────────────────────────────────────────────────────

function RosterPanel({ players, teamId, onPlayersChange }: { players: Player[]; teamId: string; onPlayersChange: (p: Player[]) => void }) {
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
        team_id: teamId,
        name: form.name,
        // jersey 0 is valid — only null when empty or non-numeric
        number: form.number !== '' ? (isNaN(parseInt(form.number, 10)) ? null : parseInt(form.number, 10)) : null,
        position: form.position || null,
        parent_email: form.parent_email || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to add player')
      setLoading(false)
      return
    }
    const player = await res.json()
    onPlayersChange([...players, player])
    setForm({ name: '', number: '', position: '', parent_email: '' })
    setAdding(false)
    setLoading(false)
  }

  const removePlayer = async (id: string) => {
    const res = await fetch(`/api/filmroom/players/${id}`, { method: 'DELETE' })
    if (res.ok) {
      onPlayersChange(players.filter(p => p.id !== id))
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to remove player')
    }
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
            aria-label={`Remove ${p.name} (#${p.number ?? '?'})`}
            className="p-1 rounded-lg text-white/20 hover:text-red-400 transition-colors">
            <X className="w-3 h-3" aria-hidden />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={addPlayer} className="space-y-2 p-3 rounded-xl bg-white/3 border border-blue-500/25">
          <div className="grid grid-cols-2 gap-1.5">
            <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
            <input placeholder="#" type="number" min="0" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
            <input placeholder="PG/SG/SF/PF/C" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
            <input placeholder="Parent email" type="email" value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[rgba(198,106,62,0.60)] placeholder-white/20" />
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
