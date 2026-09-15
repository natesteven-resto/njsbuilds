/** Film Room must never fall back to another application's account service. */
export function getFilmRoomConfig() {
  const url = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Film Room account service is not configured')
  const parsed = new URL(url)
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (
    parsed.hostname === 'suhfyckmuenjskitrzlq.supabase.co' ||
    (!local && parsed.protocol !== 'https:') ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    (parsed.pathname !== '/' && parsed.pathname !== '')
  ) throw new Error('Film Room requires its own account service')
  return { url: parsed.origin, anonKey }
}
