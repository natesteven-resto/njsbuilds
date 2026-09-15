'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ListVideo, Plus, Trash2, Pencil, Check, X, Loader2, ChevronRight } from 'lucide-react'
import { AccountBar } from '@/app/filmroom/components/AccountBar'
import { CsHeader } from '@/app/filmroom/components/cs-shared'
import type { Playlist } from '@/types/filmroom'

function PlaylistCard({ pl, onRename, onDelete }: {
  pl: Playlist & { clip_count?: number }
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(pl.name)
  const [saving, setSaving] = useState(false)

  const commit = async () => {
    const name = draft.trim()
    if (!name || name === pl.name) { setEditing(false); return }
    setSaving(true)
    await onRename(pl.id, name)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.10)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(198,106,62,0.15)' }}>
        <ListVideo className="w-4 h-4" style={{ color: '#c66a3e' }} />
      </div>

      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 bg-transparent border-b text-sm outline-none"
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
            <button onClick={commit} disabled={saving}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#c66a3e' }} aria-label="Save name">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setEditing(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(238,233,223,0.40)' }} aria-label="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setDraft(pl.name); setEditing(true) }}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(238,233,223,0.40)' }} aria-label={`Rename ${pl.name}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(pl.id)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
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
  )
}

export default function PlaylistsPage() {
  const router = useRouter()
  const [playlists, setPlaylists] = useState<(Playlist & { clip_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch('/api/filmroom/playlists')
      .then(r => { if (r.status === 401) { router.replace('/filmroom/login'); return null } return r.ok ? r.json() : [] })
      .then(d => { if (d) { setPlaylists(Array.isArray(d) ? d : []); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [router])

  const createPlaylist = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    const res = await fetch('/api/filmroom/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const pl = await res.json()
      setPlaylists(prev => [{ ...pl, clip_count: 0 }, ...prev])
      setNewName('')
      setShowForm(false)
    }
    setCreating(false)
  }

  const rename = async (id: string, name: string) => {
    const res = await fetch(`/api/filmroom/playlists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p))
    }
  }

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist? Clips are not deleted.')) return
    const res = await fetch(`/api/filmroom/playlists/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) setPlaylists(prev => prev.filter(p => p.id !== id))
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
          <button onClick={() => setShowForm(f => !f)}
            className="cs-btn-orange flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        {showForm && (
          <div className="flex items-center gap-2 p-3 rounded-xl border"
            style={{ background: '#1e1f1d', borderColor: 'rgba(238,233,223,0.15)' }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createPlaylist(); if (e.key === 'Escape') setShowForm(false) }}
              placeholder="Playlist name…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#eee9df' }} maxLength={120} />
            <button onClick={createPlaylist} disabled={creating || !newName.trim()}
              className="cs-btn-orange px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg" style={{ color: 'rgba(238,233,223,0.40)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading
          ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(238,233,223,0.30)' }} /></div>
          : playlists.length === 0
            ? <div className="text-center py-16">
                <ListVideo className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(238,233,223,0.15)' }} />
                <p style={{ color: 'rgba(238,233,223,0.60)' }}>No playlists yet — create one to organize clips across games.</p>
              </div>
            : <div className="space-y-2">
                {playlists.map(pl => (
                  <PlaylistCard key={pl.id} pl={pl} onRename={rename} onDelete={deletePlaylist} />
                ))}
              </div>
        }
      </main>
    </div>
  )
}
