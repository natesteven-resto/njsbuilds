import {createServiceClient} from './filmroom-supabase-server'

const token = () => (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN || '').trim()
export const streamEnabled = () => process.env.FILMROOM_STREAM_ENABLED === 'true' && !!token()
const account = () => process.env.CLOUDFLARE_ACCOUNT_ID || '108ae2b237d537d16e57f93a1a13444f'
const host = () => process.env.FILMROOM_STREAM_HOST || 'customer-gc6om70w6s4e1vdp.cloudflarestream.com'
export type StreamVideo = {uid:string;creator?:string;requireSignedURLs?:boolean;readyToStream?:boolean;status?:{state?:string;pctComplete?:string};meta?:{app?:string;job?:string}}
export type PlaybackAsset = {id:string;game_id:string|null;owner_id:string;source_url:string;stream_id:string|null;state:string;progress:number;created_at:string;checked_at:string}
export class StreamError extends Error {constructor(public status:number){super('Optimized playback is temporarily unavailable. Original is still available.')}}

export async function streamRequest<T>(path:string,method='GET',body?:unknown):Promise<T> {
 if(!streamEnabled())throw new StreamError(503)
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account()}/stream${path}`,{method,headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)})
 const data=await r.json().catch(()=>null)
 // Stream deletion may return an empty successful response.
 if(method==='DELETE'&&r.ok&&data===null)return undefined as T
 // Never expose provider errors: they can contain the signed source URL.
 if(!r.ok||!data?.success){console.warn('[filmroom-stream]',{status:r.status,codes:(data?.errors||[]).map((e:{code?:number})=>e.code).filter((n:unknown)=>typeof n==='number')});throw new StreamError(r.ok?502:r.status)}
 return data.result as T
}
function ownedVideo(v:StreamVideo,a:PlaybackAsset){return /^[a-f0-9]{32}$/.test(v.uid)&&v.creator===a.id&&v.meta?.app==='filmroom'&&v.meta?.job===a.id}
export async function refreshPlayback(a:PlaybackAsset):Promise<PlaybackAsset> {
 if(a.state==='ready'||a.state==='failed'||a.state==='cleanup'||Date.now()-Date.parse(a.checked_at)<15000)return a
 let v:StreamVideo|undefined
 if(a.stream_id){
  try{v=await streamRequest<StreamVideo>('/'+a.stream_id)}catch(e){if(e instanceof StreamError&&e.status===404){const db=createServiceClient();await db.from('filmroom_playback_assets').update({state:'failed',checked_at:new Date().toISOString()}).eq('id',a.id).neq('state','cleanup');return {...a,state:'failed'}}throw e}
 }else{
  const videos=await streamRequest<StreamVideo[]>('?creator='+encodeURIComponent(a.id))
  v=videos.find(v=>ownedVideo(v,a))
 }
 const update:Partial<PlaybackAsset>={checked_at:new Date().toISOString()}
 if(v){
  if(!ownedVideo(v,a))throw new StreamError(502)
  update.stream_id=v.uid
  update.state=v.status?.state==='error'?'failed':v.readyToStream&&v.requireSignedURLs===true?'ready':'processing'
  update.progress=Math.min(100,Math.max(0,Math.round(Number(v.status?.pctComplete)||0)))
 }
 const {data,error}=await createServiceClient().from('filmroom_playback_assets').update(update).eq('id',a.id).neq('state','cleanup').select().maybeSingle()
 if(error)throw new StreamError(503)
 return data||{...a,state:'cleanup'}
}
export async function streamToken(a:PlaybackAsset,ttl:number){
 if(a.state!=='ready'||!a.stream_id||!/^[a-f0-9]{32}$/.test(a.stream_id))throw new StreamError(409)
 // Recheck privacy at issuance; an accidental dashboard change must fail closed.
 const v=await streamRequest<StreamVideo>('/'+a.stream_id)
 if(!ownedVideo(v,a)||!v.readyToStream||v.requireSignedURLs!==true)throw new StreamError(503)
 const {token}=await streamRequest<{token:string}>('/'+a.stream_id+'/token','POST',{exp:Math.floor(Date.now()/1000)+ttl})
 if(!token||!/^[A-Za-z0-9_.-]+$/.test(token)||!/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host()))throw new StreamError(502)
 return `https://${host()}/${token}/manifest/video.m3u8`
}
/** Only rows detached by database triggers are eligible. Never delete an original. */
export async function cleanDetachedPlaybacks(){
 if(!streamEnabled())return
 const db=createServiceClient()
 const {data,error}=await db.from('filmroom_playback_assets').select('*').eq('state','cleanup').order('checked_at').limit(3)
 if(error)return
 for(const a of (data||[]) as PlaybackAsset[]){
  try{
   // Allow an in-flight submission to finish before reconciling an unknown result.
   if(Date.now()-Date.parse(a.created_at)<60000&&!a.stream_id)continue
   const videos=await streamRequest<StreamVideo[]>('?creator='+encodeURIComponent(a.id))
   for(const v of videos){if(!ownedVideo(v,a))throw new StreamError(502);try{await streamRequest('/'+v.uid,'DELETE')}catch(e){if(!(e instanceof StreamError&&e.status===404))throw e}}
   // Keep unknown submissions for reconciliation: absence alone is not proof of rejection.
   if(a.stream_id)await db.from('filmroom_playback_assets').delete().eq('id',a.id).eq('state','cleanup')
  }catch{ /* Keep the ledger for retry on the next library visit. */ }
 }
}
