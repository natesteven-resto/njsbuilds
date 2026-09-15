/**
 * Middleware — session refresh + route protection.
 *
 * Scoping:
 *  - /filmroom and /filmroom/* — Film Room auth guard (new)
 *  - /api/filmroom/* — API auth guard (new)
 *  - / only — existing site password gate (preserved, unchanged)
 *  - All other paths — pass through; no Supabase calls on unrelated apps
 *
 * Auth pages excluded from Film Room guard to prevent redirect loops:
 *   /filmroom/login, /filmroom/signup, /filmroom/reset-password, /filmroom/auth/callback
 *
 * Redirect safety:
 *  - `next` param validated: relative path, starts with /filmroom/, no backslash,
 *    no control chars, no protocol-relative form. Anything else → /filmroom.
 *  - Refreshed session cookies propagated on all responses including redirects.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Film Room paths that bypass the auth guard
const FILMROOM_PUBLIC_PATHS = new Set([
  '/filmroom/login',
  '/filmroom/signup',
  '/filmroom/reset-password',
  '/filmroom/auth/callback',
])

/**
 * Validate a `next` redirect target:
 * - Must start with /filmroom/ or equal /filmroom
 * - Must be a relative path (no scheme, no //)
 * - Must not contain backslashes or control characters
 */
function safeFIlmroomRedirect(next: string | null): string {
  if (!next) return '/filmroom'
  // Reject anything with backslash, control chars, or not starting with /filmroom
  if (
    next.includes('\\') ||
    /[\x00-\x1f]/.test(next) ||
    next.startsWith('//') ||
    next.includes(':') ||
    (!next.startsWith('/filmroom/') && next !== '/filmroom')
  ) {
    return '/filmroom'
  }
  return next
}

/** Build a Supabase SSR client that propagates cookie mutations to a response. */
function makeSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Propagate to both the downstream request and the outgoing response
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Existing root password gate (preserved exactly) ─────────────────────
  if (pathname === '/') {
    const auth = request.cookies.get('njs_auth')?.value
    if (auth !== 'true') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // ── Film Room routes ─────────────────────────────────────────────────────
  const isFilmroomPage = pathname === '/filmroom' || pathname.startsWith('/filmroom/')
  const isFilmroomApi  = pathname.startsWith('/api/filmroom/')

  if (!isFilmroomPage && !isFilmroomApi) {
    // Unrelated app — pass through with no Supabase calls
    return NextResponse.next()
  }

  // Build a base response to carry refreshed cookies
  const response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = makeSupabaseClient(request, response)

  // Always refresh session — required by @supabase/ssr
  // Use getUser() (server-verified) not getSession()
  const { data: { user } } = await supabase.auth.getUser()

  // ── API routes: return 401 JSON, no redirect ─────────────────────────────
  if (isFilmroomApi) {
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return response
  }

  // ── Film Room pages ───────────────────────────────────────────────────────
  const isPublicPath = FILMROOM_PUBLIC_PATHS.has(pathname)

  if (!user && !isPublicPath) {
    // Unauthenticated → login with safe redirect target
    const next = pathname + request.nextUrl.search
    const safeNext = safeFIlmroomRedirect(next)
    const loginUrl = new URL('/filmroom/login', request.url)
    loginUrl.searchParams.set('next', safeNext)

    // Propagate refreshed cookies onto the redirect response
    const redirectResponse = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (user && isPublicPath && pathname !== '/filmroom/auth/callback') {
    // Already authenticated — redirect away from login/signup
    const next = request.nextUrl.searchParams.get('next')
    const target = safeFIlmroomRedirect(next)
    const redirectResponse = NextResponse.redirect(new URL(target, request.url))
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return response
}

export const config = {
  // Match Film Room pages, Film Room API, and root only.
  // Exclude static assets and Next.js internals explicitly.
  matcher: [
    '/',
    '/filmroom',
    '/filmroom/:path*',
    '/api/filmroom/:path*',
  ],
}
