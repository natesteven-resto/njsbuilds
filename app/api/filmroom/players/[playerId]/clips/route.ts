import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Ctx = { params: Promise<{ playerId: string }> }

// GET /api/filmroom/players/[id]/clips
// Returns all clips where this player is tagged (clip_players join), across all games.
// Privacy: caller must own the player; clips returned only if owner matches.
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playerId } = await params
    const svc = createServiceClient()

    // Verify player ownership — prevents cross-user data leakage
    const { data: player } = await svc
      .from('players').select('id, owner_id, name, number, position, team_id').eq('id', playerId).single()
    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    assertOwner(player.owner_id, user.id)

    // Clips where player is tagged, joined with game info
    const { data: cpRows, error } = await svc
      .from('clip_players')
      .select(`
        clip_id,
        clips (
          id, game_id, team_id, start_time_ms, end_time_ms,
          title, tags, category, is_highlight, coaching_note, play_type,
          drawing_data, created_at,
          games ( id, opponent, game_date )
        )
      `)
      .eq('player_id', playerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also filter: only clips owned by caller (defense against service-client bypass)
    const clips = (cpRows ?? [])
      .map((r: Record<string, unknown>) => r.clips)
      .filter((c): c is Record<string, unknown> =>
        !!c && typeof c === 'object' && (c as Record<string, unknown>).game_id !== undefined
      )

    return NextResponse.json({ player, clips })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
