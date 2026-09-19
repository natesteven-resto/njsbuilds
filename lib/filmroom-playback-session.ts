import {randomUUID} from 'node:crypto'
export function playbackGatewayConfigured(){return !!(process.env.FILMROOM_PLAYBACK_GATEWAY_URL&&process.env.FILMROOM_PLAYBACK_GATEWAY_SECRET)}
export async function renewPlaybackSession({viewer,game,key,session}:{viewer:string;game:string;key:string;session:string|null}){
 const base=process.env.FILMROOM_PLAYBACK_GATEWAY_URL?.replace(/\/$/,'');const secret=process.env.FILMROOM_PLAYBACK_GATEWAY_SECRET
 if(!base||!secret)throw Error('Playback gateway unavailable')
 const sessionId=session&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session)?session:randomUUID()
 const r=await fetch(base+'/session/'+sessionId,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({viewer,game,key}),cache:'no-store',signal:AbortSignal.timeout(8000)})
 if(!r.ok)throw Error('Playback session unavailable')
 return {src:base+'/video/'+sessionId,sessionId}
}
