import {NextRequest,NextResponse} from 'next/server'
import {getVerifiedUser} from '@/lib/filmroom-supabase-server'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest){
 try{
  const {supabase}=await getVerifiedUser(request); const game=request.nextUrl.searchParams.get('game_id')
  if(game&&!uuid.test(game))return NextResponse.json({error:'Invalid game.'},{status:400})
  const {data,error}=game?await supabase.rpc('filmroom_parent_stats',{p_game:game}):await supabase.rpc('filmroom_parent_library')
  if(error)return NextResponse.json({error:game?'Stats are not shared with this account.':'Could not load shared games.'},{status:game?403:500})
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}})
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
