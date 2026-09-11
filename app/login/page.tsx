'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 8px 32px rgba(31,38,135,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#e0e7ff 0%,#f0fdf4 50%,#fef3c7 100%)', fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", position: 'relative', overflow: 'hidden' },
  bgGlow:  { position: 'fixed', top: -120, left: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(129,140,248,0.35),transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 },
  bgGlow2: { position: 'fixed', bottom: -140, right: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(94,234,212,0.28),transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 },
  lockWrap: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  lockCard: { borderRadius: 28, padding: '32px 28px 28px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  lockIcon: { fontSize: 36, marginBottom: 4 },
  lockTitle: { margin: '10px 0 2px', fontSize: 26, fontWeight: 800, letterSpacing: -0.6, color: '#1e293b' },
  lockSub: { margin: '0 0 4px', fontSize: 14, color: '#64748b', fontWeight: 500 },
  lockErr: { fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 4 },
  pinDots: { display: 'flex', gap: 12, justifyContent: 'center', margin: '22px 0 14px' },
  pinShake: { animation: 'shake 0.35s' },
  pinDot: { width: 14, height: 14, borderRadius: '50%', background: 'rgba(148,163,184,0.3)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.4)', transition: 'all 0.15s' },
  pinDotFilled: { background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 2px 8px rgba(79,70,229,0.4)' },
  pinDotErr: { background: 'rgba(239,68,68,0.4)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.5)' },
  pad: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: '100%', marginTop: 8 },
  padKey: { ...glass, height: 62, borderRadius: 18, fontSize: 24, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.55)' },
  padBack: { fontSize: 20, color: '#64748b' },
}

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const submit = useCallback(async (value: string) => {
    setBusy(true)
    setErr(false)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value }),
      })
      if (r.ok) { router.push('/'); return }
      setErr(true); setPin('')
    } catch {
      setErr(true); setPin('')
    } finally {
      setBusy(false)
    }
  }, [router])

  const press = useCallback((d: string) => {
    if (busy) return
    setErr(false)
    const next = (pin + d).slice(0, 6)
    setPin(next)
    if (next.length === 6) submit(next)
  }, [pin, busy, submit])

  const back = useCallback(() => { setErr(false); setPin(p => p.slice(0, -1)) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, back])

  return (
    <main style={S.page}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
      <div style={S.bgGlow} /><div style={S.bgGlow2} />
      <div style={S.lockWrap}>
        <div style={{ ...glass, ...S.lockCard }}>
          <div style={S.lockIcon}>🔒</div>
          <h1 style={S.lockTitle}>NJSBuilds</h1>
          <p style={S.lockSub}>Enter your PIN</p>
          <div style={{ ...S.pinDots, ...(err ? S.pinShake : {}) }}>
            {[0,1,2,3,4,5].map(i => (
              <span key={i} style={{ ...S.pinDot, ...(i < pin.length ? S.pinDotFilled : {}), ...(err ? S.pinDotErr : {}) }} />
            ))}
          </div>
          {err && <div style={S.lockErr}>Wrong PIN — try again</div>}
          <div style={S.pad}>
            {['1','2','3','4','5','6','7','8','9'].map(n => (
              <button key={n} style={S.padKey} onClick={() => press(n)}>{n}</button>
            ))}
            <span />
            <button style={S.padKey} onClick={() => press('0')}>0</button>
            <button style={{ ...S.padKey, ...S.padBack }} onClick={back}>⌫</button>
          </div>
        </div>
      </div>
    </main>
  )
}
