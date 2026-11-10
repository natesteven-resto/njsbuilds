'use client'
import React, { useEffect } from 'react'
import { Scissors, Eraser, Zap } from 'lucide-react'
import { msToTimecode, formatDuration } from '@/lib/filmroom-time'

// ─── Clip builder ─────────────────────────────────────────────────────────────
// One tile that always tells you where you are: no in point → in set → out set → ready.
// I / O / Q / S keep working exactly as before; this just makes the state visible.

export const MIN_CLIP_MS = 500

export type ClipPhase = 'empty' | 'in' | 'out' | 'ready' | 'short'

export function clipPhase(markIn: number | null, markOut: number | null): ClipPhase {
  if (markIn === null && markOut === null) return 'empty'
  if (markIn !== null && markOut === null) return 'in'
  if (markIn === null && markOut !== null) return 'out'
  return (markOut! - markIn!) >= MIN_CLIP_MS ? 'ready' : 'short'
}

export function clipHint(markIn: number | null, markOut: number | null): { step: string; text: string } {
  switch (clipPhase(markIn, markOut)) {
    case 'empty': return { step: '1 of 2', text: 'Play to where the play starts, then press I or tap In.' }
    case 'in':    return { step: '2 of 2', text: `In set at ${msToTimecode(markIn!)}. Press O where the play ends.` }
    case 'out':   return { step: '1 of 2', text: `Out set at ${msToTimecode(markOut!)}. Press I where the play starts.` }
    case 'short': return { step: 'Adjust', text: 'A clip needs at least half a second between In and Out.' }
    case 'ready': return { step: 'Ready', text: `${formatDuration(markIn!, markOut!)} clip marked. Press S to save it.` }
  }
}

/** Normalise a pair of marks so In is always before Out. */
export function orderMarks(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a]
}

interface TileProps {
  markIn: number | null
  markOut: number | null
  currentMs: number
  onSetIn: () => void
  onSetOut: () => void
  onLast10: () => void
  onClear: () => void
  onSave: () => void
  onSeek: (ms: number) => void
}

export const ClipBuilderTile = React.memo(function ClipBuilderTile({ markIn, markOut, currentMs, onSetIn, onSetOut, onLast10, onClear, onSave, onSeek }: TileProps) {
  const phase = clipPhase(markIn, markOut)
  const hint = clipHint(markIn, markOut)
  const ready = phase === 'ready'
  const hasAny = markIn !== null || markOut !== null
  return (
    <section className="fr-tile flex flex-col" aria-label="Clip builder">
      <header className="fr-tile-head">
        <h2 className="fr-tile-title"><Scissors className="w-3.5 h-3.5" aria-hidden /> Clip builder</h2>
        <span className={`fr-chip ${ready ? 'fr-chip-good' : ''}`} aria-live="polite">{hint.step}</span>
      </header>
      <div className="px-3 pb-3 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <MarkCell label="In" value={markIn} kbd="I" active={phase === 'empty' || phase === 'out'} onSet={onSetIn} onSeek={onSeek} />
          <MarkCell label="Out" value={markOut} kbd="O" active={phase === 'in'} onSet={onSetOut} onSeek={onSeek} />
        </div>
        <p className="text-[12px] leading-snug min-h-[2.4em]" style={{ color: ready ? 'var(--fr-ink)' : 'var(--fr-ink2)' }}>{hint.text}</p>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button onClick={onSave} disabled={!ready} className="fr-btn fr-btn-primary justify-center" style={{ height: 40 }}>
            <Scissors className="w-3.5 h-3.5" aria-hidden /> Save clip{ready ? ` · ${formatDuration(markIn!, markOut!)}` : ''} <kbd className="fr-kbd fr-kbd-dark ml-1">S</kbd>
          </button>
          <button onClick={onLast10} disabled={currentMs < MIN_CLIP_MS} className="fr-btn" style={{ height: 40 }} title="Mark the last 10 seconds">
            <Zap className="w-3.5 h-3.5" aria-hidden /> Last 10s <kbd className="fr-kbd ml-1">Q</kbd>
          </button>
          <button onClick={onClear} disabled={!hasAny} className="fr-icon-btn" style={{ height: 40, width: 40 }} aria-label="Clear in and out points" title="Clear marks">
            <Eraser className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
})

function MarkCell({ label, value, kbd, active, onSet, onSeek }: { label: string; value: number | null; kbd: string; active: boolean; onSet: () => void; onSeek: (ms: number) => void }) {
  return (
    <div className="fr-cell flex flex-col gap-1 p-2.5" style={{ borderColor: active ? 'rgba(198,106,62,0.55)' : undefined }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: active ? 'var(--fr-accent)' : 'var(--fr-ink3)' }}>{label}</span>
        <kbd className="fr-kbd">{kbd}</kbd>
      </div>
      <button
        onClick={() => value !== null && onSeek(value)}
        disabled={value === null}
        className="fr-display text-left tabular-nums leading-none disabled:cursor-default"
        style={{ fontSize: 26, color: value === null ? 'var(--fr-ink3)' : 'var(--fr-ink)' }}
        title={value === null ? undefined : `Jump to ${label.toLowerCase()} point`}
        aria-label={value === null ? `${label} point not set` : `Jump to ${label.toLowerCase()} point ${msToTimecode(value)}`}
      >
        {value === null ? '–:––.––' : msToTimecode(value)}
      </button>
      <button onClick={onSet} className="fr-btn justify-center mt-0.5" style={{ height: 32, fontSize: 12 }}>
        {value === null ? 'Set at playhead' : 'Move to playhead'}
      </button>
    </div>
  )
}

