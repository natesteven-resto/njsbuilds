'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {safeFilmroomNext} from '@/lib/filmroom-auth-next'
import { AuthShell } from '../components/AuthShell'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { Loader2, CheckCircle2, Mail, RefreshCw, AlertCircle } from 'lucide-react'

const RESEND_COOLDOWN_SEC = 60

export default function SignupPage() {
  const [next,setNext]=useState('/filmroom')
  useEffect(()=>{setNext(safeFilmroomNext(new URLSearchParams(window.location.search).get('next')))},[])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Resend state
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendOk, setResendOk] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownSec <= 0) return
    const t = setTimeout(() => setCooldownSec(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldownSec])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
    const supabase = getSupabaseBrowser()
    const { error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/filmroom/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setLoading(false)
    if (authErr) { setError(authErr.message); return }
    setDone(true)
    setCooldownSec(RESEND_COOLDOWN_SEC)
    } catch {setError('Unable to create your account. Please try again.')} finally {setLoading(false)}
  }

  const handleResend = useCallback(async () => {
    if (cooldownSec > 0 || resending) return
    setResending(true)
    setResendError(null)
    setResendOk(false)
    try {
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/filmroom/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setResending(false)
    if (err) {
      setResendError(err.message)
    } else {
      setResendOk(true)
      setCooldownSec(RESEND_COOLDOWN_SEC)
    }
    } catch {setResendError('Unable to send email. Please try again.')} finally {setResending(false)}
  }, [email, cooldownSec, resending, next])

  if (done) {
    return (
      <AuthShell>

          <div className="w-full text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-emerald-400" aria-hidden />
            </div>

            <h2 className="text-3xl font-semibold text-[#eee9df] mb-3">Check your email</h2>
            <p className="text-sm text-white/60 mb-1">
              We sent a confirmation link to
            </p>
            <p className="text-sm font-semibold text-[#eee9df] mb-7 break-all">{email}</p>

            {/* Sender / spam guidance */}
            <div className="bg-white/4 border border-white/8 rounded-md px-4 py-3 mb-5 text-left space-y-1.5">
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">If you don't see it</p>
              <p className="text-xs text-white/60">
                From: <span className="text-white/70 font-mono">noreply@mail.njsbuilds.com</span>
              </p>
              <p className="text-xs text-white/60">• Check your spam or junk folder</p>
              <p className="text-xs text-white/60">• Check "Promotions" or "Updates" tabs</p>
              <p className="text-xs text-white/60">• Add the sender to your contacts to avoid future filtering</p>
            </div>

            {/* Resend */}
            <div className="space-y-2">
              {resendOk && (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                  Confirmation email resent
                </div>
              )}
              {resendError && (
                <div role="alert" className="flex items-center justify-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden />
                  {resendError}
                </div>
              )}

              <button
                onClick={handleResend}
                disabled={cooldownSec > 0 || resending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />Sending…</>
                  : cooldownSec > 0
                    ? <><RefreshCw className="w-3.5 h-3.5" aria-hidden />Resend in {cooldownSec}s</>
                    : <><RefreshCw className="w-3.5 h-3.5" aria-hidden />Resend confirmation email</>
                }
              </button>

              <p className="text-xs text-white/60 pt-1">
                Wrong address?{' '}
                <button
                  onClick={() => { setDone(false); setError(null); setResendOk(false); setResendError(null) }}
                  className="text-[#e79568] hover:text-[#f2b18c] transition-colors underline"
                >
                  Go back
                </button>
              </p>

              <p className="text-xs text-white/60">
                Already confirmed?{' '}
                <Link href={'/filmroom/login?next='+encodeURIComponent(next)} className="text-[#e79568] hover:text-[#f2b18c] transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>

        <div className="w-full">
          <h2 className="text-3xl font-semibold text-[#eee9df] mb-7">{next === '/filmroom/family' ? 'Create your parent account' : 'Create your account'}</h2>
          {next === '/filmroom/family' && <p className="mb-5 text-sm text-[#e79568]">Use the email your coach invited. Parent viewing is free.</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">
                Email address
              </label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
                placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-white/60 mb-1.5">
                Password <span className="text-white/60">(min 8 characters)</span>
              </label>
              <input id="password" type="password" autoComplete="new-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
                placeholder="••••••••" />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-xs font-medium text-white/60 mb-1.5">
                Confirm password
              </label>
              <input id="confirm" type="password" autoComplete="new-password" required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
                placeholder="••••••••" />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-md bg-[#c66a3e] hover:bg-[#db8052] disabled:opacity-50 text-sm font-semibold text-[#181917] transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-center text-xs text-white/60">
              Already have an account?{' '}
              <Link href={'/filmroom/login?next='+encodeURIComponent(next)} className="text-[#e79568] hover:text-[#f2b18c] transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </AuthShell>
  )
}
