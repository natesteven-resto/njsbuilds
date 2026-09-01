import { NextResponse } from 'next/server'

// Dedicated PIN gate for /forcast. Uses FORCAST_PASSWORD (falls back to
// SITE_PASSWORD if the dedicated one isn't set, so it never hard-locks you out).
// The cookie is short-lived on purpose; the client also enforces a 30-minute
// idle timeout and clears it.

const COOKIE = 'forcast_auth'
const MAX_AGE = 60 * 30 // 30 minutes — matches the idle timeout ceiling

function correctPassword(): string | undefined {
  return process.env.FORCAST_PASSWORD || process.env.SITE_PASSWORD
}

// POST { password } -> set cookie, or { action: 'lock' } -> clear cookie
export async function POST(request: Request) {
  let body: { password?: string; action?: string } = {}
  try {
    body = await request.json()
  } catch {
    // ignore
  }

  if (body.action === 'lock') {
    const res = NextResponse.json({ ok: true, locked: true })
    res.cookies.set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' })
    return res
  }

  const correct = correctPassword()
  if (!correct) {
    return NextResponse.json({ ok: false, error: 'Forecast password is not configured.' }, { status: 500 })
  }
  if (body.password !== correct) {
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, 'true', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}

// GET -> is the current request authed?
export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  const authed = /(?:^|;\s*)forcast_auth=true(?:;|$)/.test(cookie)
  return NextResponse.json({ authed })
}
