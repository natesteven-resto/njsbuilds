import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

type Params = { params: Promise<{ clipId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user } = await getVerifiedUser(request)
    const { clipId } = await params
    const supabase = createServiceClient()

    const { data: clip } = await supabase.from('clips').select('owner_id').eq('id', clipId).single()
    assertOwner(clip?.owner_id ?? null, user.id)

    const { error } = await supabase.from('clips').delete().eq('id', clipId).eq('owner_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NextResponse) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
