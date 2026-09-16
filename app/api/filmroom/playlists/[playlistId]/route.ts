import { sessionPlan } from '@/lib/filmroom-workspace-validation'
import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Ctx = { params: Promise<{ playlistId: string }> }

// GET /api/filmroom/playlists/[id] — playlist + ordered clips (with game info)
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const svc = createServiceClient()

    const { data: pl, error: plErr } = await svc
      .from('playlists')
      .select('id, owner_id, name, created_at, session_plan')
      .eq('id', playlistId)
      .single()

    if (plErr || !pl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(pl.owner_id, user.id)

    const { data: pclips, error: pcErr } = await svc
      .from('playlist_clips')
      .select(`
        id, playlist_id, clip_id, position, created_at,
        clips (
          id, game_id, team_id, start_time_ms, end_time_ms,
          title, tags, category, is_highlight, drawing_data,
          coaching_note, play_type, primary_player_id, created_at,
          games ( id, opponent, game_date, video_url, video_id )
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true })

    if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 })

    // Supabase returns relation names as plural (clips, games).
    // Normalize to singular (clip, clip.game) for page consumption.
    const normalized = (pclips ?? []).map((pc: Record<string, unknown>) => {
      const clipRaw = (Array.isArray(pc.clips) ? pc.clips[0] : pc.clips) as Record<string, unknown> | null
      if (!clipRaw) return { ...pc, clips: undefined, clip: null }
      const gameRaw = (Array.isArray(clipRaw.games) ? clipRaw.games[0] : clipRaw.games) as Record<string, unknown> | null
      const clip = { ...clipRaw, games: undefined, game: gameRaw ?? null }
      return { ...pc, clips: undefined, clip }
    })

    return NextResponse.json({ ...pl, clips: normalized })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/filmroom/playlists/[id] — rename
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (body.name !== undefined && (!name || name.length > 120)) {
      return NextResponse.json({ error: 'name required (1–120 chars)' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Verify ownership before update
    const { data: existing } = await svc
      .from('playlists')
      .select('owner_id')
      .eq('id', playlistId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(existing.owner_id, user.id)

    const patch:Record<string,unknown>={}
    if(body.name!==undefined)patch.name=name
    if(body.session_plan!==undefined){
      try{patch.session_plan=sessionPlan(body.session_plan)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid session plan.'},{status:400})}
      const ids=(patch.session_plan as ReturnType<typeof sessionPlan>).sections.flatMap(s=>s.clip_ids)
      if(ids.length){
        const {data:links,error:le}=await svc.from('playlist_clips').select('clip_id').eq('playlist_id',playlistId)
        if(le)return NextResponse.json({error:'Could not validate section clips.'},{status:500})
        const owned=new Set((links||[]).map((l:{clip_id:string})=>l.clip_id))
        if(ids.some(id=>!owned.has(id)))return NextResponse.json({error:'Sections may contain only clips in this playlist.'},{status:400})
      }
    }
    if(!Object.keys(patch).length)return NextResponse.json({error:'No changes supplied.'},{status:400})
    const { data, error } = await svc
      .from('playlists')
      .update(patch)
      .eq('id', playlistId)
      .select('id, owner_id, name, created_at, session_plan')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/filmroom/playlists/[id] — delete (cascades to playlist_clips)
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playlistId } = await params
    const svc = createServiceClient()

    const { data: existing } = await svc
      .from('playlists')
      .select('owner_id')
      .eq('id', playlistId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(existing.owner_id, user.id)

    const { error } = await svc
      .from('playlists')
      .delete()
      .eq('id', playlistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
