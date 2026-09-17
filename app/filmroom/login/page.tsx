'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '../components/AuthShell'
import { getSupabaseBrowser } from '@/lib/filmroom-supabase-browser'
import { Loader2, AlertCircle, Mail, RefreshCw, CheckCircle2, Info } from 'lucide-react'

const RESEND_COOLDOWN_SEC = 60

function safeNext(raw: string | null): string {
  if (!raw) return '/filmroom'
  if (/[\x00-\x1f\\]/.test(raw) || raw.startsWith('//') || raw.includes(':') ||
    (!raw.startsWith('/filmroom/') && raw !== '/filmroom')) return '/filmroom'
  return raw
}

type CallbackErrorInfo = { title: string; body: string; action: 'resend' | 'reset' | 'signin' }

function callbackErrorInfo(slug: string | null): CallbackErrorInfo | null {
  if (!slug) return null
  switch (slug) {
    case 'link_expired':
      return { title: 'Confirmation link expired', action: 'resend',
        body: 'Email confirmation links expire after 24 hours. Request a new one below.' }
    case 'link_used':
      return { title: 'Link already used', action: 'signin',
        body: 'This confirmation link has already been used. Try signing in, or request a new link if your account is still unconfirmed.' }
    case 'recovery_failed':
      return { title: 'Password reset failed', action: 'reset',
        body: 'The reset link is invalid or expired. Request a new password reset below.' }
    default:
      return { title: 'Confirmation link invalid', action: 'resend',
        body: 'This link is malformed or has already been used. Request a new confirmation email below, or try signing in.' }
  }
}

function SenderGuidance() {
  return (
    <div className="bg-white/4 border border-white/8 rounded-md px-4 py-3 space-y-1">
      <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Email comes from</p>
      <p className="text-xs font-mono text-white/70">noreply@mail.njsbuilds.com</p>
      <p className="text-xs text-white/60">Check spam, junk, and Promotions tabs</p>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const cbError = callbackErrorInfo(searchParams.get('error'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)

  // Resend state — shared between unconfirmed + callback error flows
  const [resending, setResending] = useState(false)
  const [resendOk, setResendOk] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [cooldownSec, setCooldownSec] = useState(0)

  useEffect(() => {
    if (cooldownSec <= 0) return
    const t = setTimeout(() => setCooldownSec(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldownSec])

  const handleResend = useCallback(async (emailToSend: string) => {
    if (cooldownSec > 0 || resending || !emailToSend.trim()) return
    setResending(true); setResendError(null); setResendOk(false)
    try {
    const supabase = getSupabaseBrowser()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: emailToSend,
      options: { emailRedirectTo: `${window.location.origin}/filmroom/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setResending(false)
    if (err) { setResendError(err.message) }
    else { setResendOk(true); setCooldownSec(RESEND_COOLDOWN_SEC) }
    } catch { setResendError('Unable to send email. Please try again.')} finally {setResending(false)}
  }, [cooldownSec, resending, next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null); setUnconfirmed(false); setResendOk(false); setResendError(null)
    try {
    const supabase = getSupabaseBrowser()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) {
      if (authErr.message.toLowerCase().includes('email not confirmed')) {
        // Show unconfirmed state — NO automatic resend; user must click explicitly
        setUnconfirmed(true)
        return
      }
      setError(authErr.message)
      return
    }
    router.push(next)
    router.refresh()
    } catch { setError('Unable to sign in. Please try again.')} finally {setLoading(false)}
  }

  const ResendButton = ({ emailVal }: { emailVal: string }) => (
    <div className="space-y-2">
      {resendOk && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
          Confirmation email sent to {emailVal}
        </div>
      )}
      {resendError && (
        <div role="alert" className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {resendError}
        </div>
      )}
      <button
        onClick={() => handleResend(emailVal)}
        disabled={cooldownSec > 0 || resending || !emailVal.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {resending
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />Sending…</>
          : cooldownSec > 0
            ? <><RefreshCw className="w-3.5 h-3.5" aria-hidden />Resend in {cooldownSec}s</>
            : <><RefreshCw className="w-3.5 h-3.5" aria-hidden />Resend confirmation email</>}
      </button>
    </div>
  )

  // ── Callback error (expired / invalid / used link) ───────────────────────
  if (cbError) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-300">{cbError.title}</p>
            <p className="text-xs text-amber-400/80">{cbError.body}</p>
          </div>
        </div>
        <SenderGuidance />
        {cbError.action === 'resend' && (
          <>
            {(
              <div>
                <label htmlFor="resend-email" className="block text-xs font-medium text-white/60 mb-1.5">Your email address</label>
                <input id="resend-email" type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors" />
              </div>
            )}
            <ResendButton emailVal={email} />
          </>
        )}
        {cbError.action === 'reset' && (
          <Link href="/filmroom/reset-password"
            className="block w-full text-center py-2.5 rounded-md bg-[#c66a3e] hover:bg-[#db8052] text-sm font-semibold text-[#181917] transition-colors">
            Request new password reset
          </Link>
        )}
        <button onClick={() => router.replace('/filmroom/login')}
          className="w-full text-xs text-white/60 hover:text-white/60 transition-colors py-1">
          ← Back to sign in
        </button>
      </div>
    )
  }

  // ── Unconfirmed email ────────────────────────────────────────────────────
  if (unconfirmed) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-300">Email not confirmed</p>
            <p className="text-xs text-amber-400/80">
              <strong className="text-amber-300">{email}</strong> hasn't been confirmed yet.
              Click the link in your confirmation email, or request a new one below.
            </p>
          </div>
        </div>
        <SenderGuidance />
        <ResendButton emailVal={email} />
        <button onClick={() => { setUnconfirmed(false); setResendOk(false); setResendError(null) }}
          className="w-full text-xs text-white/60 hover:text-white/60 transition-colors py-1">
          ← Try a different account
        </button>
      </div>
    )
  }

  // ── Normal sign-in form ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {next === '/filmroom/family' && <p className="text-sm text-[#e79568]">Parent access: sign in with the email your coach invited. No subscription is needed to view shared games.</p>}
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
        <input id="email" type="email" autoComplete="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
          placeholder="you@example.com" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-white/60">Password</label>
          <Link href="/filmroom/reset-password" className="text-xs text-[#e79568] hover:text-[#f2b18c] transition-colors">
            Forgot password?
          </Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" required value={password}
          onChange={e => setPassword(e.target.value)}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#c66a3e] focus:ring-1 focus:ring-[#c66a3e] transition-colors"
          placeholder="••••••••" />
      </div>
      {error && (
        <div id="login-error" role="alert"
          className="flex items-start gap-2 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />{error}
        </div>
      )}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-md bg-[#c66a3e] hover:bg-[#db8052] disabled:opacity-50 text-sm font-semibold text-[#181917] transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-white/60">
        No account?{' '}
        <Link href={'/filmroom/signup?next='+encodeURIComponent(next)} className="text-[#e79568] hover:text-[#f2b18c] transition-colors">Create one</Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <AuthShell>
        <div className="w-full">
          <h2 className="text-3xl font-semibold text-[#eee9df] mb-7">Sign in to your library</h2>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/60" aria-hidden /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </AuthShell>
  )
}
