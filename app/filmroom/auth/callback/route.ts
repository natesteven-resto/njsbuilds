/**
 * Film Room Auth Callback — PKCE code exchange.
 * Handles email confirmation and password recovery redirects from Supabase.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getFilmRoomConfig } from '@/lib/filmroom-config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' | undefined

  if (!code) {
    return NextResponse.redirect(new URL('/filmroom/login', request.url))
  }

  const response = NextResponse.redirect(
    new URL(
      type === 'recovery' ? '/filmroom/reset-password?confirmed=true' : '/filmroom',
      request.url
    )
  )

  const { url, anonKey } = getFilmRoomConfig()
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback]', error.message)
    // Map Supabase error codes to user-facing slugs for the login page to display
    const msg = error.message.toLowerCase()
    let slug = 'link_invalid'
    if (msg.includes('expired') || msg.includes('otp') || msg.includes('token has expired')) slug = 'link_expired'
    else if (msg.includes('already') || msg.includes('used')) slug = 'link_used'
    else if (msg.includes('recovery') || msg.includes('reset')) slug = 'recovery_failed'
    const dest = new URL('/filmroom/login', request.url)
    dest.searchParams.set('error', slug)
    return NextResponse.redirect(dest)
  }

  return response
}
