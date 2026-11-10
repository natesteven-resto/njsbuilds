'use client'
import {usePrivatePlayback,type PlaybackQuality} from '@/app/filmroom/components/usePrivatePlayback'
import {PlaybackQualityControl} from '@/app/filmroom/components/PlaybackQualityControl'
import {ToolbarMenu} from '@/app/filmroom/components/ToolbarMenu'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft,
  Scissors, Bookmark, Star, MessageSquare,
  Users, BarChart2, Pencil, X, Check,
  Plus, Trash2, Loader2, ChevronDown, ChevronUp, Upload,
  ZoomIn, AlertCircle, CheckCircle2, BarChart, Maximize2, Minimize2,
} from 'lucide-react'
import type { Game, Clip, Player, ClipComment } from '@/types/filmroom'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/filmroom'
import { DrawingOverlay, type DrawingData } from '@/app/filmroom/components/DrawingOverlay'
import { STAT_NAMES, reviewMoment, statDescription } from '@/lib/filmroom-events'
import { EventTimeline } from '@/app/filmroom/components/EventTimeline'
import { JogWheel } from '@/app/filmroom/components/JogWheel'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import type { PresentationClip } from '@/app/filmroom/components/PresentationMode'
import { StatTagModal } from '@/app/filmroom/components/StatTagModal'
import { SaveClipDialog } from '@/app/filmroom/components/SaveClipDialog'
import { ClipBuilderTile, ClipHud, ClipToast, clipPhase, MIN_CLIP_MS, type ToastMessage } from '@/app/filmroom/components/ClipBuilder'
import { Court, shotZone, type CourtMarker, type ZoneFamily } from '@/app/filmroom/components/Court'
import { msToTimecode, msToDisplay, formatDuration } from '@/lib/filmroom-time'
import { STAT_DEFS, OPP_ID, LOCATED_SHOT_TYPES, rawToEntry, statLabel, entryWho, type StatEntry, type RawStatEntry, type StatType } from '@/lib/filmroom-stats'

