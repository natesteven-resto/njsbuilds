'use client'
import { FamilyLibrary } from './FamilyLibrary'
import { ParentGameView, type SharedGame } from './ParentGameView'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { LogoutButton } from '../components/LogoutButton'
import { AlertTriangle, RefreshCw, CheckCircle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react'

type Link_ = { player_id: string; name: string; number: string | null; relationship: string | null; archived: boolean }
type Request_ = { id: string; requested_player_name: string; relationship: string | null }
type Invitation = {
  id: string
  team: string
  team_id: string
  stats_mode: 'private' | 'team'
  accepted: boolean
  expires_at: string
  links: Link_[]
  requests: Request_[]
}

// ─── Connection request form (per accepted invitation) ───────────────────────
function ConnectionRequestForm({
  invite,
  onSubmit,
}: {
  invite: Invitation
  onSubmit: (inviteId: string, playerName: string, relationship: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const submitRef = useRef(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitRef.current || !playerName.trim()) return
    submitRef.current = true
    setBusy(true); setError('')
    try {
      await onSubmit(invite.id, playerName.trim(), relationship)
      setDone(true)
      setPlayerName(''); setRelationship('parent')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      submitRef.current = false
      setBusy(false)
    }
  }

  const handleCancel = () => {
    if (submitRef.current) return
    setTimeout(() => openerRef.current?.focus(), 0)
    setOpen(false); setError(''); setDone(false); setPlayerName(''); setRelationship('parent')
  }

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  return (
    <div>
      {!open ? (
        <button
          ref={openerRef} onClick={() => setOpen(true)}
          className="text-sm text-[#e49269] hover:underline"
        >
          Request a player connection →
        </button>
      ) : (
        <div className="rounded-lg border border-white/15 bg-[#1b1c1a] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Request player connection</h4>
            <button disabled={busy} onClick={handleCancel} aria-label="Cancel connection request" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-[#c9c3b8]">
            Your coach will review this request. This is not an approval — it tells your coach who you are connected to.
          </p>
          {done && (
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0" /> Request submitted. Your coach will review it.
            </div>
          )}
          {!done && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1 text-xs text-[#c9c3b8]">
                  Player name
                  <input
                    ref={inputRef}
                    required
                    maxLength={120}
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    placeholder="First and last name"
                    className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm text-[#eee9df]"
                    disabled={busy}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#c9c3b8]">
                  Relationship
                  <select
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                    className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm text-[#eee9df]"
                    disabled={busy}
                  >
                    <option value="parent">Parent</option>
                    <option value="player">Player</option>
                  </select>
                </label>
              </div>
              {error && (
                <p role="alert" className="flex items-center gap-1 text-xs text-red-300">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {error}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button type="submit" disabled={busy || !playerName.trim()} className="min-h-10 rounded bg-[#c66a3e] px-4 text-sm font-semibold text-[#181917] disabled:opacity-50">
                  {busy ? 'Submitting…' : 'Submit request'}
                </button>
                <button type="button" disabled={busy} onClick={handleCancel} className="min-h-10 rounded border border-white/20 px-4 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Accepted invitation card ─────────────────────────────────────────────────
function AcceptedCard({
  invite,
  onRequestConnection,
}: {
  invite: Invitation
  onRequestConnection: (inviteId: string, playerName: string, relationship: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasLinks = (invite.links ?? []).length > 0
  const hasPendingRequests = (invite.requests ?? []).length > 0

  return (
    <section className="rounded-lg border border-white/15 bg-[#1e1f1d] overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5"
        onClick={() => setExpanded(x => !x)}
        aria-expanded={expanded}
      >
        <div>
          <p className="font-semibold text-sm">{invite.team}</p>
          <p className="mt-0.5 text-xs text-[#c9c3b8]">
            <span className="text-emerald-300">Accepted</span>
            {hasLinks && ` · ${invite.links.length} player${invite.links.length !== 1 ? 's' : ''} linked`}
            {hasPendingRequests && <span className="ml-1 text-amber-300"> · Request pending coach approval</span>}
          </p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-[#c9c3b8] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[#c9c3b8] shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <p className="text-xs text-[#c9c3b8]">
            All current and future games for <strong>{invite.team}</strong> are shared with your account automatically.
            Stats are {invite.stats_mode === 'team' ? (
              <span>
                <strong>team-visible</strong> — all accepted invited members can see them.
              </span>
            ) : (
              <span>
                <strong>private</strong> — only coaches and viewers with an approved player connection can see stats.
              </span>
            )}
          </p>

          {/* Linked players */}
          {hasLinks && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#c9c3b8]">Linked players</h4>
              {invite.links.map(link => (
                <div key={link.player_id} className="flex items-center gap-2 rounded border border-white/10 bg-[#252621] px-3 py-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    {link.number ? `#${link.number} ` : ''}<strong>{link.name}</strong>
                    {link.relationship && <span className="ml-2 text-xs text-[#c9c3b8]">({link.relationship})</span>}
                    {link.archived && <span className="ml-2 text-xs text-[#c9c3b8]">(archived)</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pending requests */}
          {hasPendingRequests && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#c9c3b8]">Pending requests</h4>
              {invite.requests.map(req => (
                <div key={req.id} className="flex items-center gap-2 rounded border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-300 shrink-0" />
                  <span>
                    <strong>{req.requested_player_name}</strong>
                    {req.relationship && <span className="ml-2 text-xs text-[#c9c3b8]">({req.relationship})</span>}
                    <span className="ml-2 text-xs text-amber-300">— awaiting coach approval</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* No stats note for general viewers with private stats */}
          {!hasLinks && !hasPendingRequests && invite.stats_mode === 'private' && (
            <div className="rounded border border-white/10 bg-[#1b1c1a] px-3 py-2 text-xs text-[#c9c3b8]">
              Stats are private for this team. Ask your coach for a player connection to see stats, or submit a request below.
            </div>
          )}

          {/* Connection request form */}
          <ConnectionRequestForm invite={invite} onSubmit={onRequestConnection} />
        </div>
      )}
    </section>
  )
}

// ─── Main family/Viewer page ──────────────────────────────────────────────────
export default function Family() {
  const [games, setGames] = useState<SharedGame[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [selected, setSelected] = useState<SharedGame | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const acceptRef = useRef(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/filmroom/family', { cache: 'no-store' })
    if (!r.ok) throw new Error('Could not load shared games.')
    const d = await r.json()
    setGames(d.games ?? [])
    setInvitations(d.invitations ?? [])
    setEmail(d.email ?? '')
    setReady(true)
    setSelected(old => old ? (d.games ?? []).find((g: SharedGame) => g.id === old.id) ?? null : null)
  }, [])

  useEffect(() => {
    void load().catch(e => setError((e as Error).message))
    const timer = setInterval(() => void load().catch(() => {}), 40000)
    return () => clearInterval(timer)
  }, [load])

  const handleAccept = async (id: string) => {
    if (acceptRef.current) return
    acceptRef.current = true
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/filmroom/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not accept invitation.')
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { acceptRef.current = false; setBusy(false) }
  }

  const handleRequestConnection = async (inviteId: string, playerName: string, relationship: string) => {
    const r = await fetch('/api/filmroom/family', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_connection', id: inviteId, requested_player_name: playerName, relationship }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not submit your request.')
    await load()
  }

  const pendingInvites = invitations.filter(i => !i.accepted && new Date(i.expires_at).getTime() > Date.now())
  const acceptedInvites = invitations.filter(i => i.accepted)

  return (
    <div className="cs min-h-screen bg-[#181917] text-[#eee9df]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <Link href="/filmroom/family" className="font-semibold text-lg">
          Film Room <span className="ml-2 text-sm text-[#e49269]">Viewer</span>
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/filmroom?view=coach" className="min-h-11 inline-flex items-center text-sm">Coach library</Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-6 px-4 py-8">
        {/* Error */}
        {error && (
          <p role="alert" className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}{' '}
            <button className="flex items-center gap-1 underline" onClick={() => { setError(''); void load().catch(e => setError((e as Error).message)) }}>
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </p>
        )}

        {!ready && !error && <p role="status">Loading your invitations…</p>}

        {/* Pending invitations — accept to unlock film */}
        {pendingInvites.map(inv => (
          <section key={inv.id} className="flex flex-wrap items-start gap-4 rounded-lg border border-[#c66a3e]/50 bg-[#c66a3e]/5 p-5">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">Join {inv.team}</h2>
              <p className="mt-1 text-sm text-[#c9c3b8]">
                Your coach invited you to view all team games. Viewing is free — no subscription required.
                You must accept with <strong>{email || 'the email your coach invited'}</strong>.
                All current and future games are shared automatically after you accept.
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => void handleAccept(inv.id)}
              className="min-h-11 rounded bg-[#c66a3e] px-5 font-semibold text-[#181917] disabled:opacity-50 shrink-0"
            >
              Accept &amp; join
            </button>
          </section>
        ))}

        {/* Empty state when nothing loaded yet */}
        {ready && pendingInvites.length === 0 && acceptedInvites.length === 0 && (
          <section className="rounded-lg border border-white/15 bg-[#1e1f1d] p-6">
            <h2 className="font-semibold">No invitations found</h2>
            <p className="mt-2 text-sm text-[#c9c3b8]">
              No invitation was found for <strong>{email || 'this account'}</strong>.
              Ask your coach to invite you with the email you signed in with, then use the sign-in link they share.
            </p>
          </section>
        )}

        {/* Game view — either game detail or library */}
        {selected ? (
          <ParentGameView key={[selected.id, selected.stats_mode, selected.stats, ...invitations.filter(i => i.accepted && i.team_id === selected.team_id).flatMap(i => (i.links ?? []).map(l => l.player_id)).sort()].join(':')} game={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            {/* Team game library for all accepted invitations — even if 0 games */}
            {acceptedInvites.length > 0 && (
              <FamilyLibrary
                games={games}
                invitations={acceptedInvites}
                onOpen={g => { setError(''); setSelected(g) }}
              />
            )}
          </>
        )}

        {/* Accepted team memberships — player connection + stats explanation */}
        {!selected && acceptedInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#c9c3b8]">Your team memberships</h2>
            {acceptedInvites.map(inv => (
              <AcceptedCard
                key={inv.id}
                invite={inv}
                onRequestConnection={handleRequestConnection}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {!selected && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4 text-xs text-[#c9c3b8]">
            <span>Signed in as {email} · Viewer access is free</span>
            <Link href="/filmroom/billing" className="min-h-11 inline-flex items-center gap-2 text-[#e49269]">
              Coach your own team? Explore Coach →
            </Link>
          </footer>
        )}
      </main>
    </div>
  )
}
