'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
    } else {
      setError(true)
      setPassword('')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#07090D', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-white font-bold text-2xl tracking-tight">
            NJS<span style={{ color: '#FF5F04' }}>Builds</span>
          </span>
          <p className="mt-3 text-sm" style={{ color: '#6B7280' }}>
            Private access only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            required
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
            style={{
              background: '#141920',
              border: error
                ? '1px solid rgba(239,68,68,0.6)'
                : '1px solid rgba(255,255,255,0.08)',
              color: '#F1F3F5',
            }}
          />

          {error && (
            <p className="text-sm text-center" style={{ color: '#EF4444' }}>
              Wrong password
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: loading || !password ? 'rgba(255,95,4,0.4)' : '#FF5F04',
              color: '#fff',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
