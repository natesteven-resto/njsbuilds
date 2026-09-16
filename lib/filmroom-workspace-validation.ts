export function shortText(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`Use ${required ? '1' : '0'}–${max} characters.`)
  return value.trim()
}
export function reviewMeta(value: unknown) {
  const v = value as { bookmarks?: unknown[] }
  if (!v || !Array.isArray(v.bookmarks) || v.bookmarks.length > 200) throw new Error('Use at most 200 bookmarks.')
  const ids = new Set<string>()
  return { bookmarks: v.bookmarks.map(item => {
    const b = item as Record<string, unknown>
    const id = shortText(b.id, 80, true)
    if (ids.has(id)) throw new Error('Duplicate bookmark.')
    ids.add(id)
    if (typeof b.position_ms !== 'number' || !Number.isSafeInteger(b.position_ms) || b.position_ms < 0 || b.position_ms > 86400000) throw new Error('Invalid bookmark position.')
    return { id, label: shortText(b.label, 120, true), period: shortText(b.period, 24), clock: shortText(b.clock, 16), position_ms: b.position_ms }
  }) }
}
export function sessionPlan(value: unknown) {
  const v = value as { objective?: unknown; sections?: unknown[] }
  if (!v || !Array.isArray(v.sections) || v.sections.length > 30) throw new Error('Use at most 30 teaching sections.')
  return { objective: shortText(v.objective, 2000), sections: v.sections.map(item => {
    const s = item as Record<string, unknown>
    if (!Array.isArray(s.clip_ids) || s.clip_ids.length > 500 || s.clip_ids.some(id => typeof id !== 'string')) throw new Error('Invalid section clips.')
    return { id: shortText(s.id, 80, true), title: shortText(s.title, 120, true), objective: shortText(s.objective, 1000), clip_ids: [...new Set(s.clip_ids as string[])] }
  }) }
}
