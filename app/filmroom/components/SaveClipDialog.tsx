'use client'
import React, { useEffect, useRef, useState } from 'react'
import { X, Star, Loader2, Minus, Plus, Scissors } from 'lucide-react'
import type { Clip, ClipCategory, Player } from '@/types/filmroom'
import { CATEGORY_LABELS, PLAY_TYPES } from '@/types/filmroom'
import type { DrawingData } from './DrawingOverlay'
import { CustomClipTags } from './CustomClipTags'
import { msToTimecode, formatDuration } from '@/lib/filmroom-time'
import { MIN_CLIP_MS } from './ClipBuilder'

// ─── Save / edit clip dialog ──────────────────────────────────────────────────
// Same API payload as before. The range sits at the top with ±1s nudges instead of
// raw "seconds" inputs, visibility is an explicit Shared / Private choice, and the
// card has a fixed width so it never reflows while you type.

const CATEGORY_TONE: Record<ClipCategory, string> = {
  offense: 'rgba(198,106,62,0.9)',
  defense: 'rgba(96,165,250,0.9)',
  transition: 'rgba(108,196,154,0.9)',
  set_play: 'rgba(192,132,252,0.9)',
}

export interface SaveClipDialogProps {
  existingClip?: Clip
  gameId: string
  teamId: string
  startMs: number
  endMs: number
  players: Player[]
  drawingData?: DrawingData | null
  videoDurationMs: number
  onClose: () => void
  onSave: (clip: Clip) => void
}

