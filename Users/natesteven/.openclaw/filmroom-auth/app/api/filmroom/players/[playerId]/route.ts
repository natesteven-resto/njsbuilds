import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/supabase-server'

type Params = { params: Promise<{ playerId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { playerId } = await params
    const supabase = createServiceClient()

    const { data: player } = await supabase
      .from('players').select('owner_id').eq('id', playerId).single()
    assertOwner(player?.owner_id ?? null, user.id)

    const { error } = await supabase
      .from('players').delete().eq('id', playerId).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
