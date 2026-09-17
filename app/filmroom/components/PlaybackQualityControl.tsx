'use client'
import {useEffect,useState} from 'react'
import type {PlaybackQuality} from './usePrivatePlayback'
type Status={enabled:boolean;state:string;progress:number;canPrepare?:boolean;canReset?:boolean}
export function PlaybackQualityControl({gameId,sourceKey='',quality,onChange}:{gameId:string;sourceKey?:string;quality:PlaybackQuality;onChange:(q:PlaybackQuality)=>void}){
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  let active=true,timer:ReturnType<typeof setTimeout>
  setStatus(null);setError('')
  async function check(){try{const r=await fetch('/api/filmroom/playback?gameId='+gameId,{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();if(active){setStatus(d);timer=setTimeout(check,['submitting','processing'].includes(d.state)?15000:60000)}}catch{if(active)timer=setTimeout(check,30000)}}
  void check();return()=>{active=false;clearTimeout(timer)}
 },[gameId,sourceKey,busy])
 async function prepare(){setBusy(true);setError('');try{
  if(status?.canReset){const r=await fetch('/api/filmroom/playback?gameId='+gameId,{method:'DELETE'});if(!r.ok)throw Error('Could not reset Auto. Please try again.')}
  const r=await fetch('/api/filmroom/playback?gameId='+gameId,{method:'POST'}),d=await r.json()
  if(!r.ok)throw Error(d.error||'Could not prepare Auto.');setStatus(d)
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="flex flex-wrap items-center gap-2 text-xs">
  <label className="flex items-center gap-1 text-white/70">Quality <select aria-label="Playback quality" value={quality} onChange={e=>onChange(e.target.value as PlaybackQuality)} className="min-h-9 rounded-lg border border-white/15 bg-[#20211e] px-2 text-white" title="Original preserves your upload. Auto adapts to your connection, up to 1080p."><option value="original">Original</option>{status?.state==='ready'&&<option value="auto">Auto · up to 1080p</option>}</select></label>
  {status?.enabled&&(status.canPrepare||status.canReset)&&<button onClick={()=>void prepare()} disabled={busy} title="Create a separate optimized copy. Your original stays unchanged." className="min-h-9 rounded-lg border border-white/15 px-2 text-white/70 disabled:opacity-40">{busy?'Preparing…':status.canReset?'Retry Auto':'Prepare Auto'}</button>}
  {status&&['submitting','processing'].includes(status.state)&&<span role="status" className="text-white/60">Preparing Auto{status.progress>0?` · ${status.progress}%`:'…'}</span>}
  {error&&<span role="alert" className="max-w-xs text-red-300">{error}</span>}
 </div>
}
