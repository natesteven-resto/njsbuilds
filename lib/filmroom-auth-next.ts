const FALLBACK = '/filmroom'

/**
 * Validate and normalise a `next` redirect value for Film Room.
 *
 * Accepts only same-origin paths whose normalised pathname starts with
 * /filmroom (exact) or /filmroom/ (prefix). Rejects:
 *  - external origins
 *  - dot-segment escapes (literal or percent-encoded) that resolve outside /filmroom
 *  - protocol-relative (//) URLs
 *  - any scheme (contains ':')
 *  - control characters or backslashes
 *
 * Valid deep-link query-strings and hashes are preserved.
 */
export function safeFilmroomNext(raw: string | null): string {
  if (!raw) return FALLBACK

  // Quick pre-checks before URL parsing
  if (/[\x00-\x1f\\]/.test(raw)) return FALLBACK
  if (raw.startsWith('//')) return FALLBACK
  if (raw.includes(':')) return FALLBACK

  // Parse with a dummy origin so we get normalisation (resolves ./ and ../)
  let parsed: URL
  try {
    parsed = new URL(raw, 'https://dummy.invalid')
  } catch {
    return FALLBACK
  }

  // Reject anything that ended up on a different origin after normalisation
  if (parsed.origin !== 'https://dummy.invalid') return FALLBACK

  const pathname = parsed.pathname // already normalised by URL parser

  // Must be exactly /filmroom or start with /filmroom/
  if (pathname !== '/filmroom' && !pathname.startsWith('/filmroom/')) return FALLBACK

  // Reconstruct: pathname + search + hash, no origin
  return pathname + parsed.search + parsed.hash
}
