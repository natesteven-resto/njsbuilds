'use client'
import {useEffect,useRef,useState,type RefObject} from 'react'
import Hls from 'hls.js'
export type PlaybackQuality='original'|'auto'
/** The same native video element stays mounted for drawing, stats, seeking and fullscreen. */
export function usePrivatePlayback(video:RefObject<HTMLVideoElement|null>,gameId:string|undefined,quality:PlaybackQuality,onFallback:()=>void,sourceKey='',enabled=true){
 const [error,setError]=useState(''),[loading,setLoading]=useState(false)
 const fallback=useRef(onFallback);fallback.current=onFallback
 const saved=useRef({key:'',time:0,playing:false,rate:1,hasPosition:false})
 useEffect(()=>{
  const v=video.current
  if(!v||!gameId||!enabled)return
  const key=gameId+sourceKey
  if(saved.current.key!==key)saved.current={key,time:0,playing:false,rate:v.playbackRate||1,hasPosition:false}
  let cancelled=false,hls:Hls|null=null,timer:ReturnType<typeof setTimeout>|undefined,restore:(()=>void)|undefined
  const controller=new AbortController()
  let attached=false,version='',mediaType='',busy=false,recoverPending=false,denied=false,lastRecovery=0,swapping=false
  function capture(){if(v&&!swapping&&v.readyState>0)saved.current={key,time:v.currentTime,playing:!v.paused,rate:v.playbackRate,hasPosition:true}}
  function clear(){hls?.destroy();hls=null;if(restore)v?.removeEventListener('loadedmetadata',restore)}
  function fatal(){if(cancelled)return;if(quality==='auto'){capture();fallback.current()}else setError('Playback failed. Try reloading the game.')}
  function recover(){if(cancelled||denied)return;if(Date.now()-lastRecovery<5000){fatal();return}lastRecovery=Date.now();void load(true)}
  const mediaError=()=>{if(!hls)recover()}
  v.addEventListener('error',mediaError)
  async function load(force=false){
   if(cancelled||denied)return
   if(busy){recoverPending=recoverPending||force;return}
   busy=true;clearTimeout(timer);let delay=5000
   try{
    const r=await fetch(`/api/filmroom/video-token?gameId=${encodeURIComponent(gameId!)}&quality=${quality}`,{cache:'no-store',signal:controller.signal})
    const d=await r.json()
    if(cancelled)return
    if(!r.ok){
     if(r.status===401||r.status===403||r.status===404){denied=true;clear();v!.pause();v!.removeAttribute('src');v!.load();setError('Video access is no longer available.');setLoading(false);return}
     throw Error('Video could not be loaded.')
    }
    delay=(d.refreshAfterSeconds||40)*1000
    // Authorization renewal must not replace a healthy media source. Existing
    // requests keep playing; expired range/manifest requests recover on error.
    const nextVersion=d.sourceVersion||gameId!
    if(attached&&!force&&!v!.error&&version===nextVersion&&mediaType===d.type){setError('');return}
    capture();swapping=true;clear();attached=true;version=nextVersion;mediaType=d.type
    restore=()=>{
     if(cancelled)return
     if(saved.current.hasPosition)v!.currentTime=Math.min(saved.current.time,Number.isFinite(v!.duration)?Math.max(0,v!.duration-0.01):saved.current.time)
     v!.playbackRate=saved.current.rate
     if(saved.current.playing)void v!.play().catch(()=>{})
     swapping=false;setLoading(false)
    }
    v!.addEventListener('loadedmetadata',restore,{once:true})
    if(d.type==='hls'&&Hls.isSupported()){
     hls=new Hls({startPosition:saved.current.time,maxBufferLength:20,maxMaxBufferLength:30})
     hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)recover()})
     hls.loadSource(d.src);hls.attachMedia(v!)
    }else if(d.type!=='hls'||v!.canPlayType('application/vnd.apple.mpegurl')){v!.src=d.src;v!.load()}
    else{fatal();return}
    setError('')

   }catch{
    if(cancelled)return
    if(quality==='auto'){fallback.current();return}
    setLoading(false);setError('Could not refresh playback. Retrying…')
   }finally{busy=false;if(!cancelled&&!denied){if(recoverPending){recoverPending=false;void load(true)}else timer=setTimeout(()=>void load(),delay)}}
  }
  const positionEvents=['timeupdate','pause','ratechange','seeking'] as const
  positionEvents.forEach(event=>v.addEventListener(event,capture))
  setError('');setLoading(true);void load()
  return()=>{capture();cancelled=true;controller.abort();clearTimeout(timer);v.removeEventListener('error',mediaError);positionEvents.forEach(event=>v.removeEventListener(event,capture));clear();v.pause();v.removeAttribute('src');v.load()}
 },[video,gameId,quality,sourceKey,enabled])
 return {error,loading}
}
