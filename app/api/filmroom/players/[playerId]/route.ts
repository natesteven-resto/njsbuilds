import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient, assertOwner } from '@/lib/filmroom-supabase-server'

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

export async function PATCH(request: NextRequest, {params}: Params){
  try{
    const {user}=await getVerifiedUser(request);const {playerId}=await params;const b=await request.json()
    if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||typeof b.position!=='string'||b.position.length>30||!(b.number===null || (Number.isInteger(b.number)&&b.number>=0&&b.number<=999)))return NextResponse.json({error:'Enter a name, valid jersey number (0–999), and position.'},{status:400})
    const {data,error}=await createServiceClient().from('players').update({name:b.name.trim(),number:b.number,position:b.position.trim()||null}).eq('id',playerId).eq('owner_id',user.id).select().maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Player unavailable.'},{status:404})
    return NextResponse.json(data)
  }catch(e){if(e instanceof NextResponse)return e;return NextResponse.json({error:'Could not update player.'},{status:500})}
}
