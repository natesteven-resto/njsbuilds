'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
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
      className="pointer-events-auto flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-md text-xs text-white/65 hover:text-white/70 hover:bg-white/6 transition-all border border-white/8"
      aria-label="Sign out of Film Room"
    >
      <LogOut className="w-3 h-3" aria-hidden />
      Sign out
    </button>
  )
}
