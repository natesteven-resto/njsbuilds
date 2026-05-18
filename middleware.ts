import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect the root path
  if (pathname !== '/') return NextResponse.next()

  const auth = request.cookies.get('njs_auth')
  if (auth?.value === 'true') return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/'],
}
