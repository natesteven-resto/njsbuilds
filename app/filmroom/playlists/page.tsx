'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ListVideo, Plus, Trash2, Pencil, Check, X, Loader2, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import { CsHeader } from '@/app/filmroom/components/cs-shared'
import type { Playlist } from '@/types/filmroom'

function PlaylistCard({ pl, onRename, onDelete }: {
  pl: Playlist & { clip_count?: number }
  onRename: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(pl.name)
  const [saving, setSaving] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  // Ref-based in-flight lock prevents duplicate rename requests
  const renameInflight = useRef(false)

  const commit = async () => {
    const name = draft.trim()
    if (!name || name === pl.name) { setEditing(false); return }
    if (renameInflight.current) return
    renameInflight.current = true
    setSaving(true)
    setRenameError(null)
    try {
      const result = await onRename(pl.id, name)
      if (result.ok) {
        setEditing(false)
      } else {
        // Keep rename open so user can retry or correct
        setRenameError(result.error ?? 'Could not rename. Try again.')
      }
    } finally {
      renameInflight.current = false
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border"
      style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.10)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(198,106,62,0.15)' }}>
          <ListVideo className="w-4 h-4" style={{ color: '#c66a3e' }} />
        </div>

        {editing ? (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void commit(); if (e.key === 'Escape' && !saving) { setEditing(false); setRenameError(null) } }}
            className="flex-1 min-w-0 bg-transparent border-b text-sm outline-none"
            style={{ borderColor: '#c66a3e', color: '#eee9df' }} disabled={saving} />
        ) : (
          <Link href={`/filmroom/playlists/${pl.id}`} className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: '#eee9df' }}>{pl.name}</p>
            <p className="text-xs" style={{ color: 'rgba(238,233,223,0.50)' }}>
              {pl.clip_count ?? 0} clip{pl.clip_count !== 1 ? 's' : ''}
            </p>
          </Link>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button onClick={() => void commit()} disabled={saving}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#c66a3e' }} aria-label="Save name">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { if (!saving) { setEditing(false); setRenameError(null) } }}
                disabled={saving}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ color: 'rgba(238,233,223,0.40)' }} aria-label="Cancel">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setDraft(pl.name); setEditing(true); setRenameError(null) }}
                disabled={saving}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ color: 'rgba(238,233,223,0.40)' }} aria-label={`Rename ${pl.name}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => void onDelete(pl.id)}
                disabled={saving}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                style={{ color: 'rgba(238,233,223,0.40)' }} aria-label={`Delete ${pl.name}`}
                onPointerEnter={e => (e.currentTarget.style.color = '#f87171')}
                onPointerLeave={e => (e.currentTarget.style.color = 'rgba(238,233,223,0.40)')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <Link href={`/filmroom/playlists/${pl.id}`}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(238,233,223,0.40)' }} aria-label={`Open ${pl.name}`}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
      {renameError && (
        <p role="alert" className="text-xs text-red-300 pl-12">{renameError}</p>
      )}
    </div>
  )
}

export default function PlaylistsPage() {
  const router = useRouter()
  const [playlists, setPlaylists] = useState<(Playlist & { clip_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const newBtnRef = useRef<HTMLButtonElement>(null)
  const newNameInputRef = useRef<HTMLInputElement>(null)
  const createInflight = useRef(false)
  const deleteInflight = useRef(new Set<string>())

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/filmroom/playlists')
      if (res.status === 401) { router.replace('/filmroom/login'); return }
      if (!res.ok) { setLoadError(true); return }
      const d = await res.json()
      setPlaylists(Array.isArray(d) ? d : [])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  const openForm = () => {
    if (showForm) {
      // Form already open — focus the existing input without erasing draft
      newNameInputRef.current?.focus()
      return
    }
    setShowForm(true)
    setCreateError(null)
    setNewName('')
  }

  const closeForm = () => {
    if (createInflight.current) return
    setShowForm(false)
    setCreateError(null)
    // Return focus to New button
    setTimeout(() => newBtnRef.current?.focus(), 0)
  }

  const createPlaylist = async () => {
    const name = newName.trim()
    if (!name || createInflight.current) return
    createInflight.current = true
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/filmroom/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const pl = await res.json()
        setPlaylists(prev => [{ ...pl, clip_count: 0 }, ...prev])
        setNewName('')
        createInflight.current = false
        closeForm()
      } else {
        const body = await res.json().catch(() => ({}))
        setCreateError(body?.error ?? `Could not create playlist (${res.status}). Try again.`)
      }
    } catch {
      setCreateError('Network error — playlist was not created. Check your connection.')
    } finally {
      createInflight.current = false
      setCreating(false)
    }
  }

  const rename = async (id: string, name: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/filmroom/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p))
        return { ok: true }
      }
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body?.error ?? `Could not rename (${res.status}). Try again.` }
    } catch {
      return { ok: false, error: 'Network error — name was not saved. Check your connection.' }
    }
  }

  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  const deletePlaylist = async (id: string) => {
    if (deleteInflight.current.has(id)) return
    if (!confirm('Delete this playlist? Clips are not deleted.')) return
    deleteInflight.current.add(id)
    setDeleteErrors(e => { const next = { ...e }; delete next[id]; return next })
    try {
      const res = await fetch(`/api/filmroom/playlists/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setPlaylists(prev => prev.filter(p => p.id !== id))
      } else {
        const body = await res.json().catch(() => ({}))
        setDeleteErrors(e => ({ ...e, [id]: body?.error ?? `Could not delete (${res.status}). Try again.` }))
      }
    } catch {
      setDeleteErrors(e => ({ ...e, [id]: 'Network error — playlist was not deleted.' }))
    } finally {
      deleteInflight.current.delete(id)
    }
  }

  return (
    <div className="cs min-h-screen" style={{ background: '#181917', color: '#eee9df' }}>
      <CsHeader active="playlists" right={<AccountBar />} />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-black uppercase tracking-tight text-2xl"
            style={{ fontFamily: 'var(--font-bc,"Arial Narrow",sans-serif)' }}>
            Playlists
          </h1>
          <button ref={newBtnRef} onClick={openForm}
            className="cs-btn-orange flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
            aria-label="New playlist" aria-expanded={showForm}>
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        {showForm && (
          <div className="space-y-2 p-3 rounded-xl border"
            style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.15)' }}>
            <div className="flex items-center gap-2">
              <input ref={newNameInputRef} disabled={creating} autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void createPlaylist(); if (e.key === 'Escape') closeForm() }}
                placeholder="Playlist name…"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                style={{ color: '#eee9df' }} maxLength={120} />
              <button onClick={() => void createPlaylist()} disabled={creating || !newName.trim()}
                className="cs-btn-orange px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
              </button>
              <button onClick={closeForm} disabled={creating}
                className="p-1.5 rounded-lg" style={{ color: 'rgba(238,233,223,0.40)' }}
                aria-label="Close new playlist form">
                <X className="w-4 h-4" />
              </button>
            </div>
            {createError && (
              <p role="alert" className="text-xs text-red-300">{createError}</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} />
          </div>
        ) : loadError ? (
          <div className="text-center py-16 space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-red-400/60" />
            <p className="text-sm text-red-300">Could not load playlists.</p>
            <button onClick={() => void load()}
              className="flex items-center gap-1.5 mx-auto px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16">
            <ListVideo className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(238,233,223,0.15)' }} />
            <p style={{ color: 'rgba(238,233,223,0.60)' }}>No playlists yet — create one to organize clips across games.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlists.map(pl => (
              <div key={pl.id} className="space-y-1">
                <PlaylistCard pl={pl} onRename={rename} onDelete={deletePlaylist} />
                {deleteErrors[pl.id] && (
                  <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
                    <span className="text-xs text-red-300 flex-1">{deleteErrors[pl.id]}</span>
                    <button onClick={() => setDeleteErrors(e => { const next = { ...e }; delete next[pl.id]; return next })}
                      aria-label="Dismiss" className="text-xs text-red-400 hover:text-red-300 font-medium">Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
