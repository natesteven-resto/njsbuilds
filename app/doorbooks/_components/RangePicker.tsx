'use client'

import { useMemo, useState } from 'react'
import { RANGE_PRESETS, rangeFor, type DateRange, type RangePreset } from '../_lib/dates'

export interface RangeState {
  preset: RangePreset
  range: DateRange
  setPreset: (p: RangePreset) => void
  setCustom: (r: DateRange) => void
}

export function useRange(initial: RangePreset = 'ytd'): RangeState {
  const [preset, setPresetState] = useState<RangePreset>(initial)
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('ytd'))
  const range = useMemo(() => (preset === 'custom' ? custom : rangeFor(preset)), [preset, custom])
  return {
    preset,
    range,
    setPreset: (p) => { if (p === 'custom') setCustom(range); setPresetState(p) },
    setCustom: (r) => { setCustom(r); setPresetState('custom') },
  }
}

export function RangePicker({ state, compact }: { state: RangeState; compact?: boolean }) {
  const presets = compact ? RANGE_PRESETS.filter((p) => ['month', 'quarter', 'ytd', 'last_year', 'all'].includes(p.id)) : RANGE_PRESETS
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', minWidth: 0 }}>
      <div className="db-seg db-seg-scroll" role="group" aria-label="Date range">
        {presets.map((p) => (
          <button key={p.id} type="button" aria-pressed={state.preset === p.id} onClick={() => state.setPreset(p.id)}>{p.label}</button>
        ))}
        <button type="button" aria-pressed={state.preset === 'custom'} onClick={() => state.setPreset('custom')}>Custom</button>
      </div>
      {state.preset === 'custom' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="date" className="db-input db-num" style={{ height: 38, width: 150 }} value={state.range.start} onChange={(e) => state.setCustom({ ...state.range, start: e.target.value })} aria-label="Start date" />
          <span className="db-faint">to</span>
          <input type="date" className="db-input db-num" style={{ height: 38, width: 150 }} value={state.range.end} onChange={(e) => state.setCustom({ ...state.range, end: e.target.value })} aria-label="End date" />
        </div>
      )}
    </div>
  )
}
