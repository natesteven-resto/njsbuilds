import type { Metadata } from 'next'
import { createAuthClient } from '@/lib/filmroom-supabase-server'
import { LogoutButton } from './components/LogoutButton'

export const metadata: Metadata = {
  title: 'Film Room — NJS Builds',
  description: 'Basketball film study platform for coaches.',
}

export default async function FilmRoomLayout({ children }: { children: React.ReactNode }) {
  // Server-side identity — getUser() is server-verified
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#0d0f12] text-white font-sans">
      {user && (
        <div className="fixed top-0 right-0 z-50 flex items-center gap-3 px-4 py-2 pointer-events-none">
          <span className="text-[11px] text-white/30 pointer-events-auto">{user.email}</span>
          <LogoutButton />
        </div>
      )}
      {children}
    </div>
  )
}
