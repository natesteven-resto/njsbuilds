'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '../components/AuthShell'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { Loader2, CheckCircle2 } from 'lucide-react'

function RequestReset() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    try {
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/filmroom/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    } catch {setError('Unable to complete this request. Please try again.')} finally {setLoading(false)}
  }

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" aria-hidden />
      <p className="text-sm text-white/60">Reset link sent to <strong className="text-white/80">{email}</strong>.</p>
      <Link href="/filmroom/login" className="mt-4 inline-block text-sm text-[#e79568] hover:text-[#f2b18c]">Back to sign in</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
          placeholder="you@example.com" />
      </div>
      {error && <div role="alert" className="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-[#c66a3e] hover:bg-[#db8052] disabled:opacity-50 text-sm font-semibold text-[#181917] transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-xs text-white/60">
        <Link href="/filmroom/login" className="text-[#e79568] hover:text-[#f2b18c] transition-colors">Back to sign in</Link>
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
    try {
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    } catch {setError('Unable to complete this request. Please try again.')} finally {setLoading(false)}
  }

  if (done) return (
    <div className="text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" aria-hidden />
      <p className="text-sm text-white/60 mb-4">Password updated.</p>
      <Link href="/filmroom/login" className="text-sm text-[#e79568] hover:text-[#f2b18c]">Sign in</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { id: 'password', label: 'New password', val: password, set: setPassword },
        { id: 'confirm', label: 'Confirm password', val: confirm, set: setConfirm },
      ].map(f => (
        <div key={f.id}>
          <label htmlFor={f.id} className="block text-xs font-medium text-white/60 mb-1.5">{f.label}</label>
          <input id={f.id} type="password" autoComplete="new-password" required placeholder="••••••••"
            value={f.val} onChange={e => f.set(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors" />
        </div>
      ))}
      {error && <div role="alert" className="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-[#c66a3e] hover:bg-[#db8052] disabled:opacity-50 text-sm font-semibold text-[#181917] transition-colors flex items-center justify-center gap-2">
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
    <AuthShell>
        <div className="w-full">
          <h2 className="text-3xl font-semibold text-[#eee9df] mb-7">Reset your password</h2>
          <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>}>
            <ResetContent />
          </Suspense>
        </div>
      </AuthShell>
  )
}
