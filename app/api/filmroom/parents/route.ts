import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getVerifiedUser } from '@/lib/filmroom-supabase-server'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type ViewerLink = {invite_id:string;player_id:string;relationship:string|null;created_at:string}
type ConnectionRequest = {id:string;invite_id:string;requested_player_name:string;relationship:string|null;created_at:string}
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

// GET: owner's invitations, their approved viewer→player links, and pending requests.
export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const svc = createServiceClient()
    const { data: invites, error } = await svc
      .from('filmroom_parent_invites')
      .select('id,team_id,email,accepted_at,expires_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return fail('Could not load viewer access.', 500)

    const { data: teams, error: teamsError } = await svc
      .from('teams')
      .select('id,name,viewer_stats_mode')
      .eq('owner_id', user.id)

    if (teamsError) return fail('Could not load team policies.', 500)
    const inviteIds = (invites ?? []).map(i => i.id)
    let links: ViewerLink[] = []
    let requests: ConnectionRequest[] = []
    if (inviteIds.length) {
      const { data: l, error: linksError } = await svc
        .from('filmroom_viewer_player_links')
        .select('invite_id,player_id,relationship,created_at')
        .in('invite_id', inviteIds)
      if (linksError) return fail('Could not load approved connections.', 500)
      links = l ?? []
      const { data: r, error: requestsError } = await svc
        .from('filmroom_viewer_requests')
        .select('id,invite_id,requested_player_name,relationship,created_at')
        .in('invite_id', inviteIds)
        .order('created_at', { ascending: true })
      if (requestsError) return fail('Could not load connection requests.', 500)
      requests = r ?? []
    }
    return NextResponse.json(
      { invites: invites ?? [], teams: teams ?? [], links, requests },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e) {
    return e instanceof NextResponse ? e : fail('Could not load viewer access.', 500)
  }
}

// POST: create a team-wide viewer invitation (verified acceptance happens later; no email sent).
// Reissues an expired, unaccepted invite in-place (same row id) with accepted state cleared.
export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const body = await request.json()
    if (typeof body.team_id !== 'string' || !uuid.test(body.team_id) || typeof body.email !== 'string')
      return fail('Team and email are required.')
    const email = body.email.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === user.email?.toLowerCase())
      return fail('Enter a viewer’s email address.')
    const svc = createServiceClient()
    const { data: team } = await svc.from('teams').select('id').eq('id', body.team_id).eq('owner_id', user.id).maybeSingle()
    if (!team) return fail('Team not found.', 404)

    const { data, error } = await svc
      .from('filmroom_parent_invites')
      .insert({ team_id: team.id, owner_id: user.id, email })
      .select('id')
      .single()
    if (!error) return NextResponse.json(data, { status: 201 })
    if (error.code !== '23505') return fail('Could not create invitation.', 500)

    // Unique (team_id,email) collision: reissue only if existing row is expired & unaccepted.
    const { data: existing } = await svc
      .from('filmroom_parent_invites')
      .select('id,accepted_by,expires_at')
      .eq('owner_id', user.id).eq('team_id', team.id).eq('email', email)
      .maybeSingle()
    if (!existing) return fail('This email already has an invitation.', 409)
    const expired = existing.expires_at ? new Date(existing.expires_at).getTime() <= Date.now() : false
    if (existing.accepted_by || !expired)
      return fail('This email already has an active invitation. Revoke it first to invite again.', 409)
    // Safe reissue: same row id, clear accepted state, extend expiry. Never un-revokes a revoked link.
    const reissueBefore = new Date().toISOString()
    const { data: reissued, error: upErr } = await svc
      .from('filmroom_parent_invites')
      .update({ accepted_by: null, accepted_at: null, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() })
      .eq('id', existing.id).eq('owner_id', user.id)
      .is('accepted_by', null).lte('expires_at', reissueBefore)
      .select('id').maybeSingle()
    if (upErr) return fail('Could not reissue invitation.', 500)
    if (!reissued) return fail('Invitation changed. Refresh before trying again.', 409)
    return NextResponse.json(reissued, { status: 200 })
  } catch (e) {
    return e instanceof NextResponse ? e : fail('Could not create invitation.', 500)
  }
}

