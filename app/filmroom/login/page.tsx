'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { Loader2, Film } from 'lucide-react'

function safeNext(raw: string | null): string {
  if (!raw) return '/filmroom'
  if (/[\x00-\x1f\\]/.test(raw) || raw.startsWith('//') || raw.includes(':') ||
    (!raw.startsWith('/filmroom/') && raw !== '/filmroom')) return '/filmroom'
  return raw
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    // createBrowserClient stores session in cookies — middleware can read it server-side
    const supabase = getSupabaseBrowser()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) { setError(authErr.message); return }
    router.push(next)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
        <input id="email" type="email" autoComplete="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          placeholder="you@example.com" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-white/60">Password</label>
          <Link href="/filmroom/reset-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" required value={password}
          onChange={e => setPassword(e.target.value)}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          placeholder="••••••••" />
      </div>
      {error && (
        <div id="login-error" role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-white/40">
        No account?{' '}
        <Link href="/filmroom/signup" className="text-blue-400 hover:text-blue-300 transition-colors">Create one</Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Film className="w-4 h-4 text-white" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">Film Room</h1>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-5">Sign in to your library</h2>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
