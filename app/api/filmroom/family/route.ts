import {NextRequest,NextResponse} from 'next/server'
import {getVerifiedUser} from '@/lib/filmroom-supabase-server'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest){
 try{
  const {user,supabase}=await getVerifiedUser(request); const game=request.nextUrl.searchParams.get('game_id'); const view=request.nextUrl.searchParams.get('view')
  if(game&&!uuid.test(game))return NextResponse.json({error:'Invalid game.'},{status:400})
  const {data,error}=game?await supabase.rpc(view==='clips'?'filmroom_parent_clips':view==='box-score'?'filmroom_parent_box_score':'filmroom_parent_stats',{p_game:game}):await supabase.rpc('filmroom_parent_library')
  if(error)return NextResponse.json({error:game?'This content is not shared with this account.':'Could not load shared games.'},{status:game?403:500})
  return NextResponse.json(game?data:{...data,email:user.email},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return e instanceof NextResponse?e:NextResponse.json({error:'Could not load shared games.'},{status:500})}
}
export async function POST(request:NextRequest){
 try{
  const {supabase}=await getVerifiedUser(request);const b=await request.json()
  if(typeof b.id!=='string'||!uuid.test(b.id))return NextResponse.json({error:'Invalid invitation.'},{status:400})
  const {error}=await supabase.rpc('filmroom_accept_parent_invite',{p_invite:b.id})
  if(error)return NextResponse.json({error:'Invitation unavailable. Sign in with the email your coach invited.'},{status:403})
  return NextResponse.json({ok:true})
 }catch(e){return e instanceof NextResponse?e:NextResponse.json({error:'Could not accept invitation.'},{status:500})}
}
// PATCH request_connection: viewer self-claim. Records a pending request ONLY; never
// links a player or grants stats. Uses the authenticated definer RPC which validates
// that the invite is accepted by the current verified email.
export async function PATCH(request:NextRequest){
 try{
  const {supabase}=await getVerifiedUser(request);const b=await request.json()
  if(b?.action!=='request_connection')return NextResponse.json({error:'Unknown action.'},{status:400})
  if(typeof b.id!=='string'||!uuid.test(b.id))return NextResponse.json({error:'Invalid invitation.'},{status:400})
  if(typeof b.requested_player_name!=='string'||b.requested_player_name.trim().length===0||b.requested_player_name.length>120)
   return NextResponse.json({error:'A player name is required.'},{status:400})
  if(b.relationship!=null&&(typeof b.relationship!=='string'||b.relationship.length>40))
   return NextResponse.json({error:'Invalid relationship.'},{status:400})
  const {error}=await supabase.rpc('filmroom_request_connection',{p_invite:b.id,p_name:b.requested_player_name,p_relationship:b.relationship??null})
  if(error)return NextResponse.json({error:'Could not submit your connection request.'},{status:403})
  return NextResponse.json({ok:true})
 }catch(e){return e instanceof NextResponse?e:NextResponse.json({error:'Could not submit your connection request.'},{status:500})}
}
