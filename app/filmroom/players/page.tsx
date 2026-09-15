'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, ChevronRight, Loader2 } from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import { CsHeader } from '@/app/filmroom/components/cs-shared'
import type { Player } from '@/types/filmroom'

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/filmroom/players')
      .then(r => { if (r.status === 401) { router.replace('/filmroom/login'); return null } return r.ok ? r.json() : [] })
      .then(d => { if (d) { setPlayers(Array.isArray(d) ? d : []); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [router])

  return (
    <div className="cs min-h-screen" style={{ background: '#181917', color: '#eee9df' }}>
      <CsHeader active="players" right={<AccountBar />} />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="font-black uppercase tracking-tight text-2xl"
          style={{ fontFamily: 'var(--font-bc,"Arial Narrow",sans-serif)' }}>
          Players
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(238,233,223,0.15)' }} />
            <p style={{ color: 'rgba(238,233,223,0.60)' }}>No players yet — add them from the game roster panel.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <Link key={p.id} href={`/filmroom/players/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:border-[rgba(198,106,62,0.40)]"
                style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.10)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                  style={{ background: 'rgba(198,106,62,0.15)', color: '#c66a3e' }}>
                  {p.number ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#eee9df' }}>{p.name}</p>
                  {p.position && <p className="text-xs" style={{ color: 'rgba(238,233,223,0.50)' }}>{p.position}</p>}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(238,233,223,0.30)' }} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
