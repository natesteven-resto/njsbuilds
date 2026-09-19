'use client'

import {useEffect, useRef, useState} from 'react'
import {usePrivatePlayback, type PlaybackQuality} from '../components/usePrivatePlayback'
import {PlaybackQualityControl} from '../components/PlaybackQualityControl'
import {STAT_NAMES, type FilmStat} from '@/lib/filmroom-events'

export type SharedGame = {id:string; opponent:string; game_date:string; team:string; film:boolean; stats:boolean; has_video:boolean}
type SharedClip = {id:string; title:string|null; category:string|null; start_time_ms:number; end_time_ms:number}
type Tab = 'clips'|'stats'|'shots'
const button = 'min-h-11 rounded-lg border border-white/15 px-3 text-sm hover:bg-white/10 disabled:opacity-40'
const clock = (ms:number) => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`

export function ParentGameView({game, onBack}:{game:SharedGame; onBack:()=>void}) {
 const video=useRef<HTMLVideoElement>(null), workspace=useRef<HTMLDivElement>(null)
 const [quality,setQuality]=useState<PlaybackQuality>('original')
 const [tab,setTab]=useState<Tab>(game.film?'clips':'stats')
 const [clips,setClips]=useState<SharedClip[]>([]), [entries,setEntries]=useState<FilmStat[]>([])
 const [activeClip,setActiveClip]=useState<SharedClip|null>(null)
 const [clipError,setClipError]=useState(''), [statsError,setStatsError]=useState(''), [controlError,setControlError]=useState('')
 const [loading,setLoading]=useState(true), [player,setPlayer]=useState('all'), [speed,setSpeed]=useState(1)
 const {error:videoError,loading:videoLoading}=usePrivatePlayback(video,game.id,quality,()=>setQuality('original'),'',game.film&&game.has_video)
 const canPlay=game.film&&game.has_video
 useEffect(()=>{
  if(!game.film){setClips([]);setActiveClip(null);setTab('stats')}
  if(!game.stats){setEntries([]);setTab('clips')}
  let cancelled=false
  async function refresh(){
   await Promise.all([
    game.film && fetch('/api/filmroom/family?view=clips&game_id='+game.id,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Shared clips are unavailable.');return r.json()}).then((data:SharedClip[])=>{if(cancelled)return;setClips(data);setClipError('');setActiveClip(old=>{const current=old?data.find(c=>c.id===old.id):null;if(old&&!current)video.current?.pause();return current||null})}).catch(e=>{if(!cancelled){setClips([]);setActiveClip(null);video.current?.pause();setClipError(e.message)}}),
    game.stats && fetch('/api/filmroom/family?game_id='+game.id,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Shared stats are unavailable.');return r.json()}).then(data=>{if(!cancelled){setEntries(data);setStatsError('')}}).catch(e=>{if(!cancelled){setEntries([]);setStatsError(e.message)}})
   ]);if(!cancelled)setLoading(false)
  }
  void refresh();const timer=setInterval(()=>void refresh(),40000)
  return()=>{cancelled=true;clearInterval(timer)}
 },[game.id,game.film,game.stats])
 useEffect(()=>{if(video.current)video.current.playbackRate=speed},[speed])
 function playAt(ms:number,clip:SharedClip|null=null){
  const v=video.current;if(!v)return
  setActiveClip(clip);setControlError('');v.currentTime=Math.max(0,ms/1000)
  void v.play().catch(()=>setControlError('Press play on the video to continue.'))
 }
 function enforceClip(){const v=video.current;if(v&&activeClip&&v.currentTime>=activeClip.end_time_ms/1000){if(!v.paused)v.pause();if(v.currentTime>activeClip.end_time_ms/1000)v.currentTime=activeClip.end_time_ms/1000}}
 function resumeClip(){const v=video.current;if(v&&activeClip&&(v.currentTime<activeClip.start_time_ms/1000||v.currentTime>=activeClip.end_time_ms/1000))v.currentTime=activeClip.start_time_ms/1000}
 const playerIds=Array.from(new Set(entries.filter(e=>e.player_id).map(e=>e.player_id)))
 const filtered=entries.filter(e=>player==='all'||e.player_id===player)
 const players=playerIds.filter(id=>player==='all'||id===player).map(id=>{
  const own=entries.filter(e=>e.player_id===id),count=(t:string)=>own.filter(e=>e.stat_type===t).length
  return {id,name:own[0].player_name,number:own[0].player_number,values:[['PTS',2*count('2M')+3*count('3M')+count('FTM')+count('PTS')],['REB',count('OREB')+count('DREB')+count('REB')],['AST',count('AST')],['STL',count('STL')],['BLK',count('BLK')],['TO',count('TO')]]}
 })
 const shots=filtered.filter(e=>['2M','2X','3M','3X','FTM','FTX'].includes(e.stat_type)&&typeof e.shot_x==='number'&&typeof e.shot_y==='number')
 function moment(e:FilmStat){return <button key={e.id} disabled={!canPlay} onClick={()=>playAt(e.video_time_ms-5000)} className={button+' w-full py-2 text-left'}>{clock(e.video_time_ms)} · {e.player_name} · {STAT_NAMES[e.stat_type]||e.stat_type}</button>}
 return <section aria-label="Shared game workspace" className="space-y-4">
  <div className="flex flex-wrap items-center gap-4"><button onClick={onBack} className={button}>← All games</button><div><p className="text-xs text-[#e49269]">{game.team} · {game.game_date}</p><h1 className="text-2xl font-semibold">{game.opponent}</h1></div><span className="ml-auto text-xs text-[#c9c3b8]">Parent view · Read only</span></div>
  <div ref={workspace} className="grid min-h-0 gap-4 bg-[#181917] lg:grid-cols-[minmax(0,1fr)_360px] [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-4">
   <div className="min-w-0 space-y-3">
    {canPlay?<><video ref={video} controls playsInline preload="metadata" onTimeUpdate={enforceClip} onPlay={resumeClip} onLoadedMetadata={()=>{if(video.current)video.current.playbackRate=speed}} className="aspect-video max-h-[78vh] w-full rounded-lg bg-black"/>
     <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#13161a] p-3">
      <button className={button} onClick={()=>{if(video.current)video.current.currentTime=Math.max(activeClip?activeClip.start_time_ms/1000:0,video.current.currentTime-5)}}>−5s</button>
      <label className="flex min-h-11 items-center gap-2 px-2 text-sm">Speed<select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="rounded bg-[#252622] p-2">{[.5,.75,1,1.25,1.5,2].map(s=><option key={s} value={s}>{s}×</option>)}</select></label>
      <button className={button} onClick={()=>{if(document.fullscreenElement){void document.exitFullscreen()}else if(workspace.current?.requestFullscreen){void workspace.current.requestFullscreen().catch(()=>setControlError('Fullscreen is unavailable in this browser. Use the video fullscreen control.'))}else setControlError('Use the video fullscreen control on this device.')}}>Fullscreen</button>
      <PlaybackQualityControl gameId={game.id} quality={quality} onChange={setQuality}/>
     </div>{activeClip?<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c66a3e]/40 p-3 text-sm"><span>Clip: <strong>{activeClip.title||'Untitled clip'}</strong> · Stops at {clock(activeClip.end_time_ms)}</span><button className={button} onClick={()=>{setActiveClip(null);void video.current?.play().catch(()=>{})}}>Continue full game</button></div>:<p className="text-xs text-[#c9c3b8]">Watching full game. Choose a shared clip in Clips to watch a teaching moment.</p>}
     {videoLoading&&<p role="status">Loading video…</p>}{videoError&&<p role="alert" className="text-red-300">{videoError}</p>}{controlError&&<p role="status">{controlError}</p>}
    </>:<div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 p-6 text-center text-[#c9c3b8]">{game.film?'Your coach has not attached a video yet.':'Your coach has shared stats for this game. Video access has not been shared.'}</div>}
   </div>
   <aside className="min-w-0 rounded-lg border border-white/10 bg-[#1e201d]">
    <div role="tablist" aria-label="Game details" className="flex border-b border-white/10">{(['clips','stats','shots'] as Tab[]).filter(t=>t==='clips'?game.film:game.stats).map(t=><button key={t} id={'parent-tab-'+t} role="tab" aria-selected={tab===t} aria-controls="parent-panel" onClick={()=>setTab(t)} className={'min-h-12 flex-1 border-b-2 text-sm font-semibold '+(tab===t?'border-[#c66a3e] text-[#eee9df]':'border-transparent text-[#aaa99f]')}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
    <div id="parent-panel" role="tabpanel" aria-labelledby={'parent-tab-'+tab} className="max-h-[80vh] space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-color:#55574f_#1e201d] [scrollbar-width:thin]">
     {loading&&<p role="status">Loading shared game details…</p>}
     {tab==='clips'&&<><p className="text-xs text-[#c9c3b8]">{clips.length} shared {clips.length===1?'clip':'clips'} · Selected by your coach</p>{clipError&&<p role="alert" className="text-red-300">{clipError}</p>}{!loading&&!clips.length&&!clipError&&<p className="py-6 text-sm text-[#c9c3b8]">No clips shared yet. Your coach can share selected clips from the clip editor.</p>}{clips.map(c=><button key={c.id} disabled={!canPlay} onClick={()=>playAt(c.start_time_ms,c)} aria-pressed={activeClip?.id===c.id} className={'w-full rounded-xl border p-4 text-left disabled:opacity-50 '+(activeClip?.id===c.id?'border-[#c66a3e] bg-[#c66a3e]/10':'border-white/10 bg-[#252722] hover:border-white/30')}><span className="block font-semibold">▶ {c.title||'Untitled clip'}</span><span className="mt-2 block text-xs text-[#c9c3b8]">{clock(c.start_time_ms)} – {clock(c.end_time_ms)}{c.category?' · '+c.category:''}</span></button>)}</>}
     {tab!=='clips'&&<><label className="block text-xs text-[#c9c3b8]">Player<select value={player} onChange={e=>setPlayer(e.target.value)} className="mt-2 min-h-11 w-full rounded border border-white/15 bg-[#252722] px-3 text-sm"><option value="all">All players</option>{playerIds.map(id=>{const p=entries.find(e=>e.player_id===id)!;return <option key={id} value={id}>#{p.player_number} {p.player_name}</option>})}</select></label>{statsError&&<p role="alert" className="text-red-300">{statsError}</p>}</>}
     {tab==='stats'&&<><p className="text-xs text-[#c9c3b8]">Based on your coach’s recorded events.</p>{!loading&&!players.length&&!statsError&&<p>No player stats recorded yet.</p>}{players.map(p=><article key={p.id} className="rounded-lg border border-white/10 p-3"><h2 className="font-semibold">#{p.number} {p.name}</h2><dl className="mt-3 grid grid-cols-3 gap-3">{p.values.map(([label,value])=><div key={label}><dt className="text-[11px] text-[#c9c3b8]">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}</dl></article>)}{!!filtered.length&&<details><summary className="min-h-11 cursor-pointer">{canPlay?'Watch stat moments':'Recorded events'}</summary><div className="space-y-2">{filtered.map(moment)}</div></details>}</>}
     {tab==='shots'&&<><p className="text-xs text-[#c9c3b8]">● Made · × Missed{canPlay?' · Select a shot to watch':''}</p><svg viewBox="0 0 50 47" role="img" aria-label="Shared shot chart" className="w-full rounded bg-[#181a17]"><g fill="none" stroke="#62665c" strokeWidth=".4"><rect x="1" y="1" width="48" height="45"/><rect x="16" y="1" width="18" height="19"/><circle cx="25" cy="20" r="6"/><path d="M4 1 Q4 35 25 38 Q46 35 46 1"/><circle cx="25" cy="5" r="1.2"/></g>{shots.map(e=><g key={e.id} transform={`translate(${1+e.shot_x!*48},${1+e.shot_y!*45})`} role={canPlay?'button':undefined} tabIndex={canPlay?0:undefined} aria-label={`${e.player_name}: ${STAT_NAMES[e.stat_type]} at ${clock(e.video_time_ms)}`} onClick={()=>canPlay&&playAt(e.video_time_ms-5000)} onKeyDown={event=>{if(canPlay&&['Enter',' '].includes(event.key)){event.preventDefault();playAt(e.video_time_ms-5000)}}} className={canPlay?'cursor-pointer':''}>{e.stat_type.endsWith('M')?<circle r="1.1" fill="#e49269"/>:<path d="M-1 -1 L1 1 M1 -1 L-1 1" stroke="#e6e1d6" strokeWidth=".55"/>}</g>)}</svg>{!loading&&!shots.length&&<p className="text-sm text-[#c9c3b8]">No shot locations recorded yet.</p>}<div className="space-y-2">{shots.map(moment)}</div></>}
    </div>
   </aside>
  </div>
 </section>
}