export function SaveClipDialog({ gameId, teamId, startMs, endMs, players, drawingData, videoDurationMs, onClose, onSave, existingClip }: SaveClipDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Lock the document behind the dialog (iPad still pans with overflow:hidden alone).
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const surfaces = [...new Set([document.documentElement, document.body, document.fullscreenElement].filter(Boolean))] as HTMLElement[]
    const styles = surfaces.map(el => ({ el, overflow: el.style.overflow, overscroll: el.style.overscrollBehavior }))
    const body = document.body
    const bodyStyle = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width }
    const scrollX = window.scrollX, scrollY = window.scrollY
    surfaces.forEach(el => { el.style.overflow = 'hidden'; el.style.overscrollBehavior = 'none' })
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, left: `-${scrollX}px`, width: '100%' })
    let lastY = 0
    const touchStart = (e: TouchEvent) => { if (e.touches.length === 1) lastY = e.touches[0].clientY }
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const y = e.touches[0].clientY, delta = y - lastY; lastY = y
      const details = dialogRef.current?.querySelector('[data-scroll-body]')
      let el = e.target instanceof HTMLElement ? e.target : null
      while (el && details?.contains(el)) {
        const overflow = getComputedStyle(el).overflowY
        const max = el.scrollHeight - el.clientHeight
        if (/auto|scroll/.test(overflow) && max > 1 && ((delta > 0 && el.scrollTop > 0) || (delta < 0 && el.scrollTop < max - 1))) return
        if (el === details) break
        el = el.parentElement
      }
      if (e.cancelable) e.preventDefault()
    }
    document.addEventListener('touchstart', touchStart, { passive: true })
    document.addEventListener('touchmove', touchMove, { passive: false })
    dialogRef.current?.querySelector<HTMLInputElement>('[name="clip-title"]')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('touchstart', touchStart)
      document.removeEventListener('touchmove', touchMove)
      styles.forEach(({ el, overflow, overscroll }) => { el.style.overflow = overflow; el.style.overscrollBehavior = overscroll })
      Object.assign(body.style, bodyStyle)
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation() // never reach the film's playback shortcuts
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key !== 'Tab') return
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'
    ) ?? []).filter(el => el.getClientRects().length > 0)
    const first = controls[0], last = controls[controls.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }

  const [range, setRange] = useState({ start: startMs, end: endMs })
  const [form, setForm] = useState({
    parent_shared: existingClip?.parent_shared ?? true,
    title: existingClip?.title ?? '',
    category: existingClip?.category ?? 'offense' as ClipCategory,
    tags: existingClip?.tags.join(', ') ?? '',
    is_highlight: existingClip?.is_highlight ?? false,
    player_ids: existingClip?.players?.map(p => p.id) ?? [] as string[],
    coaching_note: existingClip?.coaching_note ?? '',
    play_type: existingClip?.play_type ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const maxMs = videoDurationMs > 0 ? videoDurationMs : Number.POSITIVE_INFINITY
  const nudge = (k: 'start' | 'end', delta: number) => setRange(r => {
    const next = { ...r, [k]: Math.max(0, Math.min(maxMs, r[k] + delta)) }
    if (next.end - next.start < MIN_CLIP_MS) return r
    return next
  })
  const valid = range.start >= 0 && range.end - range.start >= MIN_CLIP_MS && (videoDurationMs <= 0 || range.end <= videoDurationMs)
  const defaultTitle = `${msToTimecode(range.start)} – ${msToTimecode(range.end)}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) { setError('Choose a valid start and end within the video.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(existingClip ? `/api/filmroom/clips/${existingClip.id}` : '/api/filmroom/clips', {
        method: existingClip ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          team_id: teamId,
          start_time_ms: Math.round(range.start),
          end_time_ms: Math.round(range.end),
          title: form.title.trim() || defaultTitle,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: form.category,
          is_highlight: form.is_highlight,
          parent_shared: form.parent_shared,
          player_ids: form.player_ids,
          drawing_data: drawingData ?? null,
          coaching_note: form.coaching_note.trim() || null,
          play_type: form.play_type || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const clip = await res.json()
      onSave(existingClip ? { ...existingClip, ...clip, players: existingClip.players } : clip)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (id: string) => setForm(f => ({
    ...f, player_ids: f.player_ids.includes(id) ? f.player_ids.filter(p => p !== id) : [...f.player_ids, id],
  }))
  const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean)
  const toggleTag = (tag: string) => setForm(f => {
    const tags = f.tags.split(',').map(t => t.trim()).filter(Boolean)
    return { ...f, tags: (tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]).join(', ') }
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-hidden overscroll-none" style={{ background: 'rgba(8,8,8,0.66)' }} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={existingClip ? 'Edit clip' : 'Save clip'}
        onKeyDown={handleDialogKeyDown}
        onClick={e => e.stopPropagation()}
        className="w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 600, maxHeight: 'calc(100dvh - 2rem)', background: 'var(--fr-tile)', border: '1px solid var(--fr-line2)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}
      >
        {/* Header: what you are saving */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--fr-line)' }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="fr-display text-[22px] leading-none flex items-center gap-2" style={{ color: 'var(--fr-ink)' }}>
              <Scissors className="w-4 h-4" style={{ color: 'var(--fr-accent)' }} aria-hidden /> {existingClip ? 'Edit clip' : 'Save clip'}
            </h2>
            <button type="button" aria-label="Close" onClick={onClose} className="fr-icon-btn"><X className="w-4 h-4" aria-hidden /></button>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <RangeCell label="In" ms={range.start} onMinus={() => nudge('start', -1000)} onPlus={() => nudge('start', 1000)} />
            <div className="text-center">
              <div className="text-[10.5px] font-semibold" style={{ color: 'var(--fr-ink3)' }}>LENGTH</div>
              <div className="fr-display text-[20px] leading-none mt-0.5" style={{ color: valid ? 'var(--fr-ink)' : 'var(--fr-bad)' }}>{formatDuration(range.start, range.end)}</div>
            </div>
            <RangeCell label="Out" ms={range.end} onMinus={() => nudge('end', -1000)} onPlus={() => nudge('end', 1000)} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-hidden">
          <div data-scroll-body className="fr-scroll min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4" style={{ touchAction: 'pan-y' }}>
            <Field label="Title" hint={form.title.trim() ? undefined : `Blank saves as “${defaultTitle}”`}>
              <input name="clip-title" type="text" placeholder="e.g. Pick-and-roll coverage" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="fr-input" maxLength={120} />
            </Field>

            <Field label="Category">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(CATEGORY_LABELS) as ClipCategory[]).map(cat => {
                  const on = form.category === cat
                  return (
                    <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))} aria-pressed={on}
                      className="fr-btn justify-center" style={{ height: 36, borderColor: on ? CATEGORY_TONE[cat] : undefined, color: on ? 'var(--fr-ink)' : 'var(--fr-ink2)', background: on ? 'rgba(238,233,223,0.05)' : undefined }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_TONE[cat], opacity: on ? 1 : 0.45 }} aria-hidden />
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>
            </Field>

            {players.length > 0 && (
              <Field label="Players in this clip" hint={existingClip ? 'Players can’t be changed after saving.' : undefined}>
                <div className="flex flex-wrap gap-1.5">
                  {players.map(p => {
                    const on = form.player_ids.includes(p.id)
                    return (
                      <button key={p.id} type="button" disabled={!!existingClip} onClick={() => togglePlayer(p.id)} aria-pressed={on}
                        className={`fr-btn ${on ? 'fr-btn-on' : ''}`} style={{ height: 32, fontSize: 12 }}>
                        <span className="fr-display text-[14px]">#{p.number ?? '?'}</span> {p.name.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}

            <Field label="Teaching point" hint="Optional. Picks a quick tag too.">
              <div className="flex flex-wrap gap-1.5">
                {PLAY_TYPES.map(pt => {
                  const on = form.play_type === pt
                  return (
                    <button key={pt} type="button" aria-pressed={on}
                      onClick={() => setForm(f => {
                        const next = f.play_type === pt ? '' : pt
                        const tags = f.tags.split(',').map(t => t.trim()).filter(t => t && t !== f.play_type)
                        return { ...f, play_type: next, tags: Array.from(new Set([...tags, ...(next ? [next] : [])])).join(', ') }
                      })}
                      className={`fr-chip ${on ? 'fr-chip-accent' : ''}`} style={{ height: 28, cursor: 'pointer' }}>
                      {pt}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Coaching note" hint="Only you see this.">
              <textarea value={form.coaching_note} onChange={e => setForm(f => ({ ...f, coaching_note: e.target.value }))}
                placeholder="What to watch for…" rows={2} maxLength={500} className="fr-textarea" />
            </Field>

            <Field label="Tags" hint="Comma-separated.">
              <input type="text" placeholder="closeout, help-D, zone" value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="fr-input" />
              <div className="mt-2"><CustomClipTags selected={tagList} toggle={toggleTag} /></div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Who can see it">
                <div className="fr-seg w-full grid grid-cols-2">
                  <button type="button" aria-pressed={form.parent_shared} onClick={() => setForm(f => ({ ...f, parent_shared: true }))}>Shared with viewers</button>
                  <button type="button" aria-pressed={!form.parent_shared} onClick={() => setForm(f => ({ ...f, parent_shared: false }))}>Private · only me</button>
                </div>
              </Field>
              <Field label="Highlight">
                <button type="button" aria-pressed={form.is_highlight} onClick={() => setForm(f => ({ ...f, is_highlight: !f.is_highlight }))}
                  className="fr-btn w-full justify-center" style={{ height: 40, borderColor: form.is_highlight ? 'rgba(250,204,21,0.6)' : undefined, color: form.is_highlight ? '#fde68a' : undefined, background: form.is_highlight ? 'rgba(250,204,21,0.08)' : undefined }}>
                  <Star className="w-3.5 h-3.5" style={{ fill: form.is_highlight ? '#fde68a' : 'none' }} aria-hidden />
                  {form.is_highlight ? 'Marked as highlight' : 'Mark as highlight'}
                </button>
              </Field>
            </div>
          </div>

          <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--fr-line)', background: 'var(--fr-tile)' }}>
            {error && <p role="alert" className="text-xs mb-2" style={{ color: 'var(--fr-bad)' }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="fr-btn flex-1 justify-center" style={{ height: 42 }}>Cancel</button>
              <button type="submit" disabled={loading || !valid} className="fr-btn fr-btn-primary flex-[2] justify-center" style={{ height: 42, fontSize: 13.5 }}>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                {existingClip ? 'Save changes' : `Save ${formatDuration(range.start, range.end)} clip`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function RangeCell({ label, ms, onMinus, onPlus }: { label: string; ms: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="fr-cell flex items-center justify-between gap-1 px-2 py-1.5">
      <button type="button" onClick={onMinus} className="fr-icon-btn" style={{ width: 30, height: 30, borderColor: 'transparent' }} aria-label={`${label} one second earlier`}><Minus className="w-3.5 h-3.5" aria-hidden /></button>
      <div className="text-center min-w-0">
        <div className="text-[10.5px] font-semibold" style={{ color: 'var(--fr-ink3)' }}>{label.toUpperCase()}</div>
        <div className="fr-display text-[20px] leading-none mt-0.5 tabular-nums" style={{ color: 'var(--fr-ink)' }}>{msToTimecode(ms)}</div>
      </div>
      <button type="button" onClick={onPlus} className="fr-icon-btn" style={{ width: 30, height: 30, borderColor: 'transparent' }} aria-label={`${label} one second later`}><Plus className="w-3.5 h-3.5" aria-hidden /></button>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fr-ink2)' }}>{label}</span>
        {hint && <span className="text-[11px] truncate" style={{ color: 'var(--fr-ink3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
