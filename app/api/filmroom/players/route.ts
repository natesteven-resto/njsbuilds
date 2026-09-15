import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, stripServerFields } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    let query = supabase
      .from('players')
      .select('*')
      .eq('owner_id', user.id)
      .order('number', { ascending: true, nullsFirst: false })

    if (teamId) query = query.eq('team_id', teamId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getVerifiedUser(request)
    const supabase = createServiceClient()
    const raw = await request.json()
    const body = stripServerFields(raw)

    // Verify team ownership
    if (!body.team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 })
    const { data: team } = await supabase.from('teams').select('owner_id').eq('id', body.team_id).single()
    if (!team || team.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fix: jersey number 0 is valid — only coerce undefined/null/empty string, not 0
    const number = body.number !== undefined && body.number !== null && body.number !== ''
      ? parseInt(String(body.number), 10)
      : null
    const jerseyNumber = (!isNaN(number as number)) ? number : null

    const { data, error } = await supabase
      .from('players')
      .insert({
        ...body,
        number: jerseyNumber,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
