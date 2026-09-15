/**
 * Film Room Teams API
 *
 * GET  — list caller's teams (RLS-scoped via authenticated client)
 * POST — provision default coach+team via RPC (authenticated client so auth.uid() resolves).
 *        Idempotent. No legacy coach fallback. Works for brand-new accounts.
 *        Concurrent calls safe (advisory lock inside RPC).
 *
 * IMPORTANT: provision_default_library RPC uses auth.uid() internally.
 * Must be called with the authenticated supabase client from getVerifiedUser,
 * NOT the service role client (which has null auth.uid()).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // getVerifiedUser returns the authenticated client whose session cookie
    // carries the JWT — this is what the RPC needs for auth.uid() to resolve.
    const { user, supabase } = await getVerifiedUser(request)
    const raw = await request.json().catch(() => ({}))

    const name   = typeof raw.name   === 'string' && raw.name.trim()   ? raw.name.trim()   : 'My Team'
    const season = typeof raw.season === 'string' && raw.season.trim() ? raw.season.trim() : '2025-26'
    const sport  = typeof raw.sport  === 'string' && raw.sport.trim()  ? raw.sport.trim()  : 'basketball'

    // Call RPC with authenticated client — auth.uid() = user.id inside the function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('provision_default_library', {
      p_team_name: name,
      p_season:    season,
      p_sport:     sport,
    })

    if (rpcErr) {
      console.error('[teams/provision]', rpcErr)
      return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    }

    const teamId = (rpcData as { team_id: string }).team_id

    // Fetch full team row via authenticated client (RLS-scoped to caller)
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamErr || !team)
      return NextResponse.json({ error: 'Team provisioned but could not be fetched' }, { status: 500 })

    // Defence in depth: verify owner matches caller
    if (team.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(team, { status: 200 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
