'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/filmroom/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/6 transition-all border border-white/8"
      aria-label="Sign out of Film Room"
    >
      <LogOut className="w-3 h-3" aria-hidden />
      Sign out
    </button>
  )
}
