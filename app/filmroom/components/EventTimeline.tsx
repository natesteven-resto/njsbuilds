 'use client'
import {useState} from 'react'
import type { Clip } from '@/types/filmroom'
import {eventStyle,statDescription,type FilmStat} from '@/lib/filmroom-events'
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`
export function EventTimeline({clips,stats,durationMs,currentMs,selectedId,onSeek,onClip,leadIn=5}:{clips:Clip[];stats:FilmStat[];durationMs:number;currentMs:number;selectedId:string|null;onSeek:(ms:number)=>void;onClip:(clip:Clip)=>void;leadIn?:number}) {
 const [focused,setFocused]=useState<string|null>(null)
 if(!durationMs)return null
 const percent=(ms:number)=>Math.max(0,Math.min(100,ms/durationMs*100))
 const events=[...clips.map(c=>({id:c.id,at:c.start_time_ms,label:`Clip · ${c.title}`,clip:c})),...stats.map(s=>({id:s.id,at:s.video_time_ms,label:statDescription(s),clip:null}))].sort((a,b)=>a.at-b.at)
 return <section aria-label="Film event timeline" className="mt-3 border border-white/10 rounded-md bg-[#20211e] p-3">
 <div className="flex flex-wrap justify-between gap-2 text-xs text-white/75 mb-2"><span>Film timeline · {clips.length} clip{clips.length===1?'':'s'} · {stats.length} stats</span><span>{time(durationMs)}</span></div>
 <p className="text-xs text-white/60 mb-3">Select an event to play from {leadIn} seconds before it. Use Events in the toolbar to filter.</p>
 <div className="relative h-20 bg-black/25 rounded">
 {clips.map(c=><button key={c.id} onClick={()=>{setFocused(`Clip · ${c.title} · ${time(c.start_time_ms)}`);onClip(c)}} aria-label={`Timeline clip: ${c.title} at ${time(c.start_time_ms)}`} title={`Clip · ${c.title} · ${time(c.start_time_ms)}`} className="absolute top-1 h-6 min-w-2 rounded-sm border focus-visible:outline-2 focus-visible:outline-white" style={{left:`${percent(c.start_time_ms)}%`,width:`${Math.max(.5,percent(c.end_time_ms)-percent(c.start_time_ms))}%`,maxWidth:`${100-percent(c.start_time_ms)}%`,background:c.id===selectedId?'#e49b73':'#c66a3e'}}/>)}
 {stats.map(s=>{const style=eventStyle(s.stat_type);const label=`${statDescription(s)} · ${time(s.video_time_ms)}`;return <button key={s.id} onFocus={()=>setFocused(label)} onMouseEnter={()=>setFocused(label)} onClick={()=>{setFocused(label);onSeek(s.video_time_ms)}} aria-label={`Timeline stat: ${label}`} title={label} className="absolute bottom-0 h-11 w-5 -translate-x-1/2 text-sm font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white" style={{left:`${Math.max(1,Math.min(99,percent(s.video_time_ms)))}%`,color:style.color}}>{style.symbol}</button>})}
 <div aria-hidden className="absolute inset-y-0 w-px bg-white pointer-events-none" style={{left:`${percent(currentMs)}%`}}/>
 </div>
 <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/65"><span>▰ Clips</span>{['2M','DREB','TO','AST'].map(t=>{const s=eventStyle(t);return <span key={t} style={{color:s.color}}>{s.symbol} {s.group}</span>})}</div>
 <p className="min-h-5 mt-2 text-xs text-white/85" aria-live="polite">{focused||(!events.length?'No events match these filters.':'Hover or select a marker to see the player and event.')}</p>
 <details className="mt-1 text-xs"><summary className="cursor-pointer py-2 text-white/75">Browse matching events</summary><div className="max-h-48 overflow-y-auto">{events.map(e=><button key={e.id} onClick={()=>{setFocused(`${e.label} · ${time(e.at)}`);e.clip?onClip(e.clip):onSeek(e.at)}} className="flex w-full gap-3 py-3 px-2 text-left hover:bg-white/5"><span className="tabular-nums text-[#e79568]">{time(e.at)}</span><span>{e.label}</span></button>)}</div></details>
 </section>
}