// PATCH: explicit owner actions. Legacy per-game sharing payloads are rejected.
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const b = await request.json()
    const action = b?.action
    const svc = createServiceClient()

    if (b && 'game_id' in b && !action)
      return fail('Per-game sharing is no longer supported. Viewers get all team games automatically.', 400)

    // Resolve + ownership-check an invite by id.
    const ownedInvite = async (id: unknown) => {
      if (typeof id !== 'string' || !uuid.test(id)) return null
      const { data } = await svc.from('filmroom_parent_invites').select('id,team_id').eq('id', id).eq('owner_id', user.id).maybeSingle()
      return data ?? null
    }

    switch (action) {
      case 'set_stats_mode': {
        if (typeof b.team_id !== 'string' || !uuid.test(b.team_id) || (b.mode !== 'team' && b.mode !== 'private'))
          return fail('A team and a valid mode (team|private) are required.')
        const { data: team } = await svc.from('teams').select('id').eq('id', b.team_id).eq('owner_id', user.id).maybeSingle()
        if (!team) return fail('Team not found.', 404)
        const { error } = await svc.from('teams').update({ viewer_stats_mode: b.mode }).eq('id', team.id).eq('owner_id', user.id)
        if (error) return fail('Could not update stats policy.', 500)
        return NextResponse.json({ ok: true, team_id: team.id, mode: b.mode })
      }
      case 'approve_link': {
        const invite = await ownedInvite(b.id)
        if (!invite) return fail('Invitation not found.', 404)
        if (typeof b.player_id !== 'string' || !uuid.test(b.player_id)) return fail('A player is required.')
        if (b.relationship != null && (typeof b.relationship !== 'string' || b.relationship.length > 40))
          return fail('Invalid relationship.')
        // Player must belong to the invite's team and owner (archived history allowed).
        const { data: player } = await svc.from('players').select('id').eq('id', b.player_id).eq('team_id', invite.team_id).eq('owner_id', user.id).maybeSingle()
        if (!player) return fail('Player not found on this team.', 404)
        const { error } = await svc.from('filmroom_viewer_player_links')
          .upsert({ invite_id: invite.id, player_id: player.id, relationship: b.relationship ?? null }, { onConflict: 'invite_id,player_id' })
        if (error) return fail('Could not approve link.', 500)
        return NextResponse.json({ ok: true })
      }
      case 'revoke_link': {
        const invite = await ownedInvite(b.id)
        if (!invite) return fail('Invitation not found.', 404)
        if (typeof b.player_id !== 'string' || !uuid.test(b.player_id)) return fail('A player is required.')
        const { error } = await svc.from('filmroom_viewer_player_links').delete().eq('invite_id', invite.id).eq('player_id', b.player_id)
        if (error) return fail('Could not revoke link.', 500)
        return NextResponse.json({ ok: true })
      }
      case 'dismiss_request': {
        if (typeof b.request_id !== 'string' || !uuid.test(b.request_id)) return fail('A request id is required.')
        // Only dismiss requests belonging to an invite this owner controls.
        const { data: req } = await svc.from('filmroom_viewer_requests').select('id,invite_id').eq('id', b.request_id).maybeSingle()
        if (!req) return fail('Request not found.', 404)
        if (!(await ownedInvite(req.invite_id))) return fail('Request not found.', 404)
        const { error } = await svc.from('filmroom_viewer_requests').delete().eq('id', req.id)
        if (error) return fail('Could not dismiss request.', 500)
        return NextResponse.json({ ok: true })
      }
      default:
        return fail('Unknown action.')
    }
  } catch (e) {
    return e instanceof NextResponse ? e : fail('Could not update viewer access.', 500)
  }
}

// DELETE: revoke an owned invitation (cascades links + requests). Future access stops immediately.
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const id = request.nextUrl.searchParams.get('id')
    if (!id || !uuid.test(id)) return fail('Invitation ID required.')
    const { error } = await createServiceClient().from('filmroom_parent_invites').delete().eq('id', id).eq('owner_id', user.id)
    if (error) return fail('Could not revoke access.', 500)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return e instanceof NextResponse ? e : fail('Could not revoke access.', 500)
  }
}
