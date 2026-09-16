import {NextRequest,NextResponse} from 'next/server'
import {getVerifiedUser} from '@/lib/filmroom-supabase-server'
export async function GET(request:NextRequest){
 try{
  const {user,supabase}=await getVerifiedUser(request);const p=request.nextUrl.searchParams
  const page=Math.max(0,Math.min(10000,Number(p.get('page'))||0));const q=(p.get('q')||'').trim().slice(0,120);const tag=(p.get('tag')||'').trim().slice(0,100);const player=p.get('player')||''
  let query=supabase.from('clips').select('id,game_id,title,tags,category,is_highlight,coaching_note,start_time_ms,end_time_ms, games(opponent), clip_players(player_id, players(id,name))',{count:'exact'}).eq('owner_id',user.id)
  if(q){const safe=q.replace(/[,%().*\\]/g,' ').trim();if(safe)query=query.or(`title.ilike.%${safe}%,coaching_note.ilike.%${safe}%`)}
  if(tag)query=query.contains('tags',[tag])
  if(player){
   const {data:owned,error:pe}=await supabase.from('players').select('id').eq('id',player).eq('owner_id',user.id).maybeSingle();if(pe||!owned)return NextResponse.json({error:'Player unavailable.'},{status:404})
   const {data:links,error:le}=await supabase.from('clip_players').select('clip_id').eq('player_id',player)
   if(le)throw le
   if(!links?.length)return NextResponse.json({clips:[],total:0})
   query=query.in('id',links.map((l:{clip_id:string})=>l.clip_id))
  }
  const {data,error,count}=await query.order('created_at',{ascending:false}).range(page*30,page*30+29)
  if(error)throw error
  return NextResponse.json({clips:data||[],total:count||0})
 }catch(e){if(e instanceof NextResponse)return e;return NextResponse.json({error:'Could not search clips.'},{status:500})}
}
