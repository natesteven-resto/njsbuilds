'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, Film, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
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
    const { error: authErr } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/filmroom/auth/callback` },
    })
    setLoading(false)
    if (authErr) { setError(authErr.message); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" aria-hidden />
        <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
        <p className="text-sm text-white/50 mb-6">We sent a confirmation link to <strong className="text-white/70">{email}</strong>.</p>
        <Link href="/filmroom/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Film className="w-4 h-4 text-white" aria-hidden /></div>
          <h1 className="text-lg font-bold text-white tracking-tight">Film Room</h1>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-5">Create your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {[
              { id: 'email', label: 'Email address', type: 'email', ac: 'email', ph: 'you@example.com', val: email, set: setEmail },
              { id: 'password', label: 'Password (min 8 characters)', type: 'password', ac: 'new-password', ph: '••••••••', val: password, set: setPassword },
              { id: 'confirm', label: 'Confirm password', type: 'password', ac: 'new-password', ph: '••••••••', val: confirm, set: setConfirm },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-xs font-medium text-white/60 mb-1.5">{f.label}</label>
                <input id={f.id} type={f.type} autoComplete={f.ac} required placeholder={f.ph}
                  value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors" />
              </div>
            ))}
            {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <p className="text-center text-xs text-white/40">
              Already have an account?{' '}
              <Link href="/filmroom/login" className="text-blue-400 hover:text-blue-300 transition-colors">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
