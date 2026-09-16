import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'

import { requirePaid, billingEnabled } from '@/lib/filmroom-billing'

// Explicit allowlist of client-writable game fields.
// video_url, video_id, owner_id, team_id, created_at are server-only.
const GAME_CREATE_FIELDS = ['team_id', 'opponent', 'game_date', 'location', 'notes', 'thumbnail_url', 'season_label', 'session_type'] as const
const GAME_PATCH_FIELDS  = ['opponent', 'game_date', 'location', 'notes', 'thumbnail_url', 'season_label', 'session_type'] as const
// team_id is immutable after creation for this release.
// video_url/video_id only set by upload completion routes.

type GameCreateBody = Partial<Record<typeof GAME_CREATE_FIELDS[number], unknown>>
type GamePatchBody  = Partial<Record<typeof GAME_PATCH_FIELDS[number], unknown>>

function pickFields<T extends readonly string[]>(
  raw: Record<string, unknown>,
  allowed: T
): Partial<Record<T[number], unknown>> {
  const out: Partial<Record<T[number], unknown>> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      (out as Record<string, unknown>)[key] = raw[key]
    }
  }
  return out
}

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)

    if(billingEnabled()){const {error:demoError}=await supabase.rpc('filmroom_provision_demo');if(demoError)throw demoError}
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('owner_id', user.id)
      .order('game_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const {data:counts,error:countsError}=await supabase.rpc('filmroom_clip_counts')
    if(countsError)return NextResponse.json({error:'Could not load clip counts.'},{status:500})
    const countMap=new Map((counts||[]).map((c:{game_id:string;clip_count:number;highlight_count:number})=>[c.game_id,c]))
    return NextResponse.json((data||[]).map((g:Record<string,unknown>)=>({...g,...(countMap.get(g.id) as object||{clip_count:0,highlight_count:0})})))
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getVerifiedUser(request)
    const raw = await request.json()
    const body = pickFields(raw, GAME_CREATE_FIELDS) as GameCreateBody

    if (!body.team_id || typeof body.team_id !== 'string') {
      return NextResponse.json({ error: 'team_id required' }, { status: 400 })
    }
    if (!body.opponent || typeof body.opponent !== 'string' || !body.opponent.trim()) {
      return NextResponse.json({ error: 'opponent required' }, { status: 400 })
    }
    if (!body.game_date) {
      return NextResponse.json({ error: 'game_date required' }, { status: 400 })
    }

    if (body.season_label !== undefined && (typeof body.season_label !== 'string' || body.season_label.length > 60)) return NextResponse.json({error:'Invalid season.'},{status:400})
    if (body.session_type !== undefined && !['game','practice','scouting'].includes(String(body.session_type))) return NextResponse.json({error:'Invalid session type.'},{status:400})
    // Verify team ownership using the RLS-scoped client (team must pass games_own WITH CHECK)
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('id, owner_id')
      .eq('id', body.team_id)
      .single()

    if (teamErr || !team || team.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: team not owned' }, { status: 403 })
    }

    await requirePaid(user.id)
    // Use service client for insert — owner_id set authoritatively
    const svc = createServiceClient()
    const { data, error } = await svc
      .from('games')
      .insert({
        team_id:      body.team_id,
        opponent:     (body.opponent as string).trim(),
        game_date:    body.game_date,
        location:     body.location ?? null,
        notes:        body.notes ?? null,
        season_label: typeof body.season_label === 'string' ? body.season_label.trim() : null,
        session_type: body.session_type || 'game',
        thumbnail_url: body.thumbnail_url ?? null,
        owner_id:     user.id,
        // video_url and video_id intentionally omitted — set only by upload completion
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('GAME_LIMIT_REACHED')) return NextResponse.json({error:'Your library has reached 50 games. Delete a game before adding another.',code:'GAME_LIMIT_REACHED'},{status:409})
      if (error.message.includes('SUBSCRIPTION_REQUIRED')) return NextResponse.json({error:'Subscribe to add games.',code:'SUBSCRIPTION_REQUIRED'},{status:402})
      return NextResponse.json({error:'Could not create game.'},{status:500})
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
