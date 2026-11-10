// Shared time formatting for Film Room (video positions are stored in ms).

/** m:ss.ff — frame-accurate timecode (~30fps) used by the transport and clip tools. */
export function msToTimecode(ms: number): string {
  const safe = Math.max(0, Math.round(ms))
  const totalSec = Math.floor(safe / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const frames = Math.floor((safe % 1000) / 33)
  return `${m}:${String(s).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}

/** m:ss — compact display for lists and labels. */
export function msToDisplay(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** "12s" / "1m 04s" — human duration between two positions. */
export function formatDuration(startMs: number, endMs: number): string {
  const s = Math.max(0, Math.floor((endMs - startMs) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}
