'use client'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, Loader2, Undo2, Redo2 } from 'lucide-react'
import type { Player } from '@/types/filmroom'
import { statMoment } from '@/lib/filmroom-events'
import { msToDisplay } from '@/lib/filmroom-time'
import {
  STAT_DEFS, LOCATED_SHOT_TYPES, SHOT_TYPES_SET, OPP_ID, OPP_PLAYER, rawToEntry, statLabel, entryWho, entryPoints,
  type StatEntry, type RawStatEntry, type StatType, type StatDef,
} from '@/lib/filmroom-stats'
import { Court, shotZone, type CourtPoint } from './Court'

// ─── Tag Stat modal ───────────────────────────────────────────────────────────
// Flow is unchanged: video pauses → pick the stat → pick who → (field goals) tap where.
// What changed: it is a centred, fixed-size card over the video frame. The frame is
// measured once when it opens (and again only on window resize), so nothing jumps
// while you work through the steps. No backdrop blur — cheap to paint on an iPad.

interface Frame { left: number; top: number; width: number; height: number }

export const CARD_W = 720
export const CARD_H = 540

/** One size for the whole session (clamped only by the viewport), centred on the video frame when it is on screen. */
function measureFrame(anchor: HTMLElement | null): Frame {
  const vw = window.innerWidth, vh = window.innerHeight
  const width = Math.round(Math.min(CARD_W, vw - 16))
  const height = Math.round(Math.min(CARD_H, vh - 16))
  const r = anchor?.getBoundingClientRect()
  const onScreen = !!r && r.width > 0 && r.height > 0 && r.bottom > 80 && r.top < vh - 80
  const cx = onScreen && r ? r.left + r.width / 2 : vw / 2
  const cy = onScreen && r ? r.top + r.height / 2 : vh / 2
  const left = Math.round(Math.max(8, Math.min(cx - width / 2, vw - width - 8)))
  const top = Math.round(Math.max(8, Math.min(cy - height / 2, vh - height - 8)))
  return { left, top, width, height }
}

export interface StatTagModalProps {
  gameId: string
  players: Player[]
  currentMs: number
  sessionEntries: StatEntry[]
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
  /** The video frame the card centres on; falls back to the viewport when the frame is too small. */
  anchorRef: React.RefObject<HTMLElement | null>
}

type Step = 1 | 2 | 3

