'use client'

import { useState, useEffect } from 'react'

type Signup = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  sexPref: string
  colorPref: string
  notes: string
  status: 'new' | 'contacted' | 'reserved' | 'pass'
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-blue-500/15 text-blue-400 border-blue-500/30',
  contacted: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  reserved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pass:      'bg-red-500/15 text-red-400 border-red-500/30',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/puppies/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (data.signups) {
      setSignups(data.signups)
      setAuthed(true)
    } else {
      setError('Wrong password')
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    await fetch('/api/puppies/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, password }),
    })
    setSignups(prev => prev.map(s => s.id === id ? { ...s, status: status as Signup['status'] } : s))
    setUpdating(null)
  }

  const counts = {
    total: signups.length,
    new: signups.filter(s => s.status === 'new').length,
    contacted: signups.filter(s => s.status === 'contacted').length,
    reserved: signups.filter(s => s.status === 'reserved').length,
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#07090D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', sans-serif" }}>
      <form onSubmit={login} style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 40, width: 340 }}>
        <h2 style={{ color: '#FF5F04', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>🐾 Puppy Admin</h2>
        <p style={{ color: '#6B7280', margin: '0 0 24px', fontSize: 14 }}>Enter your password to view signups.</p>
        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#F1F3F5', fontSize: 15, boxSizing: 'border-box', marginBottom: 16, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#FF5F04', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Checking...' : 'Sign In'}
        </button>
      </form>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090D', color: '#F1F3F5', fontFamily: "'Helvetica Neue', sans-serif", padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>🐾 Puppy Signups</h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>Silver Lab litter · Final litter</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Total', value: counts.total, color: '#F1F3F5' },
            { label: 'New', value: counts.new, color: '#60a5fa' },
            { label: 'Contacted', value: counts.contacted, color: '#fbbf24' },
            { label: 'Reserved', value: counts.reserved, color: '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Signups List */}
        {signups.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: 60 }}>No signups yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {signups.map(s => (
              <div key={s.id} style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{s.firstName} {s.lastName}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid', ...{} }} className={STATUS_STYLES[s.status]}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#9ca3af', marginBottom: s.notes ? 8 : 0 }}>
                      <a href={`mailto:${s.email}`} style={{ color: '#FF5F04' }}>{s.email}</a>
                      {s.phone && <span>📞 {s.phone}</span>}
                      <span>Sex: {s.sexPref}</span>
                      <span>Color: {s.colorPref}</span>
                      <span style={{ color: '#4b5563' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                    {s.notes && <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>"{s.notes}"</div>}
                  </div>
                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {(['new', 'contacted', 'reserved', 'pass'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => updateStatus(s.id, st)}
                        disabled={updating === s.id || s.status === st}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: s.status === st ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: s.status === st ? '#F1F3F5' : '#6B7280',
                          fontSize: 12,
                          cursor: s.status === st ? 'default' : 'pointer',
                          fontWeight: s.status === st ? 700 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
