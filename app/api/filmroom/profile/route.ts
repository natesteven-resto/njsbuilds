import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser, createServiceClient } from '@/lib/filmroom-supabase-server'
import { shortText } from '@/lib/filmroom-workspace-validation'
export async function GET(request: NextRequest) {
  try {
    const {user, supabase} = await getVerifiedUser(request)
    const {data:coach,error} = await supabase.from('coaches').select('name').eq('auth_user_id',user.id).maybeSingle()
    if(error) throw error
    const {data:games,error:ge} = await supabase.from('games').select('id,video_url').eq('owner_id',user.id)
    if(ge) throw ge
    return NextResponse.json({name:coach?.name || '',email:user.email,game_count:games?.length || 0,video_count:games?.filter((g:{video_url:string|null})=>g.video_url).length || 0})
  }catch(e){if(e instanceof NextResponse)return e;return NextResponse.json({error:'Could not load profile.'},{status:500})}
}
export async function PATCH(request:NextRequest){
  try{
    const {user}=await getVerifiedUser(request)
    let name:string
    try{name=shortText((await request.json()).name,100,true)}catch{return NextResponse.json({error:'Name must be 1–100 characters.'},{status:400})}
    const {data,error}=await createServiceClient().from('coaches').update({name}).eq('auth_user_id',user.id).select('name').single()
    if(error)throw error
    return NextResponse.json(data)
  }catch(e){if(e instanceof NextResponse)return e;return NextResponse.json({error:'Could not save profile.'},{status:500})}
}
