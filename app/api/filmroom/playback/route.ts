import {NextRequest,NextResponse} from 'next/server'
import {after} from 'next/server'
import {S3Client,GetObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3'
import {getSignedUrl} from '@aws-sdk/s3-request-presigner'
import {getVerifiedUser,createServiceClient} from '@/lib/filmroom-supabase-server'
import {streamEnabled,streamRequest,refreshPlayback,cleanDetachedPlaybacks,StreamError,type PlaybackAsset,type StreamVideo} from '@/lib/filmroom-stream'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
export const maxDuration=60
async function access(request:NextRequest,write=false){
 const {user,supabase}=await getVerifiedUser(request)
 const gameId=new URL(request.url).searchParams.get('gameId')
 if(!gameId||!/^[0-9a-f-]{36}$/i.test(gameId))throw json({error:'Game required.'},400)
 const db=createServiceClient()
 const {data:game,error}=await db.from('games').select('id,owner_id,video_url').eq('id',gameId).single()
 if(error||!game)throw json({error:'Game not found.'},404)
 const owner=game.owner_id===user.id
 if(!owner){const {data,error}=await supabase.rpc('filmroom_parent_access',{p_game:gameId,p_kind:'film'});if(write||error||data!==true)throw json({error:'Forbidden'},403)}
 return {game,db,owner}
}
async function asset(db:ReturnType<typeof createServiceClient>,game:{id:string;video_url:string}){
 const {data,error}=await db.from('filmroom_playback_assets').select('*').eq('game_id',game.id).eq('source_url',game.video_url).neq('state','cleanup').maybeSingle()
 if(error)throw new StreamError(503)
 return data as PlaybackAsset|null
}
const publicStatus=(a:PlaybackAsset|null,owner:boolean)=>({enabled:true,state:a?.state||'none',progress:a?.progress||0,canPrepare:owner&&!a,canReset:owner&&a?.state==='failed'})
function failure(e:unknown){if(e instanceof NextResponse)return e;return json({error:'Auto playback is unavailable right now. You can keep watching Original.'},e instanceof StreamError?Math.max(400,e.status):503)}
export async function GET(request:NextRequest){
 try{const {game,db,owner}=await access(request);if(!streamEnabled())return json({enabled:false,state:'disabled'});let a=await asset(db,game);if(a)a=await refreshPlayback(a);return json(publicStatus(a,owner))}catch(e){return failure(e)}
}
export async function POST(request:NextRequest){
 try{
  const {game,db,owner}=await access(request,true)
  if(!streamEnabled())throw new StreamError(503)
  if(!game.video_url)throw json({error:'Upload a video first.'},409)
  const existing=await asset(db,game)
  if(existing)return json(publicStatus(await refreshPlayback(existing),owner))
  // Only signed URLs from this Film Room bucket; never accept a caller-supplied URL.
  const endpoint=process.env.CLOUDFLARE_R2_ENDPOINT!,bucket=process.env.CLOUDFLARE_R2_BUCKET!
  const bases=[`${endpoint}/${bucket}`,process.env.CLOUDFLARE_R2_CDN_URL].filter(Boolean).map(s=>s!.replace(/\/$/,'')+'/')
  const base=bases.find(b=>game.video_url.startsWith(b))
  if(!base)throw json({error:'This original is not supported for Auto playback.'},400)
  const key=game.video_url.slice(base.length)
  if(!key.startsWith(`games/${game.id}/`))throw json({error:'This original is not supported for Auto playback.'},400)
  const s3=new S3Client({region:'auto',endpoint,credentials:{accessKeyId:process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,secretAccessKey:process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'})
  const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}))
  if(!head.ContentLength||head.ContentLength>30_000_000_000)throw json({error:'Auto supports originals up to 30 GB. Your original is still available.'},400)
  const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:86400})
  const {data,error}=await db.rpc('filmroom_claim_playback',{p_game:game.id,p_owner:game.owner_id,p_source:game.video_url})
  if(error)throw new StreamError(409)
  const claimed=data?.[0] as PlaybackAsset|undefined
  if(!claimed)return json(publicStatus(await asset(db,game),owner))
  try{
   const video=await streamRequest<StreamVideo>('/copy','POST',{url,creator:claimed.id,requireSignedURLs:true,meta:{app:'filmroom',job:claimed.id,name:'Film Room optimized copy'}})
   if(!video.uid||!/^[a-f0-9]{32}$/.test(video.uid))throw new StreamError(502)
   const {error:saveError}=await db.from('filmroom_playback_assets').update({stream_id:video.uid,state:'processing',checked_at:new Date().toISOString()}).eq('id',claimed.id)
   if(saveError)throw new StreamError(503)
  }catch(e){
   // Only definitive rejection is retryable; timeouts/5xx may already have created a copy.
   if(e instanceof StreamError&&[400,401,403,413,429].includes(e.status))await db.from('filmroom_playback_assets').update({state:'failed'}).eq('id',claimed.id).eq('state','submitting')
   throw e
  }
  after(cleanDetachedPlaybacks)
  return json(publicStatus(await asset(db,game),owner),202)
 }catch(e){return failure(e)}
}
export async function DELETE(request:NextRequest){
 try{
  const {game,db}=await access(request,true);const a=await asset(db,game)
  if(!a||a.state!=='failed')throw json({error:'Only failed copies can be reset.'},409)
  // Known failed provider copies must be removed before a fresh claim is allowed.
  if(a.stream_id){try{await streamRequest('/'+a.stream_id,'DELETE')}catch(e){if(!(e instanceof StreamError&&e.status===404))throw e}}
  const {error}=await db.from('filmroom_playback_assets').delete().eq('id',a.id).eq('state','failed')
  if(error)throw new StreamError(503)
  return json({ok:true})
 }catch(e){return failure(e)}
}