export function StatTagModal({
  gameId, players, currentMs, sessionEntries, onLog, onUndo, onRedo,
  canUndo, canRedo, undoPending, redoPending, undoError, redoError, onClose, anchorRef,
}: StatTagModalProps) {
  const [frame, setFrame] = useState<Frame | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [stat, setStat] = useState<StatType | null>(null)
  const [who, setWho] = useState<Player | null>(null)
  const [staged, setStaged] = useState<CourtPoint | null>(null)
  const [hover, setHover] = useState<CourtPoint | null>(null)
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [flash, setFlash] = useState<StatEntry | null>(null)
  const [jersey, setJersey] = useState('')
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const courtWrapRef = useRef<HTMLDivElement>(null)
  const jerseyTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)
  // Position is captured when the modal opens so the logged time matches the frame the coach paused on.
  const openedAtMs = useRef(currentMs)

  // Measure once on open; re-measure only when the window itself changes.
  useLayoutEffect(() => {
    const apply = () => setFrame(measureFrame(anchorRef.current))
    apply()
    const raf = window.requestAnimationFrame(() => setVisible(true))
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      if (jerseyTimer.current !== null) window.clearTimeout(jerseyTimer.current)
    }
  }, [anchorRef])

  const focusedOnce = useRef(false)
  useEffect(() => {
    if (!frame || focusedOnce.current) return
    focusedOnce.current = true
    dialogRef.current?.focus({ preventScroll: true })
  }, [frame])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 1700)
    return () => window.clearTimeout(t)
  }, [flash])

  const allPlayers = useMemo(() => [...players, OPP_PLAYER], [players])
  const made = STAT_DEFS.filter(d => d.col === 'made')
  const miss = STAT_DEFS.filter(d => d.col === 'miss')
  const other = STAT_DEFS.filter(d => d.col === 'other')
  const def: StatDef | undefined = stat ? STAT_DEFS.find(d => d.key === stat) : undefined
  const needsLocation = !!stat && LOCATED_SHOT_TYPES.has(stat)

  const sessionPts = useCallback((playerId: string) =>
    sessionEntries.reduce((n, e) => e.player_id === playerId ? n + entryPoints(e) : n, 0), [sessionEntries])

  const dismiss = useCallback(() => {
    if (closeTimer.current !== null) return
    setVisible(false)
    closeTimer.current = window.setTimeout(onClose, 150)
  }, [onClose])

  const reset = () => { setStat(null); setWho(null); setStaged(null); setHover(null); setJersey(''); setStep(1) }

  const goBack = useCallback(() => {
    if (logging) return
    setLogError(null)
    if (step === 3) { setStaged(null); setWho(null); setStep(2) }
    else if (step === 2) { setStat(null); setJersey(''); setStep(1) }
  }, [logging, step])

  const commit = useCallback(async (s: StatType, p: Player, shot: CourtPoint | null) => {
    if (logging) return
    setLogging(true); setLogError(null)
    try {
      const body: Record<string, unknown> = {
        game_id: gameId,
        player_id: p.id === OPP_ID ? null : p.id,
        stat_type: s,
        video_time_ms: statMoment(openedAtMs.current),
      }
      if (shot && SHOT_TYPES_SET.has(s)) { body.shot_x = shot.x; body.shot_y = shot.y }
      const res = await fetch('/api/filmroom/stat-entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      const raw: RawStatEntry = await res.json()
      const entry: StatEntry = p.id === OPP_ID
        ? { ...rawToEntry(raw), player_id: OPP_ID, player_name: 'Opponent', player_number: 'OPP' }
        : rawToEntry(raw)
      onLog(entry)
      setFlash(entry)
      reset()
    } catch {
      setLogError('That stat was not saved. Try again.')
      setStaged(null)
    } finally {
      setLogging(false)
    }
  }, [gameId, logging, onLog])

  const pickStat = (s: StatType) => { if (logging) return; setLogError(null); setStat(s); setWho(null); setStaged(null); setStep(2) }
  const pickWho = useCallback((p: Player) => {
    if (!stat || logging) return
    setWho(p); setJersey('')
    if (LOCATED_SHOT_TYPES.has(stat)) { setStaged(null); setStep(3) }
    else void commit(stat, p, null)
  }, [stat, logging, commit])

  const place = (pt: CourtPoint) => {
    if (!stat || !who || logging) return
    setStaged(pt)
    void commit(stat, who, pt)
  }
  const saveWithoutLocation = () => { if (stat && who && !logging) void commit(stat, who, null) }

  // Keyboard: Escape steps back (closes from step 1); digits pick a jersey in step 2; O = opponent.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); if (step === 1) dismiss(); else goBack(); return }
      if (step !== 2 || logging) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        const next = (jersey + e.key).slice(-2)
        setJersey(next)
        if (jerseyTimer.current !== null) window.clearTimeout(jerseyTimer.current)
        const exact = players.filter(p => String(p.number ?? '') === next)
        const prefix = players.filter(p => String(p.number ?? '').startsWith(next))
        if (exact.length === 1 && prefix.length === 1) { pickWho(exact[0]); return }
        jerseyTimer.current = window.setTimeout(() => {
          const hit = players.find(p => String(p.number ?? '') === next)
          if (hit) pickWho(hit)
          setJersey('')
        }, 650)
      } else if (e.key === 'o' || e.key === 'O') { e.preventDefault(); pickWho(OPP_PLAYER) }
      else if (e.key === 'Backspace') { setJersey(j => j.slice(0, -1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, jersey, players, logging, dismiss, goBack, pickWho])

  // Court keyboard: arrows nudge, Enter/Space saves
  const onCourtKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) return
    e.preventDefault()
    if (e.key === 'Enter' || e.key === ' ') { if (staged) place(staged); return }
    setStaged(p => {
      const x = p?.x ?? 0.5, y = p?.y ?? 0.3
      return {
        x: Math.max(0, Math.min(1, x + (e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowLeft' ? -0.02 : 0))),
        y: Math.max(0, Math.min(1, y + (e.key === 'ArrowDown' ? 0.02 : e.key === 'ArrowUp' ? -0.02 : 0))),
      }
    })
  }

  // Focus trap (Tab cycles inside the card)
  const onDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.key !== 'Tab') return
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0)
    if (!nodes.length) return
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  useEffect(() => {
    if (step !== 3) return
    const svg = courtWrapRef.current?.querySelector<SVGSVGElement>('svg')
    if (svg && typeof svg.focus === 'function') svg.focus({ preventScroll: true })
  }, [step])

  const title = step === 1 ? 'What happened?' : step === 2 ? 'Who?' : 'Where?'
  const zoneLabel = (staged ?? hover) ? shotZone((staged ?? hover)!).label : null
  const recent = sessionEntries.slice(-3).reverse()
  const compact = (frame?.width ?? CARD_W) < 480

  if (!frame) return null

  return (
    <div className="fixed inset-0 z-[60]" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0" aria-hidden onClick={dismiss}
        style={{ background: 'rgba(8,8,8,0.62)', opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tag a stat"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="fr-card fixed flex flex-col outline-none"
        style={{
          left: frame.left, top: frame.top, width: frame.width, height: frame.height,
          background: 'var(--fr-tile)', border: '1px solid var(--fr-line2)', borderRadius: 20,
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4)',
          opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.985)',
          transition: 'opacity 150ms ease, transform 150ms ease', overflow: 'hidden',
        }}
      >
        {/* ── Header (fixed 60px) ── */}
        <div className="shrink-0 flex items-center gap-2 px-3 border-b" style={{ height: 60, borderColor: 'var(--fr-line)' }}>
          <button
            onClick={goBack}
            disabled={logging || step === 1}
            aria-label="Back"
            className="fr-icon-btn shrink-0"
            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5" aria-hidden>
              {[1, 2, 3].map(s => (
                <span key={s} className="h-1 rounded-full" style={{
                  width: s === step ? 22 : 10, transition: 'width 160ms ease, background 160ms ease',
                  background: s === step ? 'var(--fr-accent)' : s < step ? 'rgba(198,106,62,0.5)' : 'var(--fr-line2)',
                }} />
              ))}
              <span className="ml-2 text-[11px] font-semibold tabular-nums" style={{ color: 'var(--fr-ink3)' }}>{step}/3</span>
            </div>
            <div className="relative mt-0.5" style={{ height: 22 }}>
              <div className="absolute inset-0 flex items-center gap-2 min-w-0" style={{ opacity: flash ? 0 : 1, transition: 'opacity 120ms' }}>
                <span className="fr-display text-[19px] leading-none truncate" style={{ color: 'var(--fr-ink)' }}>{title}</span>
                {step > 1 && def && (
                  <span className={`fr-chip ${def.col === 'made' ? 'fr-chip-good' : def.col === 'miss' || def.redTint ? 'fr-chip-bad' : ''}`}>{def.label}</span>
                )}
                {step === 3 && who && <span className="fr-chip">{who.id === OPP_ID ? 'Opponent' : `#${who.number ?? '?'} ${who.name.split(' ')[0]}`}</span>}
              </div>
              {flash && (
                <div role="status" className="absolute inset-0 flex items-center gap-1.5 min-w-0" style={{ color: 'var(--fr-good)' }}>
                  <Check className="w-4 h-4 shrink-0" aria-hidden />
                  <span className="text-[13px] font-semibold truncate">
                    Saved · {statLabel(flash.stat_type)} · {entryWho(flash)} · {msToDisplay(flash.video_time_ms)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className="fr-mono hidden sm:inline text-[13px] tabular-nums shrink-0" style={{ color: 'var(--fr-ink3)' }} title="Stats save 2 seconds before the paused frame">
            {msToDisplay(statMoment(openedAtMs.current))}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => canUndo && onUndo()} disabled={!canUndo || undoPending} className="fr-icon-btn" aria-label="Undo last stat" title="Undo last stat">
              {undoPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Undo2 className="w-4 h-4" aria-hidden />}
            </button>
            <button onClick={() => canRedo && onRedo()} disabled={!canRedo || redoPending} className="fr-icon-btn" aria-label="Redo" title="Redo">
              {redoPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Redo2 className="w-4 h-4" aria-hidden />}
            </button>
            <button onClick={dismiss} className="fr-btn fr-btn-primary ml-1" style={{ height: 36, paddingInline: 14 }}>
              Done
            </button>
          </div>
        </div>

        {(undoError || redoError || logError) && (
          <p role="alert" className="shrink-0 px-4 py-1.5 text-xs" style={{ color: 'var(--fr-bad)', background: 'rgba(217,99,90,0.08)' }}>
            {logError ?? undoError ?? redoError}
          </p>
        )}

        {/* ── Body (fills the rest; panes never change the card size) ── */}
        <div className="relative flex-1 min-h-0">
          {step === 1 && (
            <div key="s1" className="fr-pane fr-scroll absolute inset-0 flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto overscroll-contain">
              <Section label="Made" tone="good">
                <div className="grid grid-cols-3 gap-2 h-full auto-rows-fr">
                  {made.map(d => <StatButton key={d.key} def={d} onClick={() => pickStat(d.key)} disabled={logging} />)}
                </div>
              </Section>
              <Section label="Missed" tone="bad">
                <div className="grid grid-cols-3 gap-2 h-full auto-rows-fr">
                  {miss.map(d => <StatButton key={d.key} def={d} onClick={() => pickStat(d.key)} disabled={logging} />)}
                </div>
              </Section>
              <Section label="Everything else" grow={2}>
                <div className="grid grid-cols-4 gap-2 h-full auto-rows-fr">
                  {other.map(d => <StatButton key={d.key} def={d} onClick={() => pickStat(d.key)} disabled={logging} />)}
                </div>
              </Section>
            </div>
          )}

          {step === 2 && stat && (
            <div key="s2" className="fr-pane filmroom-scroll-area absolute inset-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 84 : 100}px, 1fr))` }}>
                {allPlayers.map(p => {
                  const isOpp = p.id === OPP_ID
                  const num = String(p.number ?? '')
                  const typedMatch = jersey && num.startsWith(jersey)
                  return (
                    <button
                      key={p.id}
                      onClick={() => pickWho(p)}
                      disabled={logging}
                      aria-label={isOpp ? 'Opponent' : `#${p.number ?? '?'} ${p.name}`}
                      className="fr-tilebtn flex flex-col items-center justify-center gap-0.5 px-1"
                      style={{
                        minHeight: compact ? 84 : 98, touchAction: 'manipulation',
                        borderColor: typedMatch ? 'var(--fr-accent)' : undefined,
                        background: isOpp ? 'var(--fr-tile2)' : undefined,
                      }}
                    >
                      <span className="fr-display leading-none tabular-nums" style={{ fontSize: isOpp ? 22 : compact ? 36 : 44, color: isOpp ? 'var(--fr-ink2)' : 'var(--fr-ink)' }}>
                        {isOpp ? 'OPP' : (p.number ?? '?')}
                      </span>
                      <span className="text-[12px] leading-tight text-center truncate w-full" style={{ color: 'var(--fr-ink2)' }}>{isOpp ? 'Opponent' : p.name.split(' ')[0]}</span>
                      {!isOpp && <span className="text-[10px] tabular-nums" style={{ color: 'var(--fr-ink3)' }}>{sessionPts(p.id)} pts today</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && stat && who && (
            <div key="s3" ref={courtWrapRef} className="fr-pane absolute inset-0 flex items-center justify-center p-3">
              <div style={{ width: '100%', maxWidth: 'min(100%, calc((100cqh - 24px) * 50 / 47))' }} className="fr-court-fit">
                <Court
                  interactive
                  tabIndex={0}
                  staged={staged}
                  onPlace={place}
                  onHover={setHover}
                  onKeyDown={onCourtKey}
                  dimmed={logging}
                  caption={logging ? 'Saving…' : zoneLabel ?? 'Tap where the shot was taken'}
                  ariaLabel="Shot location. Tap the court, or use the arrow keys and press Enter."
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (fixed 52px) ── */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 border-t text-[12px]" style={{ height: 52, borderColor: 'var(--fr-line)', color: 'var(--fr-ink2)' }}>
          {step === 1 && (
            recent.length ? (
              <>
                <span className="shrink-0 font-semibold" style={{ color: 'var(--fr-ink3)' }}>{sessionEntries.length} tagged this session</span>
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  {recent.map(e => (
                    <span key={e.id} className="fr-chip shrink-0" title={`${statLabel(e.stat_type)} · ${entryWho(e)}`}>
                      <span style={{ color: 'var(--fr-ink)' }}>{entryWho(e)}</span>
                      <span className="mx-1" style={{ color: 'var(--fr-ink3)' }}>·</span>
                      {STAT_DEFS.find(d => d.key === e.stat_type)?.short ?? e.stat_type}
                      <span className="fr-mono ml-1.5 tabular-nums" style={{ color: 'var(--fr-ink3)' }}>{msToDisplay(e.video_time_ms)}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : <span>Pick the stat, then the player. Field goals ask where the shot came from.</span>
          )}
          {step === 2 && (
            <>
              <span className="min-w-0 truncate">
                {needsLocation ? 'Tap the player, then place the shot.' : 'Tap the player to save.'}
                <span className="hidden sm:inline" style={{ color: 'var(--fr-ink3)' }}> Type a jersey number · <kbd className="fr-kbd">O</kbd> for opponent</span>
              </span>
              <span className="ml-auto fr-display text-[20px] tabular-nums shrink-0" style={{ color: jersey ? 'var(--fr-accent)' : 'transparent', minWidth: 40, textAlign: 'right' }} aria-live="polite">
                #{jersey || '–'}
              </span>
              {logging && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />}
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={goBack} disabled={logging} className="fr-btn" style={{ height: 34 }}>Back</button>
              <span className="flex-1 min-w-0 truncate text-center" style={{ color: 'var(--fr-ink3)' }}>
                {staged ? shotZone(staged).label : 'Tap once to place and save'}
              </span>
              <button onClick={saveWithoutLocation} disabled={logging} className="fr-btn" style={{ height: 34 }}>Save without location</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, tone, grow = 1, children }: { label: string; tone?: 'good' | 'bad'; grow?: number; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col min-h-0" style={{ flex: `${grow} 1 0` }}>
      <p className="shrink-0 mb-1.5 text-[11px] font-semibold tracking-wide" style={{ color: tone === 'good' ? 'var(--fr-good)' : tone === 'bad' ? 'var(--fr-bad)' : 'var(--fr-ink3)' }}>{label}</p>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}

function StatButton({ def, onClick, disabled }: { def: StatDef; onClick: () => void; disabled: boolean }) {
  const tone = def.col === 'made' ? 'good' : def.col === 'miss' || def.redTint ? 'bad' : 'plain'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fr-tilebtn fr-tilebtn-${tone} flex items-center justify-center text-center font-semibold`}
      style={{ touchAction: 'manipulation', fontSize: 14, minHeight: 40 }}
    >
      {def.label}
    </button>
  )
}

