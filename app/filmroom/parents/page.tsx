'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { selectOwnedTeam, savedCoachTeam, rememberCoachTeam } from '@/lib/filmroom-navigation'
import { CsHeader } from '../components/cs-shared'
import { AccountBar } from '../components/AccountBar'
import { Users, Copy, Check, ChevronDown, ChevronRight, UserCheck, UserX, X, AlertTriangle } from 'lucide-react'

// ─── Types (contract-exact) ──────────────────────────────────────────────────
type Invite = { id: string; team_id: string; email: string; accepted_at: string | null; expires_at: string }
type Team = { id: string; name: string; viewer_stats_mode: 'private' | 'team' }
type Link = { invite_id: string; player_id: string; relationship: string | null; created_at: string }
type Request = { id: string; invite_id: string; requested_player_name: string; relationship: string | null; created_at: string }
type Player = { id: string; name: string; number: string | null; archived_at?: string | null }

const btn = 'min-h-11 rounded border border-white/20 px-4 py-2 text-sm disabled:opacity-50'
const btnPrimary = btn + ' bg-[#c66a3e] text-[#181917] font-semibold border-[#c66a3e]'
const btnDanger = btn + ' text-red-300'

// ─── Invite status ────────────────────────────────────────────────────────────
function inviteStatus(inv: Invite): 'accepted' | 'expired' | 'pending' {
  if (inv.accepted_at) return 'accepted'
  if (Date.parse(inv.expires_at) < Date.now()) return 'expired'
  return 'pending'
}

// ─── Stats mode pill ─────────────────────────────────────────────────────────
function StatsBadge({ mode }: { mode: 'private' | 'team' }) {
  return mode === 'team'
    ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Team-visible</span>
    : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#c9c3b8]">Private</span>
}

// ─── StatsMode selector for a team ───────────────────────────────────────────
function StatsModeCard({
  team,
  busy,
  onSetMode,
}: {
  team: Team
  busy: boolean
  onSetMode: (teamId: string, mode: 'private' | 'team') => Promise<void>
}) {
  const [localBusy, setLocalBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const handleChange = async (mode: 'private' | 'team') => {
    if (localBusy || busy) return
    setLocalBusy(true)
    setLocalError('')
    try {
      await onSetMode(team.id, mode)
    } catch (e) {
      setLocalError((e as Error).message)
    } finally {
      setLocalBusy(false)
    }
  }
  return (
    <div className="rounded-lg border border-white/10 bg-[#1b1c1a] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">{team.name} — Stats visibility</h3>
        <StatsBadge mode={team.viewer_stats_mode} />
      </div>
      <p className="text-xs text-[#c9c3b8]">
        <strong>Private:</strong> Stats visible only to coaches and viewers with an approved player connection.<br />
        <strong>Team-visible:</strong> Stats visible to all accepted invited members — not the public internet.
      </p>
      <div className="flex gap-3 flex-wrap">
        {(['private', 'team'] as const).map(mode => (
          <button
            key={mode}
            disabled={localBusy || busy || team.viewer_stats_mode === mode}
            onClick={() => void handleChange(mode)}
            aria-pressed={team.viewer_stats_mode === mode}
            className={btn + (team.viewer_stats_mode === mode ? ' border-[#c66a3e] font-semibold text-[#e49269]' : '')}
          >
            {mode === 'private' ? 'Private' : 'Team-visible'}
          </button>
        ))}
      </div>
      {localError && (
        <p role="alert" className="flex items-center gap-1 text-xs text-red-300">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {localError}
        </p>
      )}
    </div>
  )
}

// ─── Connection request row ───────────────────────────────────────────────────
function RequestRow({
  req,
  inviteId,
  players,
  busy,
  onApprove,
  onDismiss,
}: {
  req: Request
  inviteId: string
  players: Player[]
  busy: boolean
  // Fourth arg: exact request_id so the handler dismisses the right row
  onApprove: (inviteId: string, playerId: string, relationship: string, requestId: string) => Promise<void>
  onDismiss: (requestId: string) => Promise<void>
}) {
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [relationship, setRelationship] = useState(req.relationship === 'player' ? 'player' : 'parent')
  const [localBusy, setLocalBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const handleApprove = async () => {
    if (!selectedPlayer || localBusy) return
    setLocalBusy(true); setLocalError('')
    try {
      // Pass exact request_id; handler explicitly approves then dismisses that row
      await onApprove(inviteId, selectedPlayer, relationship, req.id)
    } catch (e) { setLocalError((e as Error).message) }
    finally { setLocalBusy(false) }
  }
  const handleDismiss = async () => {
    if (localBusy) return
    setLocalBusy(true); setLocalError('')
    try { await onDismiss(req.id) }
    catch (e) { setLocalError((e as Error).message) }
    finally { setLocalBusy(false) }
  }
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Connection request</p>
          <p className="mt-1 text-sm">
            Viewer says they are the <strong>{req.relationship ?? '—'}</strong> of{' '}
            <strong>{req.requested_player_name}</strong>
          </p>
          <p className="text-xs text-[#c9c3b8] mt-0.5">
            Coach approval required. Confirm the player before connecting.
          </p>
        </div>
        <button
          disabled={localBusy || busy}
          onClick={handleDismiss}
          aria-label="Dismiss this request without approving"
          className="flex h-8 w-8 items-center justify-center rounded border border-white/15 hover:bg-white/10 disabled:opacity-50"
        ><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select
          value={selectedPlayer}
          onChange={e => setSelectedPlayer(e.target.value)}
          className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
          aria-label="Select player to link"
          disabled={localBusy || busy}
        >
          <option value="">— Select player from roster —</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.number ? `#${p.number} ` : ''}{p.name}{p.archived_at ? ' (archived)' : ''}
            </option>
          ))}
        </select>
        <select
          value={relationship}
          onChange={e => setRelationship(e.target.value)}
          className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
          aria-label="Relationship"
          disabled={localBusy || busy}
        >
          <option value="parent">Parent</option>
          <option value="player">Player</option>
        </select>
        <button
          disabled={!selectedPlayer || localBusy || busy}
          onClick={handleApprove}
          className={btnPrimary}
        >
          Approve connection
        </button>
      </div>
      {localError && (
        <p role="alert" className="flex items-center gap-1 text-xs text-red-300">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {localError}
        </p>
      )}
    </div>
  )
}

