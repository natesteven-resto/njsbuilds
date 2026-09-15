'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { Loader2, Film, CheckCircle2 } from 'lucide-react'

function RequestReset() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/filmroom/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" aria-hidden />
      <p className="text-sm text-white/60">Reset link sent to <strong className="text-white/80">{email}</strong>.</p>
      <Link href="/filmroom/login" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">Back to sign in</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          placeholder="you@example.com" />
      </div>
      {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-xs text-white/40">
        <Link href="/filmroom/login" className="text-blue-400 hover:text-blue-300 transition-colors">Back to sign in</Link>
      </p>
    </form>
  )
}

function ConfirmReset() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" aria-hidden />
      <p className="text-sm text-white/60 mb-4">Password updated.</p>
      <Link href="/filmroom/login" className="text-sm text-blue-400 hover:text-blue-300">Sign in</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {[
        { id: 'password', label: 'New password', val: password, set: setPassword },
        { id: 'confirm', label: 'Confirm password', val: confirm, set: setConfirm },
      ].map(f => (
        <div key={f.id}>
          <label htmlFor={f.id} className="block text-xs font-medium text-white/60 mb-1.5">{f.label}</label>
          <input id={f.id} type="password" autoComplete="new-password" required placeholder="••••••••"
            value={f.val} onChange={e => f.set(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors" />
        </div>
      ))}
      {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

function ResetContent() {
  const searchParams = useSearchParams()
  return searchParams.get('confirmed') === 'true' ? <ConfirmReset /> : <RequestReset />
}

export default function ResetPasswordPage() {
  return (
    <div className="cs min-h-screen flex items-center justify-center p-4" style={{ background: '#181917' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#c66a3e' }}><Film className="w-4 h-4" style={{ color: '#181917' }} aria-hidden /></div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: '#eee9df' }}>Film Room</h1>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-5">Reset your password</h2>
          <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>}>
            <ResetContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