/** Small pill over the video so the marks are visible in fullscreen too. */
export function ClipHud({ markIn, markOut }: { markIn: number | null; markOut: number | null }) {
  const phase = clipPhase(markIn, markOut)
  if (phase === 'empty') return null
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold"
      style={{ background: 'rgba(12,12,12,0.78)', border: '1px solid rgba(238,233,223,0.14)', color: 'var(--fr-ink)' }} aria-live="polite">
      <Scissors className="w-3 h-3" style={{ color: 'var(--fr-accent)' }} aria-hidden />
      <span className="fr-mono tabular-nums">
        <span style={{ color: markIn === null ? 'var(--fr-ink3)' : 'inherit' }}>IN {markIn === null ? '–:––' : msToTimecode(markIn)}</span>
        <span className="mx-1.5" style={{ color: 'var(--fr-ink3)' }}>→</span>
        <span style={{ color: markOut === null ? 'var(--fr-ink3)' : 'inherit' }}>OUT {markOut === null ? '–:––' : msToTimecode(markOut)}</span>
      </span>
      <span style={{ color: phase === 'ready' ? 'var(--fr-good)' : 'var(--fr-ink2)' }}>
        {phase === 'in' ? '· press O at the end' : phase === 'out' ? '· press I at the start' : phase === 'short' ? '· too short' : `· ${formatDuration(markIn!, markOut!)} · S to save`}
      </span>
    </div>
  )
}

export interface ToastMessage { id: number; text: string; tone?: 'ok' | 'warn' }

/** Transient confirmation at the bottom of the video frame. */
export function ClipToast({ toast, onDone }: { toast: ToastMessage | null; onDone: (id: number) => void }) {
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => onDone(toast.id), 1800)
    return () => window.clearTimeout(t)
  }, [toast, onDone])
  if (!toast) return null
  return (
    <div key={toast.id} role="status" className="fr-toast pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap"
      style={{ background: 'rgba(12,12,12,0.82)', border: `1px solid ${toast.tone === 'warn' ? 'rgba(217,99,90,0.5)' : 'rgba(238,233,223,0.14)'}`, color: toast.tone === 'warn' ? '#f0a39c' : 'var(--fr-ink)' }}>
      {toast.text}
    </div>
  )
}
