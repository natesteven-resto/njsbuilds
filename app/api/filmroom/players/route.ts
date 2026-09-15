import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    let query = supabase
      .from('players').select('*').eq('owner_id', user.id)
      .order('number', { ascending: true, nullsFirst: false })

    if (teamId) {
      // Verify team ownership via RLS client
      const { data: team } = await supabase
        .from('teams').select('id, owner_id').eq('id', teamId).single()
      if (!team || team.owner_id !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const raw = await request.json()

    // Explicit allowlist
    const teamId      = typeof raw.team_id === 'string' ? raw.team_id : null
    const name        = typeof raw.name === 'string' ? raw.name.trim() : ''
    const position    = typeof raw.position === 'string' ? raw.position.trim() || null : null
    const parentEmail = typeof raw.parent_email === 'string' ? raw.parent_email.trim() || null : null

    // Jersey 0 is valid — only coerce undefined/null/empty to null, never 0
    let jerseyNumber: number | null = null
    if (raw.number !== undefined && raw.number !== null && raw.number !== '') {
      const parsed = parseInt(String(raw.number), 10)
      jerseyNumber = isNaN(parsed) ? null : parsed  // 0 is preserved correctly
    }

    if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 })
    if (!name)   return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Verify team ownership via RLS client
    const { data: team, error: teamErr } = await supabase
      .from('teams').select('id, owner_id').eq('id', teamId).single()
    if (teamErr || !team || team.owner_id !== user.id)
      return NextResponse.json({ error: 'Forbidden: team not owned' }, { status: 403 })

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('players')
      .insert({ team_id: teamId, name, number: jerseyNumber, position, parent_email: parentEmail, owner_id: user.id })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
