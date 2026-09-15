'use client'

/**
 * AccountBar — inline account controls for Film Room headers.
 * Client component: reads session from Supabase browser client.
 * In-flow (not fixed overlay) — no collision with page controls.
 * Email hidden on narrow screens; only logout button shown.
 */
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { LogoutButton } from './LogoutButton'

export function AccountBar() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    // getUser() server-verifies; use getSession() here for display only (not auth decision)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    })
  }, [])

  if (!email) return null

  return (
    <div className="flex items-center gap-2 shrink-0 ml-1">
      <span
        className="hidden md:block text-[11px] text-white/30 max-w-[160px] truncate"
        title={email}
      >
        {email}
      </span>
      <LogoutButton />
    </div>
  )
}
