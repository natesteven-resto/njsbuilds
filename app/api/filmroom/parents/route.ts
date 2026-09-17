import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getVerifiedUser } from '@/lib/filmroom-supabase-server'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (error:string,status=400) => NextResponse.json({error},{status})
export async function GET(request:NextRequest) {
 try {
  const {user}=await getVerifiedUser(request)
  const {data,error}=await createServiceClient().from('filmroom_parent_invites').select('id,team_id,email,accepted_at,expires_at,filmroom_parent_shares(game_id,film,stats)').eq('owner_id',user.id).order('created_at',{ascending:false})
  if(error) return fail('Could not load parent access.',500)
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}})
 } catch(e) {return e instanceof NextResponse?e:fail('Could not load parent access.',500)}
}
export async function POST(request:NextRequest) {
 try {
  const {user}=await getVerifiedUser(request); const body=await request.json()
  if(typeof body.team_id!=='string'||!uuid.test(body.team_id)||typeof body.email!=='string')return fail('Team and email are required.')
  const email=body.email.trim().toLowerCase()
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email===user.email?.toLowerCase())return fail('Enter a parent’s email address.')
  const svc=createServiceClient(); const {data:team}=await svc.from('teams').select('id').eq('id',body.team_id).eq('owner_id',user.id).maybeSingle()
  if(!team)return fail('Team not found.',404)
  const {data,error}=await svc.from('filmroom_parent_invites').insert({team_id:team.id,owner_id:user.id,email}).select('id').single()
  if(error)return fail(error.code==='23505'?'This email already has an invitation. Revoke it first to invite again.':'Could not create invitation.',error.code==='23505'?409:500)
  return NextResponse.json(data,{status:201})
 } catch(e){return e instanceof NextResponse?e:fail('Could not create invitation.',500)}
}
export async function PATCH(request:NextRequest) {
 try {
  const {user}=await getVerifiedUser(request);const b=await request.json()
  if(typeof b.id!=='string'||!uuid.test(b.id)||typeof b.game_id!=='string'||!uuid.test(b.game_id)||typeof b.film!=='boolean'||typeof b.stats!=='boolean')return fail('Invalid sharing selection.')
  const svc=createServiceClient();const {data:i}=await svc.from('filmroom_parent_invites').select('id,team_id').eq('id',b.id).eq('owner_id',user.id).maybeSingle()
  if(!i)return fail('Invitation not found.',404)
  const {data:g}=await svc.from('games').select('id').eq('id',b.game_id).eq('team_id',i.team_id).eq('owner_id',user.id).eq('is_demo',false).maybeSingle()
  if(!g)return fail('Game not found or cannot be shared.',404)
  const {error}=b.film||b.stats?await svc.from('filmroom_parent_shares').upsert({invite_id:i.id,game_id:g.id,film:b.film,stats:b.stats}):await svc.from('filmroom_parent_shares').delete().eq('invite_id',i.id).eq('game_id',g.id)
  if(error)return fail('Could not save sharing.',500)
  return NextResponse.json({ok:true})
 }catch(e){return e instanceof NextResponse?e:fail('Could not save sharing.',500)}
}
export async function DELETE(request:NextRequest){
 try{
  const {user}=await getVerifiedUser(request);const id=request.nextUrl.searchParams.get('id')
  if(!id||!uuid.test(id))return fail('Invitation ID required.')
  const {error}=await createServiceClient().from('filmroom_parent_invites').delete().eq('id',id).eq('owner_id',user.id)
  if(error)return fail('Could not revoke access.',500)
  return NextResponse.json({ok:true})
 }catch(e){return e instanceof NextResponse?e:fail('Could not revoke access.',500)}
}
