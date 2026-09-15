/**
 * Server-side Supabase clients using @supabase/ssr.
 *
 * Rules:
 * - Never use getSession() for authorization — trusts unverified JWT.
 * - Always use getUser() which makes a network call to Supabase Auth server.
 * - createServiceClient() uses service role — bypasses RLS, use only for
 *   server-to-server operations where ownership is already verified in code.
 * - createAuthClient() uses anon key + cookie session — subject to RLS.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server Component / Route Handler client with cookie-based session.
 * Uses anon key — subject to RLS.
 * Call getVerifiedUser() to get identity; never trust getSession() alone.
 */
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot set cookies — middleware handles refresh
        }
      },
    },
  })
}

/**
 * Route Handler client that reads/writes cookies from a Request/Response pair.
 * Use this in API route handlers where you need to refresh the session.
 */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

/**
 * Service role client — bypasses RLS entirely.
 * Use ONLY after ownership has been verified in application code.
 * Never expose to client or use for user-scoped queries.
 */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Verify identity from a Route Handler request.
 * Uses getUser() — performs server-side token verification.
 * Returns { user, supabase } on success.
 * Throws a 401 NextResponse on failure.
 *
 * Usage in route handlers:
 *   const { user, supabase } = await getVerifiedUser(request)
 */
export async function getVerifiedUser(request: NextRequest): Promise<{
  user: { id: string; email: string | undefined }
  supabase: ReturnType<typeof createServerClient>
}> {
  const response = NextResponse.next()
  const supabase = createRouteHandlerClient(request, response)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return {
    user: { id: user.id, email: user.email },
    supabase,
  }
}

/**
 * Verify ownership of a resource. Returns 403 NextResponse if mismatch.
 * Usage: await assertOwner(resource.owner_id, user.id)
 */
export function assertOwner(resourceOwnerId: string | null, userId: string): void {
  if (!resourceOwnerId || resourceOwnerId !== userId) {
    throw new NextResponse(
      JSON.stringify({ error: 'Forbidden' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Strip fields that must never be accepted from request bodies.
 * Prevents callers from forging owner_id, plan, auth_user_id, etc.
 */
export function stripServerFields<T extends Record<string, unknown>>(body: T): Omit<T,
  'owner_id' | 'plan' | 'auth_user_id' | 'upload_id' | 'r2_key' | 'status'
> {
  const stripped = { ...body }
  for (const field of ['owner_id', 'plan', 'auth_user_id', 'upload_id', 'r2_key', 'status']) {
    delete stripped[field]
  }
  return stripped as Omit<T, 'owner_id' | 'plan' | 'auth_user_id' | 'upload_id' | 'r2_key' | 'status'>
}