// ─── Individual invite card ───────────────────────────────────────────────────
function InviteCard({
  invite,
  links,
  requests,
  players,
  busy,
  onRevoke,
  onApproveLink,
  onRevokeLink,
  onDismissRequest,
  onCopyLink,
}: {
  invite: Invite
  links: Link[]
  requests: Request[]
  players: Player[]
  busy: boolean
  onRevoke: (id: string, email: string) => void
  onApproveLink: (inviteId: string, playerId: string, relationship: string, requestId?: string) => Promise<void>
  onRevokeLink: (inviteId: string, playerId: string, playerName: string) => Promise<void>
  onDismissRequest: (requestId: string) => Promise<void>
  onCopyLink: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newPlayer, setNewPlayer] = useState('')
  const [newRelationship, setNewRelationship] = useState('parent')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')
  const status = inviteStatus(invite)
  const myLinks = links.filter(l => l.invite_id === invite.id)
  const myRequests = requests.filter(r => r.invite_id === invite.id)
  const statusColor = status === 'accepted' ? 'text-emerald-300' : status === 'expired' ? 'text-red-300' : 'text-amber-300'
  const statusLabel = status === 'accepted' ? 'Accepted' : status === 'expired' ? 'Expired' : 'Waiting for acceptance'

  const handleAddLink = async () => {
    if (!newPlayer || addBusy) return
    setAddBusy(true); setAddError('')
    try {
      await onApproveLink(invite.id, newPlayer, newRelationship)
      setNewPlayer(''); setNewRelationship('parent')
    } catch (e) { setAddError((e as Error).message) }
    finally { setAddBusy(false) }
  }

  const alreadyLinkedIds = new Set(myLinks.map(l => l.player_id))
  const availablePlayers = players.filter(p => !alreadyLinkedIds.has(p.id))

  return (
    <section className="rounded-lg border border-white/15 bg-[#1e1f1d] overflow-hidden">
      {/* Header row */}
      <button
        className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left hover:bg-white/5"
        onClick={() => setExpanded(x => !x)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} viewer details for ${invite.email}`}
      >
        <div className="min-w-0 flex-1">
          <p className="break-all font-semibold text-[#eee9df]">{invite.email}</p>
          <p className="mt-0.5 text-xs text-[#c9c3b8]">
            <span className={statusColor}>{statusLabel}</span>
            {myLinks.length > 0 && (
              <span className="ml-2">· {myLinks.length} player{myLinks.length !== 1 ? 's' : ''} linked</span>
            )}
            {myRequests.length > 0 && (
              <span className="ml-2 text-amber-300">· {myRequests.length} pending request{myRequests.length !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {myRequests.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              {myRequests.length} request{myRequests.length !== 1 ? 's' : ''}
            </span>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-[#c9c3b8]" /> : <ChevronRight className="h-4 w-4 text-[#c9c3b8]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5 space-y-5">
          {/* Actions row */}
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopyLink} className={btn + ' flex items-center gap-2'}>
              <Copy className="h-4 w-4" /> Copy viewer sign-in link
            </button>
            <button
              disabled={busy}
              onClick={() => onRevoke(invite.id, invite.email)}
              className={btnDanger}
            >
              Revoke access
            </button>
          </div>

          {status === 'pending' && (
            <p className="text-xs text-[#c9c3b8] rounded border border-white/10 px-3 py-2">
              Viewer must sign in with <strong>{invite.email}</strong> and accept the invitation. All current and future team games are shared automatically once accepted.
            </p>
          )}
          {status === 'expired' && (
            <p className="text-xs text-amber-200 rounded border border-amber-400/20 px-3 py-2">
              This invitation expired before acceptance. Enter the same email above to renew it.
            </p>
          )}

          {/* Pending connection requests */}
          {myRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Connection requests</h3>
              {myRequests.map(req => (
                <RequestRow
                  key={req.id}
                  req={req}
                  inviteId={invite.id}
                  players={players}
                  busy={busy}
                  onApprove={onApproveLink}
                  onDismiss={onDismissRequest}
                />
              ))}
            </div>
          )}

          {/* Linked players */}
          {myLinks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Linked players</h3>
              {myLinks.map(link => {
                const p = players.find(pl => pl.id === link.player_id)
                const playerLabel = p ? `${p.number ? '#' + p.number + ' ' : ''}${p.name}` : link.player_id.slice(0, 8) + '…'
                return (
                  <div key={link.player_id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 bg-[#252621] px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span><strong>{playerLabel}</strong></span>
                      {link.relationship && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#c9c3b8]">{link.relationship}</span>
                      )}
                      {p?.archived_at && <span className="text-xs text-[#c9c3b8]">(archived)</span>}
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => void onRevokeLink(invite.id, link.player_id, p?.name ?? 'this player')}
                      aria-label={`Revoke ${playerLabel} link for ${invite.email}`}
                      className="flex items-center gap-1 text-xs text-red-300 disabled:opacity-50 hover:text-red-200"
                    >
                      <UserX className="h-3.5 w-3.5" /> Revoke connection
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add player connection manually */}
          {status === 'accepted' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Add player connection</h3>
              <p className="text-xs text-[#c9c3b8]">
                General viewers can watch film without a player connection. Link a player to grant stats access (when stats are private) and show their stats.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <select
                  value={newPlayer}
                  onChange={e => setNewPlayer(e.target.value)}
                  className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
                  aria-label="Select player to link"
                  disabled={addBusy || busy}
                >
                  <option value="">— Select player —</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ''}{p.name}{p.archived_at ? ' (archived)' : ''}
                    </option>
                  ))}
                </select>
                <select
                  value={newRelationship}
                  onChange={e => setNewRelationship(e.target.value)}
                  className="min-h-10 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
                  aria-label="Relationship"
                  disabled={addBusy || busy}
                >
                  <option value="parent">Parent</option>
                  <option value="player">Player</option>
                </select>
                <button
                  disabled={!newPlayer || addBusy || busy}
                  onClick={handleAddLink}
                  className={btnPrimary}
                >
                  Approve connection
                </button>
              </div>
              {addError && (
                <p role="alert" className="flex items-center gap-1 text-xs text-red-300">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {addError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Main Viewers page ────────────────────────────────────────────────────────
export default function Viewers() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [team, setTeam] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const rosterAbort = useRef<AbortController | null>(null)
  const rosterSeq = useRef(0)

  const mutationRef = useRef(false)
  const [rosterError, setRosterError] = useState('')
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterRetry, setRosterRetry] = useState(0)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/filmroom/parents', { cache: 'no-store' })
      if (!r.ok) throw new Error('Could not refresh viewer access. Retry loading before making another change.')
      const d = await r.json()
      setInvites(d.invites ?? []); setTeams(d.teams ?? [])
      setLinks(d.links ?? []); setRequests(d.requests ?? [])
      setTeam(old => selectOwnedTeam(d.teams ?? [], old || savedCoachTeam())?.id ?? '')
      setReady(true)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }, [])
  useEffect(() => { void load().catch(() => {}) }, [load])

  useEffect(() => {
    rosterAbort.current?.abort()
    const ctrl = new AbortController()
    rosterAbort.current = ctrl
    const seq = ++rosterSeq.current
    async function loadRoster() {
      setPlayers([]); setRosterError(''); setRosterLoading(!!team)
      if (!team) return
      try {
        const r = await fetch(`/api/filmroom/players?team_id=${encodeURIComponent(team)}&include_archived=true`, { signal: ctrl.signal, cache: 'no-store' })
        if (!r.ok) throw new Error('Could not load players for this team.')
        const data = await r.json()
        if (!Array.isArray(data)) throw new Error('Could not load players for this team.')
        if (!ctrl.signal.aborted && seq === rosterSeq.current) setPlayers(data)
      } catch (e) {
        if (!ctrl.signal.aborted && seq === rosterSeq.current) setRosterError((e as Error).message)
      } finally {
        if (!ctrl.signal.aborted && seq === rosterSeq.current) setRosterLoading(false)
      }
    }
    void loadRoster()
    return () => ctrl.abort()
  }, [team, rosterRetry])

  async function runMutation(action: () => Promise<void>) {
    if (mutationRef.current) throw new Error('Please wait for the current change to finish.')
    mutationRef.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (e) { setError((e as Error).message); throw e }
    finally { mutationRef.current = false; setBusy(false) }
  }
  async function patch(body: unknown) {
    const r = await fetch('/api/filmroom/parents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not save this change.')
  }
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await runMutation(async () => {
        const r = await fetch('/api/filmroom/parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: team, email }) })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Could not create invitation.')
        setEmail('')
        setNotice(r.status === 201 ? 'Invitation created. Copy the viewer sign-in link and send it.' : 'Invitation reissued. The viewer can use the same sign-in link.')
        await load()
      })
    } catch { /* Error is shown by runMutation; preserve the draft on failed writes. */ }
  }
  const handleSetMode = (teamId: string, mode: 'private' | 'team') => runMutation(async () => {
    await patch({ action: 'set_stats_mode', team_id: teamId, mode }); await load()
  })
  const handleRevoke = async (id: string, emailAddr: string) => {
    if (mutationRef.current || !confirm(`Revoke viewer access for ${emailAddr}? This removes all linked players too. You can invite them again later.`)) return
    try { await runMutation(async () => {
      const r = await fetch('/api/filmroom/parents?id=' + encodeURIComponent(id), { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not revoke access.')
      setNotice('Viewer access revoked.'); await load()
    }) } catch { /* Error remains visible. */ }
  }
  const handleApproveLink = (inviteId: string, playerId: string, relationship: string, requestId?: string) => runMutation(async () => {
    await patch({ action: 'approve_link', id: inviteId, player_id: playerId, relationship })
    if (requestId) {
      try { await patch({ action: 'dismiss_request', request_id: requestId }) }
      catch {
        await load()
        throw new Error('Player connection approved, but the request could not be dismissed. Dismiss it separately after refreshing.')
      }
    }
    await load()
  })
  const handleRevokeLink = async (inviteId: string, playerId: string, playerName: string) => {
    if (mutationRef.current || !confirm(`Remove the player connection for ${playerName}? The viewer will lose private stats access for this player.`)) return
    try { await runMutation(async () => {
      await patch({ action: 'revoke_link', id: inviteId, player_id: playerId }); await load()
    }) } catch { /* Error remains visible, including network failures. */ }
  }
  const handleDismissRequest = (requestId: string) => runMutation(async () => {
    await patch({ action: 'dismiss_request', request_id: requestId }); await load()
  })

  // Copy viewer sign-in link
  const handleCopyLink = async () => {
    const url = location.origin + '/filmroom/family'
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      setNotice('Copied! Send this link to your viewer: ' + url)
    } catch {
      setNotice('Share this address with your viewer: ' + url)
    }
  }

  const selectedTeamObj = teams.find(t => t.id === team)
  const teamInvites = invites.filter(i => i.team_id === team)
  const pendingRequestCount = requests.filter(r => teamInvites.some(i => i.id === r.invite_id)).length

  return (
    <div className="cs min-h-screen bg-[#181917] text-[#eee9df]">
      <CsHeader active="library" right={<AccountBar />} />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Header */}
        <header>
          <p className="text-xs uppercase tracking-[.2em] text-[#e49269]">Bring families into the game</p>
          <h1 className="mt-2 text-4xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-[#e49269]" aria-hidden />
            Viewers
          </h1>
          <p className="mt-3 max-w-2xl text-[#c9c3b8]">
            Invite parents, players, or anyone you choose to view all team games — current and future — for free.
            After accepting with their invited email, they see every game automatically. No per-game selection needed.
            Film and stats are read-only; coaching notes stay private. Clip privacy is controlled individually.
          </p>
        </header>

        {/* Global error/notice */}
        {error && (
          <p role="alert" className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}{' '}
            <button onClick={() => { setError(''); void load().catch(() => {}) }} className="underline">Retry</button>
          </p>
        )}
        {notice && <p role="status" className="text-[#e49269]">{notice}</p>}
        {rosterLoading && <p role="status" className="text-sm text-[#c9c3b8]">Loading team players…</p>}
        {rosterError && <p role="alert" className="text-red-300">{rosterError} <button type="button" onClick={() => setRosterRetry(n => n + 1)} className="underline">Retry players</button></p>}
        {!ready && !error && <p role="status">Loading viewer access…</p>}

        {ready && (
          <>
            {/* Team selector + invite form */}
            <form
              onSubmit={handleInvite}
              className="grid gap-4 rounded-lg border border-white/15 bg-[#1e1f1d] p-5 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="flex flex-col gap-1 text-sm">
                Team
                <select
                  className="min-h-11 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
                  value={team}
                  disabled={busy}
                  onChange={e => { setTeam(e.target.value); rememberCoachTeam(e.target.value) }}
                >
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Viewer email
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={email}
                  disabled={busy}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="viewer@example.com"
                  className="min-h-11 rounded border border-white/20 bg-[#20211e] px-3 text-sm"
                />
              </label>
              <div className="flex flex-col justify-end gap-2">
                <button disabled={busy || !team} className={btnPrimary}>
                  Invite viewer
                </button>
              </div>
              <p className="sm:col-span-3 text-xs text-[#c9c3b8]">
                No email is sent automatically — copy and share the sign-in link after inviting.
                Viewer access is free. Unaccepted invitations expire after 14 days.
              </p>
            </form>

            {/* Copy link button */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleCopyLink} className={btn + ' flex items-center gap-2'}>
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy viewer sign-in link'}
              </button>
              <p className="text-xs text-[#c9c3b8]">
                Share <code className="text-[#e49269]">{typeof window !== 'undefined' ? location.origin : ''}/filmroom/family</code> with your viewers.
              </p>
            </div>

            {/* Stats mode for selected team */}
            {selectedTeamObj && (
              <StatsModeCard
                team={selectedTeamObj}
                busy={busy}
                onSetMode={handleSetMode}
              />
            )}

            {/* Pending requests badge */}
            {pendingRequestCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
                <span className="text-amber-200">
                  {pendingRequestCount} pending connection request{pendingRequestCount !== 1 ? 's' : ''} for this team.
                  Expand a viewer below to review.
                </span>
              </div>
            )}

            {/* Viewers list for selected team */}
            {teamInvites.length === 0 ? (
              <div className="rounded-lg border border-white/15 bg-[#1e1f1d] px-6 py-10 text-center">
                <Users className="mx-auto h-10 w-10 text-[#c9c3b8] mb-3" aria-hidden />
                <p className="font-semibold">No viewers for {selectedTeamObj?.name ?? 'this team'} yet</p>
                <p className="mt-2 text-sm text-[#c9c3b8]">
                  Enter an email above to invite your first viewer. They&apos;ll get access to all current and future games for free.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Viewers — {selectedTeamObj?.name}
                  <span className="ml-2 text-sm font-normal text-[#c9c3b8]">({teamInvites.length})</span>
                </h2>
                {teamInvites.map(inv => (
                  <InviteCard
                    key={inv.id}
                    invite={inv}
                    links={links}
                    requests={requests}
                    players={players}
                    busy={busy}
                    onRevoke={handleRevoke}
                    onApproveLink={handleApproveLink}
                    onRevokeLink={handleRevokeLink}
                    onDismissRequest={handleDismissRequest}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-[#c9c3b8]">
              Revoking access stops new access immediately. A video link already issued may work for up to one minute;
              previously downloaded or buffered footage cannot be recalled.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
