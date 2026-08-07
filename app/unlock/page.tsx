'use client'

import { useState, useEffect, useRef } from 'react'

export default function UnlockPage() {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'locked'>('idle')
  const [message, setMessage] = useState('')
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check current status on load
  useEffect(() => {
    fetch('/api/unlock')
      .then(r => r.json())
      .then(data => setIsUnlocked(data.unlocked))
      .catch(() => setIsUnlocked(false))
  }, [])

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      setMessage('Enter your 4-digit PIN')
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setIsUnlocked(true)
        setMessage('✅ Computer unlocked! They can get on now.')
        setPin('')
      } else {
        setStatus('error')
        setMessage('Wrong PIN. Try again.')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  const handleLock = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('locked')
        setIsUnlocked(false)
        setMessage('🔒 Computer locked.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong.')
    }
  }

  const handlePinInput = (val: string) => {
    if (/^\d{0,4}$/.test(val)) {
      setPin(val)
      setStatus('idle')
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4) handleUnlock()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">
            {isUnlocked === null ? '⏳' : isUnlocked ? '🔓' : '🔒'}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isUnlocked === null
              ? 'Checking...'
              : isUnlocked
              ? 'Computer Unlocked'
              : 'Computer Locked'}
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {isUnlocked
              ? 'The boys are good to game. Resets at midnight.'
              : 'Chores and workout first. Enter PIN to unlock.'}
          </p>
        </div>

        {/* Unlock form — only show when locked */}
        {!isUnlocked && (
          <div className="space-y-4">
            {/* PIN dots display */}
            <div className="flex justify-center gap-4 mb-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-white scale-110' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={pin}
              onChange={e => handlePinInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter PIN"
              maxLength={4}
              className="w-full bg-gray-900 border border-gray-700 text-white text-center text-2xl font-mono tracking-widest rounded-2xl px-4 py-4 focus:outline-none focus:border-white placeholder:text-gray-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />

            <button
              onClick={handleUnlock}
              disabled={status === 'loading' || pin.length !== 4}
              className="w-full bg-white text-gray-950 font-semibold text-lg py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {status === 'loading' ? '...' : 'Unlock'}
            </button>
          </div>
        )}

        {/* Lock button — only show when unlocked */}
        {isUnlocked && (
          <button
            onClick={handleLock}
            disabled={status === 'loading'}
            className="w-full border border-gray-700 text-gray-400 font-medium py-3 rounded-2xl disabled:opacity-40 active:scale-[0.98] transition-all text-sm"
          >
            {status === 'loading' ? '...' : 'Lock it back up'}
          </button>
        )}

        {/* Status message */}
        {message && (
          <p className={`text-center mt-4 text-sm font-medium ${
            status === 'success' || status === 'locked'
              ? 'text-green-400'
              : status === 'error'
              ? 'text-red-400'
              : 'text-gray-400'
          }`}>
            {message}
          </p>
        )}

        <p className="text-center text-gray-600 text-xs mt-10">
          Resets automatically at midnight
        </p>
      </div>
    </div>
  )
}
