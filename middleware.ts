/**
 * Middleware — session refresh + route protection.
 *
 * Scoping (no leakage to unrelated apps):
 *  - '/'            — existing site password gate (preserved, unchanged)
 *  - '/filmroom'    — Film Room auth guard (exact match)
 *  - '/filmroom/*'  — Film Room auth guard
 *  - '/api/filmroom/*' — API auth guard (returns 401 JSON, no redirect)
 *  - Everything else — passes through with no Supabase calls
 *
 * Auth bypass paths (no redirect from these):
 *   /filmroom/login, /filmroom/signup — bypass + redirect-away-if-authed
 *   /filmroom/reset-password — bypass ONLY (recovery session must reach it)
 *   /filmroom/auth/callback  — bypass (PKCE exchange)
 *
 * Cookie propagation follows official @supabase/ssr pattern:
 *   - supabaseResponse = NextResponse.next({ request }) so downstream gets refreshed tokens
 *   - setAll mutates request cookies AND rebuilds supabaseResponse with full options
 *   - Redirects copy all cookies with full attributes from supabaseResponse
 *
 * Redirect safety: next= param must start with /filmroom (or equal /filmroom),
 *   no backslash, no control chars, no scheme, no protocol-relative.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getFilmRoomConfig } from './lib/filmroom-config'

const FILMROOM_BYPASS = new Set([
  '/filmroom/login',
  '/filmroom/signup',
  '/filmroom/reset-password', // must NOT redirect — recovery session sets password here
  '/filmroom/auth/callback',
])
const FILMROOM_REDIRECT_AWAY = new Set(['/filmroom/login', '/filmroom/signup'])

function safeFilmroomNext(raw: string | null): string {
  if (!raw) return '/filmroom'
  if (
    /[\x00-\x1f\\]/.test(raw) ||
    raw.startsWith('//') ||
    raw.includes(':') ||
    (!raw.startsWith('/filmroom/') && raw !== '/filmroom')
  ) return '/filmroom'
  return raw
}

function copyRefreshedCookies(from: NextResponse, to: NextResponse) {
  // Copy all refreshed cookies with full attributes
  from.cookies.getAll().forEach(cookie => {
    to.cookies.set(cookie)
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Root password gate (existing, unchanged) ─────────────────────────────
  if (pathname === '/') {
    if (request.cookies.get('njs_auth')?.value !== 'true') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // ── Scope: only handle Film Room paths ───────────────────────────────────
  const isFilmroomPage = pathname === '/filmroom' || pathname.startsWith('/filmroom/')
  const isFilmroomApi  = pathname.startsWith('/api/filmroom/')
  if (!isFilmroomPage && !isFilmroomApi) {
    return NextResponse.next() // unrelated app — zero Supabase calls
  }

  // ── Official @supabase/ssr pattern:
  //    Build supabaseResponse first; setAll rebuilds it so downstream
  //    receives all refreshed cookies via the mutated request object.
  let supabaseResponse = NextResponse.next({ request })

  let filmRoomConfig: ReturnType<typeof getFilmRoomConfig>
  try {
    filmRoomConfig = getFilmRoomConfig()
  } catch {
    return isFilmroomApi
      ? NextResponse.json({ error: 'Film Room account service is not configured' }, { status: 503 })
      : new NextResponse('Film Room is being set up. Please try again later.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
  }
  const supabase = createServerClient(filmRoomConfig.url, filmRoomConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Mutate request so downstream middleware/handlers see refreshed tokens
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        // Rebuild response with mutated request, preserving all cookie attributes
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() — server-verifies token; never use getSession() for auth decisions
  const { data: { user } } = await supabase.auth.getUser()

  // ── API routes: 401 JSON, no redirect ────────────────────────────────────
  if (isFilmroomApi) {
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return supabaseResponse
  }

  // ── Film Room pages ───────────────────────────────────────────────────────
  const isBypass         = FILMROOM_BYPASS.has(pathname)
  const isRedirectAway   = FILMROOM_REDIRECT_AWAY.has(pathname)

  if (!user && !isBypass) {
    const rawNext = pathname + request.nextUrl.search
    const next    = safeFilmroomNext(rawNext)
    const loginUrl = new URL('/filmroom/login', request.url)
    loginUrl.searchParams.set('next', next)

    const redirectResponse = NextResponse.redirect(loginUrl)
    copyRefreshedCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  // Only redirect authenticated user away from login/signup — NOT reset-password
  if (user && isRedirectAway) {
    const next = safeFilmroomNext(request.nextUrl.searchParams.get('next'))
    const redirectResponse = NextResponse.redirect(new URL(next, request.url))
    copyRefreshedCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/filmroom',
    '/filmroom/:path*',
    '/api/filmroom/:path*',
  ],
}