// ─── Utilities ───────────────────────────────────────────────────────────────

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
const BoxScorePanel = React.memo(function BoxScorePanel({
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
        <table className="fr-table">
          <thead>
            <tr>
              <th className="min-w-[120px]">Player</th>
              {BOX_HEADERS.map(h => (
                <th key={h} className={h === 'pts' ? 'text-[12px]' : ''} style={h === 'pts' ? { color: 'var(--fr-ink)' } : undefined}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                    className={`${canExpand ? 'clickable' : ''} ${row.isTotal ? 'is-total' : ''} ${row.entries.length === 0 ? 'is-dim' : ''}`}
                  >
                    <td>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canExpand && (isExpanded
                          ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: 'var(--fr-ink3)' }} />
                          : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--fr-ink3)' }} />
                        )}
                        {row.player && <span className="fr-display text-[14px] w-7 shrink-0 tabular-nums" style={{ color: 'var(--fr-accent2)' }}>#{row.player.number ?? '?'}</span>}
                        <span className="font-semibold truncate text-[12px]" style={{ color: row.isOpp ? 'var(--fr-bad)' : 'var(--fr-ink)' }}>
                          {row.player ? row.player.name.split(' ')[0] : row.label}
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
        <p className="text-[11px] pt-2" style={{ color: 'var(--fr-ink3)' }}>
          Click a player to list their plays; click a time to watch it.
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
})

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

function VideoPlayer({gameId,sourceKey,quality,onFallback,onTimeUpdate,onDurationChange,playerRef,isFullscreen}:{
 gameId:string;sourceKey:string;quality:PlaybackQuality;onFallback:()=>void;
 onTimeUpdate:(ms:number)=>void;onDurationChange:(ms:number)=>void;
 playerRef:React.RefObject<HTMLVideoElement|null>;isFullscreen?:boolean
}) {
 const {error,loading}=usePrivatePlayback(playerRef,gameId,quality,onFallback,sourceKey)
 return <>
  <video ref={playerRef} className={isFullscreen?'w-full h-full object-contain bg-black':'w-full object-contain bg-black'}
   style={isFullscreen?undefined:{maxHeight:'calc(100vh - 48px - 130px)'}}
   onTimeUpdate={e=>onTimeUpdate(Math.round(e.currentTarget.currentTime*1000))}
   onDurationChange={e=>{if(Number.isFinite(e.currentTarget.duration))onDurationChange(Math.round(e.currentTarget.duration*1000))}}
   playsInline preload="metadata" controls={false}/>
  {loading&&<span role="status" className="absolute top-3 left-3 rounded bg-black/80 px-3 py-2 text-xs text-white/70 pointer-events-none">Loading video…</span>}
  {error&&<span role="alert" className="absolute top-3 left-3 rounded bg-black/80 px-3 py-2 text-xs text-red-300 pointer-events-none">{error}</span>}
 </>
}

// ─── Transport Bar ────────────────────────────────────────────────────────────

function TransportBar({
  isPlaying, currentMs, durationMs,
  onPlayPause, onSeek, onSkip, onFrameStep,
  markIn, markOut,
  isFullscreen, onStatTap,
  onMarkIn, onMarkOut, onSaveClip,
  playbackSpeed, onSpeed,
  drawingActive, onToggleDrawing,
  onToggleBookmark, bookmarkDisabled,
  qualityControl,
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
  isFullscreen?: boolean
  onStatTap?: () => void
  onMarkIn: () => void
  onMarkOut: () => void
  onSaveClip?: () => void
  playbackSpeed: number
  onSpeed: (fn: (s: number) => number) => void
  drawingActive: boolean
  onToggleDrawing: () => void
  onToggleBookmark: () => void
  bookmarkDisabled?: boolean
  qualityControl?: React.ReactNode
}) {
  const pct = durationMs > 0 ? (currentMs / durationMs) * 100 : 0
  const inPct = (markIn != null && durationMs > 0) ? (markIn / durationMs) * 100 : null
  const outPct = (markOut != null && durationMs > 0) ? (markOut / durationMs) * 100 : null
  const trackRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)

  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current
    if (!el || durationMs <= 0) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(Math.round(ratio * durationMs))
  }

  return (
    <div className={`shrink-0 px-3 pt-2.5 pb-2 ${isFullscreen ? 'bg-black' : ''}`} style={isFullscreen ? undefined : { borderTop: '1px solid var(--fr-line)' }}>
      {/* Scrubber — pointer-drag seeks; marks and the clip range are drawn on the track */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Video position"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(durationMs / 1000))}
        aria-valuenow={Math.round(currentMs / 1000)}
        aria-valuetext={msToTimecode(currentMs)}
        tabIndex={0}
        className="relative group h-6 flex items-center cursor-pointer select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { scrubbing.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e.clientX) }}
        onPointerMove={(e) => { if (scrubbing.current) seekFromPointer(e.clientX) }}
        onPointerUp={(e) => { scrubbing.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
        onPointerCancel={() => { scrubbing.current = false }}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); onSkip(-5000) } if (e.key === 'ArrowRight') { e.preventDefault(); onSkip(5000) } }}
      >
        <div className="relative w-full h-1.5 rounded-full" style={{ background: 'rgba(238,233,223,0.14)' }}>
          {inPct != null && outPct != null && outPct > inPct && (
            <div className="absolute top-0 h-full rounded-full" style={{ left: `${inPct}%`, width: `${outPct - inPct}%`, background: 'rgba(198,106,62,0.45)' }} />
          )}
          <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--fr-accent)' }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow transition-transform group-hover:scale-110"
            style={{ left: `calc(${pct}% - 7px)`, background: '#fff4ea' }} />
          {inPct != null && (
            <div className="absolute -top-1.5 w-0.5 h-[18px] -translate-x-1/2" style={{ left: `${inPct}%`, background: 'var(--fr-good)' }} title={`In ${msToTimecode(markIn!)}`}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold" style={{ color: 'var(--fr-good)' }}>IN</span>
            </div>
          )}
          {outPct != null && (
            <div className="absolute -top-1.5 w-0.5 h-[18px] -translate-x-1/2" style={{ left: `${outPct}%`, background: 'var(--fr-bad)' }} title={`Out ${msToTimecode(markOut!)}`}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold" style={{ color: 'var(--fr-bad)' }}>OUT</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1">
          <button onClick={() => onFrameStep(-1)} className="fr-icon-btn" style={{ borderColor: 'transparent' }} title="Previous frame (←)" aria-label="Previous frame">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={() => onSkip(-5000)} className="fr-btn fr-btn-ghost fr-mono" style={{ paddingInline: 8 }} title="Back 5s (J)">−5s</button>
          <button onClick={onPlayPause}
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ background: 'var(--fr-accent)', color: '#181917' }} title="Play/Pause (Space)" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
          </button>
          <button onClick={() => onSkip(5000)} className="fr-btn fr-btn-ghost fr-mono" style={{ paddingInline: 8 }} title="Forward 5s (L)">+5s</button>
          <button onClick={() => onFrameStep(1)} className="fr-icon-btn" style={{ borderColor: 'transparent' }} title="Next frame (→)" aria-label="Next frame">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <span className="fr-display fr-mono text-[18px] leading-none ml-1 tabular-nums" style={{ color: 'var(--fr-ink)' }}>
          {msToTimecode(currentMs)}<span style={{ color: 'var(--fr-ink3)' }}> / {msToTimecode(durationMs)}</span>
        </span>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Speed */}
          <div className="flex items-center rounded-[10px]" style={{ border: '1px solid var(--fr-line2)', height: 36 }}>
            <button onClick={() => onSpeed(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))))} className="px-2 h-full" style={{ color: 'var(--fr-ink2)' }} aria-label="Decrease speed">−</button>
            <span className="fr-mono text-[12px] font-semibold w-9 text-center tabular-nums">{playbackSpeed}×</span>
            <button onClick={() => onSpeed(s => Math.min(2, parseFloat((s + 0.25).toFixed(2))))} className="px-2 h-full" style={{ color: 'var(--fr-ink2)' }} aria-label="Increase speed">+</button>
          </div>
          <button onClick={onToggleDrawing} className={`fr-btn ${drawingActive ? 'fr-btn-on' : ''}`} aria-pressed={drawingActive} title="Draw on the frame">
            <Pencil className="w-3.5 h-3.5" aria-hidden /> <span className="hidden sm:inline">{drawingActive ? 'Drawing' : 'Draw'}</span>
          </button>
          <button onClick={onToggleBookmark} disabled={bookmarkDisabled} className="fr-icon-btn" aria-label="Add bookmark at current position" title="Add bookmark at current position">
            <Bookmark className="w-4 h-4" aria-hidden />
          </button>
          {qualityControl && (
            <ToolbarMenu label="Quality" startOnSmall>
              {qualityControl}
              <p style={{ color: 'var(--fr-ink3)' }}>Original keeps your full upload quality. Auto adapts to your connection, up to 1080p.</p>
            </ToolbarMenu>
          )}
          {isFullscreen && (
            <>
              <button onClick={onMarkIn} className="fr-btn" title="Mark in (I)"><span style={{ color: 'var(--fr-good)' }}>●</span> In</button>
              <button onClick={onMarkOut} className="fr-btn" title="Mark out (O)"><span style={{ color: 'var(--fr-bad)' }}>●</span> Out</button>
              {onSaveClip && <button onClick={onSaveClip} className="fr-btn fr-btn-primary" title="Save clip (S)"><Scissors className="w-3.5 h-3.5" aria-hidden /> Save clip</button>}
            </>
          )}
          {onStatTap && (
            <button onClick={onStatTap} className="fr-btn fr-btn-primary" style={{ height: 40, paddingInline: 14, fontSize: 13 }} title="Tag a stat (T)">
              <BarChart className="w-3.5 h-3.5" aria-hidden /> Tag stat <kbd className="fr-kbd fr-kbd-dark">T</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="hidden md:flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]" style={{ color: 'var(--fr-ink3)' }}>
        <span><kbd className="fr-kbd">Space</kbd> play</span>
        <span><kbd className="fr-kbd">←</kbd><kbd className="fr-kbd">→</kbd> frame</span>
        <span><kbd className="fr-kbd">J</kbd><kbd className="fr-kbd">L</kbd> ±5s</span>
        <span><kbd className="fr-kbd">I</kbd> in · <kbd className="fr-kbd">O</kbd> out · <kbd className="fr-kbd">S</kbd> save clip</span>
        <span><kbd className="fr-kbd">Q</kbd> last 10s</span>
        <span><kbd className="fr-kbd">T</kbd> tag stat</span>
        <span><kbd className="fr-kbd">F</kbd> fullscreen</span>
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

const ClipItem = React.memo(function ClipItem({
  clip, isActive, onSelect, onDelete, onJumpTo, onAddToPlaylist, onEdit,
}: {
  clip: Clip
  isActive: boolean
  onSelect: (id: string) => void
  onEdit: (clip: Clip) => void
  onDelete: (id: string) => void
  onJumpTo: (clip: Clip) => void
  onAddToPlaylist?: (clipId: string) => void
}) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div className="rounded-xl transition-colors" style={{ border: `1px solid ${isActive ? 'rgba(198,106,62,0.55)' : 'var(--fr-line)'}`, background: isActive ? 'rgba(198,106,62,0.08)' : 'var(--fr-tile2)' }}>
      <div className="p-3 cursor-pointer" onClick={() => onSelect(clip.id)}>
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onJumpTo(clip) }}
            className="shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--fr-accent)', color: '#181917' }}
            aria-label={`Jump to clip: ${clip.title}`}>
            <Play className="w-3 h-3 ml-0.5" aria-hidden />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {clip.is_highlight && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
              <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--fr-ink)' }}>{clip.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="fr-mono text-[11px]" style={{ color: 'var(--fr-ink3)' }}>{msToTimecode(clip.start_time_ms)} · {formatDuration(clip.start_time_ms, clip.end_time_ms)}</span>
              <span className="text-[10px]" style={{ color: clip.parent_shared===false ? 'var(--fr-ink3)' : 'var(--fr-accent2)' }}>{clip.parent_shared===false?'Private':'Shared'}</span>
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
            <button onClick={e=>{e.stopPropagation();onEdit(clip)}} aria-label={`Edit clip: ${clip.title}`} className="px-2 py-1 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/6">Edit</button>
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
})

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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-4 rounded-sm transition-colors z-10"
                style={{ left: `${pct}%`, background: 'var(--fr-accent)' }}
              />
            )
          })}
        </div>
      )}

      {/* Bookmark chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {bookmarks.map(bm => (
          <div key={bm.id} className="fr-chip gap-0 pr-0" style={{ height: 28 }}>
            <Bookmark className="w-3 h-3 mr-1.5 shrink-0" style={{ color: 'var(--fr-accent)' }} aria-hidden />
            <button
              onClick={() => onSeek(bm.position_ms)}
              className="text-[11.5px] font-semibold"
              style={{ color: 'var(--fr-ink)' }}
              aria-label={`Jump to ${bm.label} at ${msToDisplay(bm.position_ms)}`}
            >
              {bm.period && <span className="mr-1" style={{ color: 'var(--fr-ink3)' }}>{bm.period}</span>}
              {bm.clock && <span className="fr-mono mr-1" style={{ color: 'var(--fr-ink2)' }}>{bm.clock}</span>}
              {bm.label}
            </button>
            <button
              onClick={() => onDelete(bm.id)}
              aria-label={`Delete bookmark: ${bm.label}`}
              className="min-h-7 min-w-7 ml-0.5 flex items-center justify-center rounded-full transition-colors hover:text-red-400"
              style={{ color: 'var(--fr-ink3)' }}
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
              className="fr-select"
              style={{ width: 'auto', minHeight: 30, padding: '2px 26px 2px 8px', fontSize: 11.5 }}
              aria-label="Period"
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={form.clock}
              onChange={e => setForm(f => ({ ...f, clock: e.target.value }))}
              placeholder="4:32"
              aria-label="Game clock (optional)"
              className="fr-input fr-mono"
              style={{ width: 64, minHeight: 30, padding: '2px 8px', fontSize: 11.5 }}
            />
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Note (optional)"
              aria-label="Bookmark label" maxLength={120}
              className="fr-input"
              style={{ width: 150, minHeight: 30, padding: '2px 8px', fontSize: 11.5 }}
            />
            <button onClick={commit} className="fr-btn fr-btn-primary" style={{ height: 30, fontSize: 11.5 }}>Save</button>
            <button onClick={() => setAdding(false)} className="fr-btn fr-btn-ghost" style={{ height: 30, fontSize: 11.5 }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FRAME_MS = 33 // ~30fps

const PresentationModeLazy = dynamic(() => import('@/app/filmroom/components/PresentationMode').then(m => m.PresentationMode), { ssr: false })

export default function GameFilmRoom() {
  const params = useParams()
  const gameId = params.id as string
  const searchParams = useSearchParams()

  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  // The black frame around the <video>; the Tag Stat card centres on it.
  const videoFrameRef = useRef<HTMLDivElement>(null)
  // Initial seek: one-shot ref so token refreshes / retries don't re-seek
  const initialSeekDoneRef = useRef(false)
  const onDrawingChange=useCallback((data:DrawingData)=>setDrawingData({...data,time_ms:Math.round((videoRef.current?.currentTime??0)*1000)}),[])
  const [game, setGame] = useState<Game | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [clipTag,setClipTag]=useState('')
  const [clipCategory,setClipCategory]=useState('')
  const [clipPlayer,setClipPlayer]=useState('')
  const [players, setPlayers] = useState<Player[]>([])
  // activePlayers: only non-archived — used for roster/tag/new-stat choices.
  // Full `players` (incl. archived) is passed to historical panels (BoxScore, ShotChart, clip edit).
  const activePlayers = useMemo(() => players.filter(p => !p.archived_at), [players])
  const [loading, setLoading] = useState(true)
  const [gameError, setGameError] = useState<'not_found' | 'error' | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)

  const [markIn, setMarkIn] = useState<number | null>(null)
  const [markOut, setMarkOut] = useState<number | null>(null)
  const [showSaveClip, setShowSaveClip] = useState(false)
  const [editingClip,setEditingClip]=useState<Clip|null>(null)
  const [showVideoUrl, setShowVideoUrl] = useState(false)
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState(false)
  const [playbackQuality,setPlaybackQuality]=useState<PlaybackQuality>('original')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenRootRef = useRef<HTMLDivElement>(null)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastSeq = useRef(0)
  const showToast = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    toastSeq.current += 1
    setToast({ id: toastSeq.current, text, tone })
  }, [])
  const clearToast = useCallback((id: number) => setToast(t => (t && t.id === id ? null : t)), [])

  const toggleFullscreen = useCallback(async () => {
    const root = fullscreenRootRef.current
    if (!root) return
    setFullscreenError(null)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (root.requestFullscreen) await root.requestFullscreen()
      else setFullscreenError('This browser does not support fullscreen with coaching controls.')
    } catch {
      setFullscreenError('Could not enter fullscreen. Please try the fullscreen button again.')
    }
  }, [])
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const [drawingActive, setDrawingActive] = useState(false)
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null)

  // Stat entry state
  const [showStatPanel, setShowStatPanel] = useState(false)
  // Exact paused position captured when Tag stat opens (state lags the element by a timeupdate tick)
  const [statAnchorMs, setStatAnchorMs] = useState(0)
  const [statDeleteError,setStatDeleteError]=useState<string|null>(null)
  const deletingStatIds=useRef<Set<string>>(new Set())
  const deletingClipId=useRef<string|null>(null)
  const resumeAfterDetails=useRef(false)
  const [statsFullscreen, setStatsFullscreen] = useState(false)
  const [statEntries, setStatEntries] = useState<StatEntry[]>([])
  const [sessionStatEntries, setSessionStatEntries] = useState<StatEntry[]>([])

  // Courtside additions
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [addingBookmark, setAddingBookmark] = useState(false)
  const [showEventSettings,setShowEventSettings]=useState(false)
  const [eventLabels,setEventLabels]=useState(true)
  const [eventPlayer,setEventPlayer]=useState('')
  const [eventType,setEventType]=useState('')
  const [eventLead,setEventLead]=useState(5)
  const [reviewEventId,setReviewEventId]=useState<string|null>(null)

  const [showPresentation, setShowPresentation] = useState(false)
  const [presentationClips, setPresentationClips] = useState<PresentationClip[]>([])
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<string | null>(null) // clipId

  // Section-level error states for retry without full page reload
  const [clipsError, setClipsError] = useState(false)
  const [playersError, setPlayersError] = useState(false)
  const [statsError, setStatsError] = useState(false)

  // Bookmarks (from game.review_meta — read on load, mutations queued to root API)
  type GameBookmark = NonNullable<NonNullable<Game['review_meta']>['bookmarks'][number]>
  const [bookmarks, setBookmarks] = useState<GameBookmark[]>([])

  // Undo/Redo stacks (lifted from the stat modal so Redo can re-POST)
  const undoStack = useRef<StatEntry[]>([])
  const redoStack = useRef<StatEntry[]>([])
  const undoRedoInFlight = useRef(false) // prevents double-click races
  const [undoPending, setUndoPending] = useState(false)
  const [redoPending, setRedoPending] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)
  const [redoError, setRedoError] = useState<string | null>(null)

  // Bookmark optimistic state — serialize mutations to avoid lost-update races
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  // Serialization ref: latest committed bookmark list from a successful PATCH
  const lastCommittedBookmarks = useRef<GameBookmark[]>([])

  // Latest values for event handlers, so hotkeys don't re-subscribe 4× a second on timeupdate.
  const latest = useRef({ currentMs, durationMs, markIn, markOut, modalOpen: false })
  latest.current.currentMs = currentMs
  latest.current.durationMs = durationMs
  latest.current.markIn = markIn
  latest.current.markOut = markOut
  latest.current.modalOpen = showStatPanel || showSaveClip || !!editingClip || showVideoUrl || !!showAddToPlaylist || statsFullscreen || showPresentation

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

        // Fetch sections independently so one failure doesn't blank everything.
        // Players are scoped to game.team_id so we never surface players from
        // other teams in roster/stat/clip modals.
        const [cRes, pRes, seRes] = await Promise.all([
          fetch(`/api/filmroom/clips?game_id=${gameId}`, { signal }),
          // include_archived=true: load ALL same-team players so historical
          // stat tables and clip associations display correctly. Active-only
          // subset is derived below for roster/tag choices.
          fetch(`/api/filmroom/players?team_id=${encodeURIComponent(g.team_id)}&include_archived=true`, { signal }),
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
      } catch {
        if (signal.aborted) return // normal cleanup, not an error
        setGameError('error')
        setLoading(false)
      }
    }
    loadGame()
    return () => controller.abort()
  }, [gameId, router, retryKey])

  // Video controls
  const nowMs = useCallback(() => {
    const v = videoRef.current
    return v && Number.isFinite(v.currentTime) ? Math.round(v.currentTime * 1000) : latest.current.currentMs
  }, [])

  const playPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { void v.play().catch(() => {}); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const pauseVideo = useCallback(() => {
    const v = videoRef.current
    if (v && !v.paused) v.pause()
    setIsPlaying(false)
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
    void v.play().catch(() => {})
    setIsPlaying(true)
  }, [])

  const skip = useCallback((deltaMs: number) => {
    const v = videoRef.current
    if (!v) return
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration * 1000 : latest.current.durationMs
    const ms = Math.max(0, Math.min(dur, nowMs() + deltaMs))
    seek(ms)
  }, [seek, nowMs])

  const frameStep = useCallback((dir: 1 | -1) => {
    const v = videoRef.current
    if (!v || v.paused === false) { v?.pause(); setIsPlaying(false) }
    skip(dir * FRAME_MS)
  }, [skip])

  // Stat modal: pause video when opening
  const openStatPanel = useCallback(() => {
    const v = videoRef.current
    resumeAfterDetails.current=!!v&&!v.paused
    if (v && !v.paused) { v.pause(); setIsPlaying(false) }
    setStatAnchorMs(v && Number.isFinite(v.currentTime) ? Math.round(v.currentTime * 1000) : latest.current.currentMs)
    setShowStatPanel(true)
  }, [])

  // Close stat modal: only resume if video was playing before it opened
  const closeStatPanel = useCallback(() => {
    setShowStatPanel(false)
    if (resumeAfterDetails.current) { void videoRef.current?.play().catch(()=>{}); setIsPlaying(true) }
    resumeAfterDetails.current=false
  }, [])

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
    if (deletingStatIds.current.has(id)) return // lock: prevent duplicate in-flight deletes
    deletingStatIds.current.add(id)
    setStatDeleteError(null)
    try {
      const res = await fetch(`/api/filmroom/stat-entries?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Do NOT remove from local state; surface error in BoxScore
        const body = await res.json().catch(() => ({}))
        const msg = body?.error ?? `Could not delete stat (${res.status}). Please try again.`
        setStatDeleteError(msg)
        return
      }
      // Only update local state on confirmed server success
      setStatEntries(prev => prev.filter(e => e.id !== id))
      setSessionStatEntries(prev => prev.filter(e => e.id !== id))
      setStatDeleteError(null)
    } catch {
      const msg = 'Network error — stat was not deleted. Check your connection and try again.'
      setStatDeleteError(msg)
    } finally {
      deletingStatIds.current.delete(id)
    }
  }, [])

  // Jump to clip
  const jumpToClip = useCallback((clip: Clip) => {
    seek(clip.start_time_ms)
    setActiveClipId(clip.id)
    const v = videoRef.current
    if (v && v.paused) { void v.play().catch(() => {}); setIsPlaying(true) }
  }, [seek])
  const toggleActiveClip = useCallback((id: string) => setActiveClipId(cur => cur === id ? null : id), [])
  const beginEditClip = useCallback((clip: Clip) => { pauseVideo(); setEditingClip(clip) }, [pauseVideo])
  const openAddToPlaylist = useCallback((clipId: string) => setShowAddToPlaylist(clipId), [])

  // Delete clip state for error display
  const [clipDeleteError, setClipDeleteError] = useState<string | null>(null)

  // Delete clip — only removes from local state if server confirms success.
  // Prevents accidental local row removal on network/HTTP failures.
  const deleteClip = useCallback(async (id: string) => {
    if (deletingClipId.current === id) return // lock: prevent duplicate in-flight deletes
    if (!confirm('Delete this clip? This cannot be undone.')) return
    deletingClipId.current = id
    setClipDeleteError(null)
    try {
      const res = await fetch(`/api/filmroom/clips/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setClipDeleteError(body?.error ?? `Could not delete clip (${res.status}). Please try again.`)
        return
      }
      // Only remove from local state after confirmed server delete
      setClips(c => c.filter(x => x.id !== id))
      setActiveClipId(cur => (cur === id ? null : cur))
      setClipDeleteError(null)
    } catch {
      setClipDeleteError('Network error — clip was not deleted. Check your connection and try again.')
    } finally {
      deletingClipId.current = null
    }
  }, [])

  // Playback speed — applied to <video> element
  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Hold playback paused for the whole edit session, including a token-refresh resume.
  useEffect(() => {
    if (!showSaveClip && !editingClip) return
    const video=videoRef.current
    if (!video) return
    const pause=()=>{video.pause();setIsPlaying(false)}
    pause()
    video.addEventListener('play',pause)
    return ()=>video.removeEventListener('play',pause)
  },[showSaveClip,editingClip])

  // ── Clip marks: I / O / Q / S. Setting a mark on the wrong side of the other one clears the other,
  //    so the builder always shows a state you can act on. ──
  const markInAt = useCallback(() => {
    const t = nowMs()
    const out = latest.current.markOut
    setMarkIn(t)
    if (out !== null && t > out - MIN_CLIP_MS) {
      setMarkOut(null)
      showToast(`In · ${msToTimecode(t)} — Out cleared, press O at the end`)
    } else {
      showToast(out === null ? `In · ${msToTimecode(t)} — now press O at the end` : `In · ${msToTimecode(t)} · ${formatDuration(t, out)} clip ready`)
    }
  }, [nowMs, showToast])

  const markOutAt = useCallback(() => {
    const t = nowMs()
    const inn = latest.current.markIn
    setMarkOut(t)
    if (inn !== null && t < inn + MIN_CLIP_MS) {
      setMarkIn(null)
      showToast(`Out · ${msToTimecode(t)} — In cleared, press I at the start`)
    } else {
      showToast(inn === null ? `Out · ${msToTimecode(t)} — press I where the play starts` : `Out · ${msToTimecode(t)} · ${formatDuration(inn, t)} clip ready — S to save`)
    }
  }, [nowMs, showToast])

  const clearMarks = useCallback(() => { setMarkIn(null); setMarkOut(null) }, [])

  // Instant clip: mark last 10s → now, clamped to 0
  const instantClip = useCallback(() => {
    const outMs = nowMs()
    const inMs = Math.max(0, outMs - 10_000)
    if (outMs - inMs < MIN_CLIP_MS) return // too short
    setMarkIn(inMs)
    setMarkOut(outMs)
    pauseVideo()
    setShowSaveClip(true)
  }, [nowMs, pauseVideo])

  // S: save what is marked. With only an In point, the playhead becomes the Out point.
  const requestSaveClip = useCallback(() => {
    const { markIn: inn, markOut: out } = latest.current
    if (inn !== null && out !== null) {
      if (out - inn >= MIN_CLIP_MS) { pauseVideo(); setShowSaveClip(true) }
      else showToast('Clip is too short — move the Out point later', 'warn')
      return
    }
    if (inn !== null && out === null) {
      const t = nowMs()
      if (t - inn >= MIN_CLIP_MS) { setMarkOut(t); pauseVideo(); setShowSaveClip(true); return }
      showToast('Play a little further, then press S to end the clip here', 'warn')
      return
    }
    if (inn === null && out !== null) { showToast('Press I where the play starts first', 'warn'); return }
    showToast('Press I where the play starts, then S', 'warn')
  }, [nowMs, pauseVideo, showToast])

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

  // Flush on video pause event; keep isPlaying honest when the element pauses/plays on its own (ended, PiP, OS controls)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPause = () => { flushResumePosition(); setIsPlaying(false) }
    const onPlay = () => setIsPlaying(true)
    v.addEventListener('pause', onPause)
    v.addEventListener('play', onPlay)
    return () => { v.removeEventListener('pause', onPause); v.removeEventListener('play', onPlay) }
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
      // Always scope to the game's team_id — no all-team fallback to prevent cross-team data leaks
      const teamId = game?.team_id
      if (!teamId) { setPlayersError(true); return }
      const url = `/api/filmroom/players?team_id=${encodeURIComponent(teamId)}&include_archived=true`
      const res = await fetch(url)
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
  }, [gameId, game?.team_id])

  // Start presentation for all clips in the game
  const startPresentation = useCallback(async () => {
    if (clips.length === 0) return
    pauseVideo()
    setPresentationClips(clips.map(clip => ({ clip, gameId, src:'' })))
    setShowPresentation(true)
  }, [clips, gameId, pauseVideo])

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

  // Keyboard shortcuts — one stable listener; reads live values from `latest`.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when focus is in any interactive form element or a modal is open
      if (e.target instanceof HTMLInputElement) return
      if (e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLButtonElement) return
      if (e.target instanceof HTMLSelectElement) return
      if (e.target instanceof HTMLAnchorElement) return
      if ((e.target as HTMLElement)?.closest('summary')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (latest.current.modalOpen) return
      switch (e.key) {
        case ' ': e.preventDefault(); playPause(); break
        case 'ArrowLeft': e.preventDefault(); frameStep(-1); break
        case 'ArrowRight': e.preventDefault(); frameStep(1); break
        case 'j': case 'J': skip(-5000); break
        case 'l': case 'L': skip(5000); break
        case 'i': case 'I': markInAt(); break
        case 'o': case 'O': markOutAt(); break
        case 's': case 'S': requestSaveClip(); break
        case 't': case 'T': if (videoRef.current) openStatPanel(); break
        case 'f': case 'F': void toggleFullscreen(); break
        case 'Escape': if (document.fullscreenElement) void document.exitFullscreen(); break
        // Instant clip: last 10s (Q key) — guard against input elements above
        case 'q': case 'Q': instantClip(); break
        // Speed toggles
        case '-': setPlaybackSpeed(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2)))); break
        case '=': setPlaybackSpeed(s => Math.min(2, parseFloat((s + 0.25).toFixed(2)))); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playPause, frameStep, skip, markInAt, markOutAt, requestSaveClip, openStatPanel, toggleFullscreen, instantClip])

  // Derived lists — memoised so the 4Hz timeupdate re-render doesn't rebuild them.
  const clipTags = useMemo(() => Array.from(new Set(clips.flatMap(c=>[...(c.tags??[]),...(c.play_type?[c.play_type]:[])]))).sort(), [clips])
  const filteredClips = useMemo(() => clips.filter(c=>(!clipTag||(c.tags??[]).includes(clipTag)||c.play_type===clipTag)&&(!clipCategory||c.category===clipCategory)&&(!clipPlayer||c.primary_player_id===clipPlayer||c.players?.some(p=>p.id===clipPlayer))), [clips, clipTag, clipCategory, clipPlayer])
  const highlights = useMemo(() => clips.filter(c => c.is_highlight), [clips])
  const matchingStats = useMemo(() => statEntries.filter(s=>(!eventPlayer||(eventPlayer==='opponent'?!s.player_id||s.player_id===OPP_ID:s.player_id===eventPlayer))&&(!eventType||s.stat_type===eventType)), [statEntries, eventPlayer, eventType])
  const matchingClips = useMemo(() => eventType||eventPlayer==='opponent'?[]:clips.filter(c=>!eventPlayer||c.primary_player_id===eventPlayer||c.players?.some(p=>p.id===eventPlayer)), [clips, eventType, eventPlayer])
  const reviewEvents = useMemo(() => [...matchingStats.map(s=>({id:s.id,at:s.video_time_ms,clip:null as Clip|null})),...matchingClips.map(c=>({id:c.id,at:c.start_time_ms,clip:c}))].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)), [matchingStats, matchingClips])

  if (loading) return (
    <div className="cs min-h-screen flex items-center justify-center" style={{ background: 'var(--fr-bg)' }}>
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  // 'unauthorized' variant removed — 401 redirects immediately in the effect
  if (gameError === 'not_found') return (
    <div className="cs min-h-screen text-[#eee9df] flex flex-col items-center justify-center gap-4 text-center px-6" style={{ background: 'var(--fr-bg)' }}>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
        <AlertCircle className="w-6 h-6 text-white/30" />
      </div>
      <div>
        <p className="text-white/70 font-medium">Game unavailable</p>
        <p className="text-sm text-white/35 mt-1">This game doesn&apos;t exist or you don&apos;t have access to it.</p>
      </div>
      <Link href="/filmroom" className="fr-btn"><ChevronLeft className="w-4 h-4" /> Back to library</Link>
    </div>
  )

  if (gameError === 'error') return (
    <div className="cs min-h-screen text-[#eee9df] flex flex-col items-center justify-center gap-4 text-center px-6" style={{ background: 'var(--fr-bg)' }}>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
        <AlertCircle className="w-6 h-6 text-red-400/60" />
      </div>
      <div>
        <p className="text-white/70 font-medium">Something went wrong</p>
        <p className="text-sm text-white/35 mt-1">Failed to load game data. Check your connection and try again.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/filmroom" className="fr-btn"><ChevronLeft className="w-4 h-4" /> Back to library</Link>
        <button onClick={() => { setGameError(null); setLoading(true); setRetryKey(k => k + 1) }} className="fr-btn fr-btn-primary">Retry</button>
      </div>
    </div>
  )

  if (!game) return (
    <div className="cs min-h-screen flex items-center justify-center text-white/40" style={{ background: 'var(--fr-bg)' }}>
      <Loader2 className="w-6 h-6 animate-spin text-white/30" />
    </div>
  )

  const canSave = markIn !== null && markOut !== null && markOut - markIn >= MIN_CLIP_MS
  const videoLoaded = !!game.video_url
  const cursor=reviewEvents.findIndex(e=>e.id===reviewEventId&&currentMs>=reviewMoment(e.at,eventLead)-1000&&currentMs<=e.at+8000)
  const previousEvent=cursor>=0?reviewEvents[cursor-1]:[...reviewEvents].reverse().find(e=>e.at<currentMs-500)
  const nextEvent=cursor>=0?reviewEvents[cursor+1]:reviewEvents.find(e=>e.at>currentMs+500)
  const reviewAt=(at:number,id?:string)=>{setReviewEventId(id??matchingStats.find(s=>s.video_time_ms===at)?.id??null);seekAndPlay(reviewMoment(at,eventLead))}
  const visibleEvents=matchingStats.filter(s=>currentMs>=s.video_time_ms&&currentMs<s.video_time_ms+3500)
  const gameDate = new Date(game.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const sectionError = (text: string, onRetry: () => void) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(224,112,105,0.08)', border: '1px solid rgba(224,112,105,0.25)' }}>
      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--fr-bad)' }} aria-hidden />
      <span className="text-xs flex-1" style={{ color: '#f3b3ae' }}>{text}</span>
      <button onClick={onRetry} className="text-xs font-semibold underline underline-offset-2" style={{ color: 'var(--fr-bad)' }}>Retry</button>
    </div>
  )
  const dismissable = (text: string, onDismiss: () => void) => (
    <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(224,112,105,0.08)', border: '1px solid rgba(224,112,105,0.25)' }}>
      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--fr-bad)' }} aria-hidden />
      <span className="text-xs flex-1" style={{ color: '#f3b3ae' }}>{text}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-xs font-semibold" style={{ color: 'var(--fr-bad)' }}>Dismiss</button>
    </div>
  )

  return (
    <div ref={fullscreenRootRef} className="cs min-h-screen text-[#eee9df] flex flex-col" style={{ background: 'var(--fr-bg)' }}>
      {/* Presentation mode — full-screen overlay */}
      {showPresentation && presentationClips.length > 0 && (
        <PresentationModeLazy
          clips={presentationClips}
          onExit={() => setShowPresentation(false)}
        />
      )}

      {/* Top bar */}
      <header className="shrink-0 sticky top-0 z-40" style={{ background: 'rgba(20,20,18,0.92)', borderBottom: '1px solid var(--fr-line)', backdropFilter: 'none' }}>
        <div className="px-3 sm:px-4 h-14 flex items-center gap-3">
          <Link href="/filmroom" className="fr-icon-btn" aria-label="Back to library" style={{ borderColor: 'transparent' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="hidden sm:inline text-[12px] font-semibold shrink-0" style={{ color: 'var(--fr-ink3)' }}>Film Room</span>
            <span className="hidden sm:inline" style={{ color: 'var(--fr-line2)' }}>/</span>
            <span className="fr-display text-[20px] leading-none truncate">
              <EditableTitle
                value={game.opponent}
                onSave={async (val) => {
                  await fetch(`/api/filmroom/games/${gameId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent: val }) })
                  setGame(g => g ? { ...g, opponent: val } : g)
                }}
              />
            </span>
            <span className="text-[12px] shrink-0 ml-1" style={{ color: 'var(--fr-ink3)' }}>{gameDate}{game.session_type && game.session_type !== 'game' ? ` · ${game.session_type}` : ''}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden md:inline-flex fr-chip" title="Clips saved for this game">{clips.length} clip{clips.length === 1 ? '' : 's'}</span>
            {highlights.length > 0 && (
              <span className="hidden md:inline-flex fr-chip" style={{ color: '#fde68a', borderColor: 'rgba(250,204,21,0.35)' }}>
                <Star className="w-3 h-3 fill-current mr-1" aria-hidden /> {highlights.length}
              </span>
            )}
            <span className="hidden md:inline-flex fr-chip" title="Stats tagged for this game">{statEntries.length} stat{statEntries.length === 1 ? '' : 's'}</span>
            {game.video_url ? (
              <button onClick={() => setGame(g => g ? { ...g, video_url: null, video_id: null } : g)}
                className="fr-btn fr-btn-ghost" aria-label="Replace game video (upload new file)">
                <Upload className="w-3.5 h-3.5" aria-hidden />
                <span className="hidden sm:inline">Replace video</span>
              </button>
            ) : (
              <span className="fr-chip fr-chip-accent"><Upload className="w-3 h-3 mr-1" aria-hidden /><span className="hidden sm:inline">Drop video below</span></span>
            )}
            <AccountBar />
          </div>
        </div>
      </header>

      {/* ── Bento ── */}
      <main className="fr-bento flex-1">

        {/* Video tile */}
        <section
          aria-label="Game film"
          className={isFullscreen
            ? 'fixed inset-0 z-50 bg-black flex flex-col'
            : 'fr-tile overflow-hidden col-span-12 lg:col-span-8 flex flex-col'}
        >
          {/* Upload zone — shown when no video + not mid-upload */}
          {!game.video_url && !uploadDone && (
            <div className="p-3">
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--fr-line)' }}>
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
            </div>
          )}

          {game.video_url && (
            <div ref={videoFrameRef} className={`relative bg-black ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
              <VideoPlayer
                gameId={gameId}
                sourceKey={game.video_url}
                quality={playbackQuality}
                onFallback={()=>setPlaybackQuality('original')}
                onTimeUpdate={setCurrentMs}
                onDurationChange={setDurationMs}
                playerRef={videoRef}
                isFullscreen={isFullscreen}
              />
              {eventLabels && !drawingActive && visibleEvents.length>0 && (
                <div className={`absolute left-3 z-30 max-w-[75%] pointer-events-none space-y-1 ${clipPhase(markIn, markOut) === 'empty' ? 'top-3' : 'top-12'}`} aria-label="Current film events">
                  {visibleEvents.slice(0,3).map(e=><div key={e.id} className="rounded-lg px-3 py-1.5 text-[13px] font-semibold" style={{ background: 'rgba(12,12,12,0.78)', border: '1px solid rgba(238,233,223,0.14)' }}>{statDescription(e)}</div>)}
                  {visibleEvents.length>3&&<div className="text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(12,12,12,0.78)' }}>+{visibleEvents.length-3} more</div>}
                </div>
              )}
              <DrawingOverlay active={drawingActive} onDataChange={onDrawingChange} initialData={null} />

              {/* Tap-to-pause overlay — invisible div over video, doesn't block drawing */}
              {!drawingActive && (
                <div className="absolute inset-0 z-10" style={{ touchAction: 'manipulation' }} onClick={playPause} />
              )}

              {/* Jog wheel — appears when paused */}
              <div className="hidden sm:block"><JogWheel
                visible={!isPlaying && durationMs > 0}
                currentMs={currentMs}
                onScrub={(deltaMs) => {
                  const v = videoRef.current
                  if (!v || !v.duration) return
                  const next = Math.max(0, Math.min(v.duration, v.currentTime + deltaMs / 1000))
                  v.currentTime = next
                  setCurrentMs(Math.round(next * 1000))
                }}
                onTap={playPause}
              /></div>

              {!showSaveClip && <ClipHud markIn={markIn} markOut={markOut} />}
              <ClipToast toast={toast} onDone={clearToast} />

              {/* Fullscreen toggle */}
              <button
                onClick={() => void toggleFullscreen()}
                className="absolute top-3 right-3 z-20 fr-icon-btn"
                style={{ background: 'rgba(12,12,12,0.7)', borderColor: 'rgba(238,233,223,0.14)' }}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          )}
          {fullscreenError && <p role="alert" className="shrink-0 px-4 py-2 text-sm" style={{ color: 'var(--fr-bad)' }}>{fullscreenError}</p>}

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
            isFullscreen={isFullscreen}
            onStatTap={videoLoaded ? openStatPanel : undefined}
            onMarkIn={markInAt}
            onMarkOut={markOutAt}
            onSaveClip={canSave ? requestSaveClip : undefined}
            playbackSpeed={playbackSpeed}
            onSpeed={setPlaybackSpeed}
            drawingActive={drawingActive}
            onToggleDrawing={() => setDrawingActive(a => !a)}
            onToggleBookmark={() => setAddingBookmark(a => !a)}
            bookmarkDisabled={bookmarkPending}
            qualityControl={<PlaybackQualityControl gameId={gameId} sourceKey={game.video_url||''} quality={playbackQuality} onChange={setPlaybackQuality}/>}
          />}

          {game.video_url && (bookmarks.length > 0 || addingBookmark || bookmarkError) && (
            <div className="shrink-0 max-h-32 overflow-y-auto px-3 pb-2">
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
            </div>
          )}

          {/* Upload success banner — hidden in fullscreen */}
          {!isFullscreen && uploadDone && (
            <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(108,196,154,0.08)', border: '1px solid rgba(108,196,154,0.25)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--fr-good)' }} />
              <p className="text-xs" style={{ color: '#a9e3c6' }}>Video uploaded and ready — use the controls above to start marking clips.</p>
            </div>
          )}

          {!isFullscreen && game.video_url && (
            <div className="px-3 pb-3">
              <EventTimeline actions={<button aria-expanded={showEventSettings} onClick={()=>setShowEventSettings(v=>!v)} className="fr-btn" style={{ height: 32 }}>Events</button>} settings={showEventSettings && <section aria-label="Event display settings" className="shrink-0 max-h-48 overflow-y-auto rounded-xl p-3 mb-3 flex flex-wrap items-center gap-3 text-xs" style={{ background: 'var(--fr-tile2)', border: '1px solid var(--fr-line)' }}>
                <button aria-label="Previous event" title="Previous matching event" disabled={!previousEvent} onClick={()=>previousEvent&&reviewAt(previousEvent.at,previousEvent.id)} className="fr-btn" style={{ height: 32 }}>‹ Event</button>
                <button aria-label="Next event" title="Next matching event" disabled={!nextEvent} onClick={()=>nextEvent&&reviewAt(nextEvent.at,nextEvent.id)} className="fr-btn" style={{ height: 32 }}>Event ›</button>
                <label className="flex items-center gap-2 min-h-9"><input type="checkbox" checked={eventLabels} onChange={e=>setEventLabels(e.target.checked)}/>Show event labels on video</label>
                <select aria-label="Filter events by player" value={eventPlayer} onChange={e=>{setEventPlayer(e.target.value);setReviewEventId(null)}} className="fr-select" style={{ width: 'auto', minHeight: 32 }}><option value="">All players</option><option value="opponent">Opponent</option>{players.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select>
                <select aria-label="Filter events by stat" value={eventType} onChange={e=>{setEventType(e.target.value);setReviewEventId(null)}} className="fr-select" style={{ width: 'auto', minHeight: 32 }}><option value="">All stats and clips</option>{Object.entries(STAT_NAMES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
                <label className="flex items-center gap-2">Lead-in <select aria-label="Review lead-in" value={eventLead} onChange={e=>setEventLead(Number(e.target.value))} className="fr-select" style={{ width: 'auto', minHeight: 32 }}>{[3,5,10].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
                <span style={{ color: 'var(--fr-ink3)' }}>New stats save 2 seconds before the tagging position.</span>
              </section>} clips={matchingClips} stats={matchingStats} durationMs={durationMs} currentMs={currentMs} selectedId={activeClipId} leadIn={eventLead} onSeek={at=>reviewAt(at)} onClip={c=>{setActiveClipId(c.id);reviewAt(c.start_time_ms,c.id)}}/>
            </div>
          )}
        </section>

        {/* Right column: clip builder + clips */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0">
          <ClipBuilderTile
            markIn={markIn}
            markOut={markOut}
            currentMs={currentMs}
            onSetIn={markInAt}
            onSetOut={markOutAt}
            onLast10={instantClip}
            onClear={clearMarks}
            onSave={requestSaveClip}
            onSeek={seek}
          />

          <section className="fr-tile flex flex-col flex-1 min-h-0" aria-label="Saved clips" style={{ minHeight: 280 }}>
            <header className="fr-tile-head">
              <h2 className="fr-tile-title"><Scissors className="w-3.5 h-3.5" aria-hidden /> Clips <span className="fr-mono" style={{ color: 'var(--fr-ink3)' }}>{filteredClips.length}{filteredClips.length !== clips.length ? ` / ${clips.length}` : ''}</span></h2>
              {clips.length > 0 && (
                <button onClick={startPresentation} className="fr-btn fr-btn-ghost" style={{ height: 30, fontSize: 12 }} title="Play all saved clips in presentation mode">
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden /> Present
                </button>
              )}
            </header>
            <div className="px-3 pb-3 flex flex-col gap-2 flex-1 min-h-0">
              {clipsError && sectionError('Failed to load clips.', () => retrySection('clips'))}
              {clipDeleteError && dismissable(clipDeleteError, () => setClipDeleteError(null))}
              {clips.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  <select aria-label="Filter clips by tag" value={clipTag} onChange={e=>setClipTag(e.target.value)} className="fr-select" style={{ minHeight: 34, fontSize: 12 }}><option value="">All tags</option>{clipTags.map(t=><option key={t}>{t}</option>)}</select>
                  <select aria-label="Filter clips by category" value={clipCategory} onChange={e=>setClipCategory(e.target.value)} className="fr-select" style={{ minHeight: 34, fontSize: 12 }}><option value="">All categories</option>{Object.entries(CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
                  <select aria-label="Filter clips by player" value={clipPlayer} onChange={e=>setClipPlayer(e.target.value)} className="fr-select col-span-2" style={{ minHeight: 34, fontSize: 12 }}><option value="">All players</option>{players.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select>
                </div>
              )}
              <div className="fr-scroll flex-1 min-h-0 overflow-y-auto space-y-2 lg:max-h-[640px]">
                {clips.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Scissors className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--fr-ink3)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--fr-ink2)' }}>No clips yet</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fr-ink3)' }}>
                      Press <kbd className="fr-kbd">I</kbd> where a play starts and <kbd className="fr-kbd">O</kbd> where it ends, then <kbd className="fr-kbd">S</kbd> to save. The clip builder above shows every step.
                    </p>
                  </div>
                ) : !filteredClips.length ? (
                  <p className="py-6 text-center text-sm" style={{ color: 'var(--fr-ink3)' }}>No clips match these filters.</p>
                ) : (
                  filteredClips.map(clip => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      isActive={activeClipId === clip.id}
                      onSelect={toggleActiveClip}
                      onEdit={beginEditClip}
                      onDelete={deleteClip}
                      onJumpTo={jumpToClip}
                      onAddToPlaylist={openAddToPlaylist}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Box score tile */}
        <section className="fr-tile col-span-12 lg:col-span-8 flex flex-col min-h-0" aria-label="Box score">
          <header className="fr-tile-head">
            <h2 className="fr-tile-title"><BarChart2 className="w-3.5 h-3.5" aria-hidden /> Box score <span style={{ color: 'var(--fr-ink3)' }}>· vs {game.opponent}</span></h2>
            <div className="flex items-center gap-1.5">
              {sessionStatEntries.length > 0 && <span className="fr-chip fr-chip-good">+{sessionStatEntries.length} this session</span>}
              {videoLoaded && (
                <button onClick={openStatPanel} className="fr-btn fr-btn-primary" style={{ height: 30, fontSize: 12 }}>
                  <BarChart className="w-3.5 h-3.5" aria-hidden /> Tag stat <kbd className="fr-kbd fr-kbd-dark">T</kbd>
                </button>
              )}
              <button onClick={() => setStatsFullscreen(true)} className="fr-icon-btn" style={{ height: 30, width: 30 }} aria-label="Expand box score" title="Expand">
                <Maximize2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          </header>
          <div className="px-3 pb-3 fr-scroll overflow-x-auto">
            {statsError && sectionError('Failed to load stats.', () => retrySection('stats'))}
            {statDeleteError && dismissable(statDeleteError, () => setStatDeleteError(null))}
            <BoxScorePanel players={players} statEntries={statEntries} onSeek={seekAndPlay} onDeleteEntry={handleDeleteEntry} />
          </div>
        </section>

        {/* Shot chart + roster column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0">
          <ShotChartPanel statEntries={statEntries} players={players} onSeek={seekAndPlay} />
          <section className="fr-tile flex-1" aria-label="Roster">
            <header className="fr-tile-head">
              <h2 className="fr-tile-title"><Users className="w-3.5 h-3.5" aria-hidden /> Roster <span className="fr-mono" style={{ color: 'var(--fr-ink3)' }}>{activePlayers.length}</span></h2>
            </header>
            <div className="px-3 pb-3">
              {playersError && sectionError('Failed to load roster.', () => retrySection('players'))}
              <RosterPanel
                players={activePlayers}
                teamId={game.team_id}
                onPlayerAdded={p => setPlayers(prev => [...prev, p])}
                onPlayerArchived={id => setPlayers(prev => prev.map(p =>
                  p.id === id ? { ...p, archived_at: new Date().toISOString() } : p
                ))}
                onPlayerRestored={p => setPlayers(prev => prev.map(x =>
                  x.id === p.id ? { ...x, archived_at: null } : x
                ))}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Full-screen box score (phone / explicit expand) */}
      {statsFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--fr-bg)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--fr-line)' }}>
            <div>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--fr-ink3)' }}>Box score</p>
              <p className="fr-display text-[24px] leading-none">vs {game.opponent}</p>
            </div>
            <button onClick={() => setStatsFullscreen(false)} className="fr-btn" style={{ touchAction: 'manipulation' }}>
              <Minimize2 className="w-3.5 h-3.5" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-5 fr-scroll">
            {statDeleteError && dismissable(statDeleteError, () => setStatDeleteError(null))}
            <BoxScorePanel players={players} statEntries={statEntries} onSeek={(ms) => { setStatsFullscreen(false); seekAndPlay(ms) }} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      )}

      {/* Modals stay descendants of the same fullscreen root. */}
      {editingClip && <SaveClipDialog existingClip={editingClip} gameId={gameId} teamId={game.team_id}
        startMs={editingClip.start_time_ms} endMs={editingClip.end_time_ms} players={players}
        drawingData={editingClip.drawing_data} videoDurationMs={durationMs}
        onClose={()=>setEditingClip(null)} onSave={updated=>{setClips(cs=>cs.map(c=>c.id===updated.id?updated:c)); showToast(`Clip updated · ${updated.title}`)}}/>}
      {showSaveClip && markIn !== null && markOut !== null && (
        <SaveClipDialog
          gameId={gameId}
          teamId={game.team_id}
          startMs={markIn}
          endMs={markOut}
          players={activePlayers}
          drawingData={drawingData}
          videoDurationMs={durationMs}
          onClose={() => setShowSaveClip(false)}
          onSave={(clip) => {
            setClips(c => [...c, clip])
            setMarkIn(null)
            setMarkOut(null)
            setDrawingActive(false)
            setDrawingData(null)
            setActiveClipId(clip.id)
            showToast(`Clip saved · ${clip.title}`)
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

      {/* Tag Stat modal — centred on the video frame, fixed size while open */}
      {showStatPanel && (
        <StatTagModal
          gameId={gameId}
          players={activePlayers}
          currentMs={statAnchorMs}
          sessionEntries={sessionStatEntries}
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
          anchorRef={videoFrameRef}
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
// Manual shot chart: court drawn to scale + normalized [0,1] coordinates from stat_entries.
// Clicking a made/miss marker seeks the video to that moment. Coaches place shots while tagging;
// nothing here is tracked automatically.

const ZONE_ORDER: ZoneFamily[] = ['rim', 'paint', 'mid', 'three']
const ZONE_LABEL: Record<ZoneFamily, string> = { rim: 'Rim', paint: 'Paint', mid: 'Mid-range', three: '3PT' }

const ShotChartPanel = React.memo(function ShotChartPanel({
  statEntries, players, onSeek,
}: {
  statEntries: StatEntry[]
  players: Player[]
  onSeek: (ms: number) => void
}) {
  const [playerFilter, setPlayerFilter] = useState<string>('all')

  const shotEntries = useMemo(() => statEntries.filter(
    (e): e is StatEntry & { shot_x: number; shot_y: number } =>
      LOCATED_SHOT_TYPES.has(e.stat_type) && typeof e.shot_x === 'number' && typeof e.shot_y === 'number'
  ), [statEntries])

  const filtered = useMemo(() => playerFilter === 'all' ? shotEntries : shotEntries.filter(e => e.player_id === playerFilter), [shotEntries, playerFilter])

  const markers: CourtMarker[] = useMemo(() => filtered.map(e => ({
    id: e.id, x: e.shot_x, y: e.shot_y, made: e.stat_type.endsWith('M'),
    title: `${entryWho(e)} · ${statLabel(e.stat_type)} · ${shotZone({ x: e.shot_x, y: e.shot_y }).label} · ${msToDisplay(e.video_time_ms)} — click to watch`,
    onClick: () => onSeek(e.video_time_ms),
  })), [filtered, onSeek])

  const zones = useMemo(() => {
    const acc: Record<ZoneFamily, { made: number; att: number }> = { rim: { made: 0, att: 0 }, paint: { made: 0, att: 0 }, mid: { made: 0, att: 0 }, three: { made: 0, att: 0 } }
    for (const e of filtered) {
      const z = shotZone({ x: e.shot_x, y: e.shot_y }).family
      acc[z].att += 1
      if (e.stat_type.endsWith('M')) acc[z].made += 1
    }
    return acc
  }, [filtered])

  const made = filtered.filter(e => e.stat_type.endsWith('M')).length
  const att = filtered.length
  const shooters = useMemo(() => players.filter(p => shotEntries.some(e => e.player_id === p.id)), [players, shotEntries])

  return (
    <section className="fr-tile" aria-label="Shot chart">
      <header className="fr-tile-head">
        <h2 className="fr-tile-title"><ZoomIn className="w-3.5 h-3.5" aria-hidden /> Shot chart
          {att > 0 && <span className="fr-mono" style={{ color: 'var(--fr-ink3)' }}>{made}/{att} · {Math.round(made / att * 100)}%</span>}
        </h2>
        {shooters.length > 0 && (
          <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} aria-label="Filter shots by player" className="fr-select" style={{ width: 'auto', minHeight: 30, padding: '4px 28px 4px 10px', fontSize: 12 }}>
            <option value="all">Everyone</option>
            {shooters.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name.split(' ')[0]}</option>)}
          </select>
        )}
      </header>
      <div className="px-3 pb-3 space-y-2.5">
        <Court markers={markers} ariaLabel={att ? `Shot chart with ${att} shots` : 'Shot chart'} caption={att === 0 ? 'Shots you tag land here' : null} />
        {att === 0 ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--fr-ink3)' }}>Tag a made or missed field goal and tap where it was taken. Free throws are tracked in the box score, not on the court.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              {ZONE_ORDER.map(z => {
                const { made: m, att: a } = zones[z]
                return (
                  <div key={z} className="fr-cell px-2 py-1.5 text-center">
                    <div className="text-[10.5px] font-semibold" style={{ color: 'var(--fr-ink3)' }}>{ZONE_LABEL[z]}</div>
                    <div className="fr-display text-[17px] leading-none mt-0.5 tabular-nums" style={{ color: a ? 'var(--fr-ink)' : 'var(--fr-ink3)' }}>{a ? `${m}/${a}` : '–'}</div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--fr-ink3)' }}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#d9774a', boxShadow: '0 0 0 1px rgba(238,233,223,0.9)' }} /> Made</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ border: '1.5px solid rgba(238,233,223,0.85)' }} /> Missed</span>
              <span className="ml-auto">Tap a shot to watch it</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
})

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
// Players are archived (soft-deleted) to preserve historical stat_entries and
// clip_player associations. Archived players are hidden from the active roster,
// stat/clip modals, but their historical box score rows
// remain valid. A Restore button reinstates archived players to the active
// roster without losing any history.

const RosterPanel = React.memo(function RosterPanel({ players, teamId, onPlayerAdded, onPlayerArchived, onPlayerRestored }: {
  players: Player[] // active players only
  teamId: string
  onPlayerAdded: (p: Player) => void
  onPlayerArchived: (id: string) => void
  onPlayerRestored: (p: Player) => void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '', parent_email: '' })
  const [loading, setLoading] = useState(false)
  // Archived players loaded lazily when "Show archived" is toggled
  const [archivedPlayers, setArchivedPlayers] = useState<Player[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null) // playerId
  // Broad lock: prevent any concurrent archive/restore mutation while one is in-flight
  const rosterMutating = useRef(false)

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
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
        return
      }
      const player = await res.json()
      onPlayerAdded(player)
      setForm({ name: '', number: '', position: '', parent_email: '' })
      setAdding(false)
    } catch {
      alert('Network error — player was not added. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Archive (soft-delete): removes from active roster, preserves all stats/clips.
  // Requires explicit confirmation. No destructive fallback if server lacks the
  // archived_at column (migration 022 not applied) — server returns 500 and we
  // surface that error; player is NOT removed from local state in that case.
  const archivePlayer = async (id: string, name: string) => {
    if (!window.confirm(
      `Archive ${name}?\n\nThis removes them from the active roster and tag choices. ` +
      `All historical stats and clip tags are preserved. You can restore them later.`
    )) return
    if (rosterMutating.current) return // block concurrent mutations
    rosterMutating.current = true
    setActionInFlight(id)
    setArchiveError(null)
    try {
      const res = await fetch(`/api/filmroom/players/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setArchiveError(err.error ?? 'Could not archive player. Please try again.')
        return
      }
      // Update parent state: mark archived_at (preserves historical data in full state)
      onPlayerArchived(id)
      // Refresh archived list if panel is open; otherwise invalidate so it reloads fresh
      if (showArchived) {
        void loadArchived()
      } else {
        setArchivedPlayers([])
      }
    } catch {
      setArchiveError('Network error — player was not archived. Check your connection and try again.')
    } finally {
      setActionInFlight(null)
      rosterMutating.current = false
    }
  }

  const loadArchived = async () => {
    setArchivedLoading(true)
    try {
      const res = await fetch(`/api/filmroom/players?team_id=${teamId}&include_archived=true`)
      if (!res.ok) throw new Error('Failed to load archived players')
      const all: Player[] = await res.json()
      // Filter to archived only (have archived_at)
      setArchivedPlayers(all.filter((p: Player & { archived_at?: string | null }) => p.archived_at))
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Could not load archived players')
    } finally {
      setArchivedLoading(false)
    }
  }

  const handleToggleArchived = () => {
    const next = !showArchived
    setShowArchived(next)
    if (next && archivedPlayers.length === 0) loadArchived()
  }

  const restorePlayer = async (id: string) => {
    if (rosterMutating.current) return // block concurrent mutations
    rosterMutating.current = true
    setActionInFlight(id)
    setArchiveError(null)
    try {
      const res = await fetch(`/api/filmroom/players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setArchiveError(err.error ?? 'Could not restore player. Please try again.')
        return
      }
      const restored: Player = await res.json()
      onPlayerRestored(restored)
      setArchivedPlayers(prev => prev.filter(p => p.id !== id))
    } catch {
      setArchiveError('Network error — player was not restored. Check your connection and try again.')
    } finally {
      setActionInFlight(null)
      rosterMutating.current = false
    }
  }

  return (
    <div className="space-y-2">
      {archiveError && (
        <div role="alert" className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          {archiveError}
        </div>
      )}
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
            {p.number ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{p.name}</p>
            {p.position && <p className="text-[10px] text-white/35">{p.position}</p>}
          </div>
          <button
            onClick={() => archivePlayer(p.id, p.name)}
            disabled={actionInFlight === p.id}
            aria-label={`Archive ${p.name} (#${p.number ?? '?'}) — preserves stats and clips`}
            className="p-1 rounded-lg text-white/20 hover:text-amber-400 transition-colors disabled:opacity-40"
            title="Archive player (stats and clips are preserved)">
            {actionInFlight === p.id
              ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
              : <X className="w-3 h-3" aria-hidden />}
          </button>
        </div>
      ))}

      {/* Archived players section */}
      <div className="pt-1">
        <button
          onClick={handleToggleArchived}
          className="text-[10px] text-white/30 hover:text-white/55 underline underline-offset-2 transition-colors">
          {showArchived ? 'Hide archived players' : 'Show archived players'}
        </button>
      </div>
      {showArchived && (
        <div className="space-y-1.5">
          {archivedLoading && (
            <div className="flex items-center gap-2 text-xs text-white/40 px-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading archived…
            </div>
          )}
          {!archivedLoading && archivedPlayers.length === 0 && (
            <p className="text-xs text-white/25 px-1">No archived players.</p>
          )}
          {archivedPlayers.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/2 border border-white/5 opacity-60">
              <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-xs font-bold text-white/40">
                {p.number ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/50 truncate">{p.name}</p>
                <p className="text-[10px] text-white/30">Archived · stats preserved</p>
              </div>
              <button
                onClick={() => restorePlayer(p.id)}
                disabled={actionInFlight === p.id}
                aria-label={`Restore ${p.name} to active roster`}
                className="px-2 py-1 rounded-lg text-[10px] font-medium border border-white/15 text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40">
                {actionInFlight === p.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Divider: stats/clip note */}
      <p className="text-[10px] text-white/20 px-1 leading-relaxed">
        Archiving removes a player from the active roster and tag choices. Historical stats and clip tags are always preserved.
      </p>

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
})
