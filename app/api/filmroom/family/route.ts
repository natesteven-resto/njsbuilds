import {NextRequest,NextResponse} from 'next/server'
import {createServiceClient} from '@/lib/supabase'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TEAM_ID='00000000-0000-0000-0000-000000000010'

export async function GET(request:NextRequest){
  const supabase=createServiceClient()
  const game=request.nextUrl.searchParams.get('game_id')

  // Return stat entries for a specific game
  if(game){
    if(!uuid.test(game)) return NextResponse.json({error:'Invalid game.'},{status:400})
    const {data,error}=await supabase
      .from('stat_entries')
      .select('*, players(id,name,number)')
      .eq('game_id',game)
      .order('video_time_ms',{ascending:true})
    if(error) return NextResponse.json([])
    // Flatten player info
    const entries=(data||[]).map((e:Record<string,unknown>)=>{
      const p=e.players as {id:string;name:string;number:string}|null
      return {...e,player_name:p?.name||'Opponent',player_number:p?.number||'OPP'}
    })
    return NextResponse.json(entries,{headers:{'Cache-Control':'private, no-store'}})
  }

  // Return all games for the team
  const {data:games,error}=await supabase
    .from('games')
    .select('id,opponent,game_date,video_url,video_id,team_id')
    .eq('team_id',TEAM_ID)
    .order('game_date',{ascending:false})

  if(error) return NextResponse.json({games:[],invitations:[]})

  const shaped=(games||[]).map(g=>({
    id:g.id,
    opponent:g.opponent,
    game_date:g.game_date,
    team:'Varsity Boys',
    film:!!g.video_url,
    stats:true,
    has_video:!!g.video_url,
  }))

  return NextResponse.json({games:shaped,invitations:[]},{headers:{'Cache-Control':'private, no-store'}})
}

// Accept invite — no-op now, just return ok
export async function POST(){
  return NextResponse.json({ok:true})
}
