'use client'
import type { Clip } from '@/types/filmroom'
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`
export function EventTimeline({clips,stats,durationMs,currentMs,selectedId,onSeek,onClip}:{clips:Clip[];stats:{id:string;video_time_ms:number;stat_type:string;player_name:string}[];durationMs:number;currentMs:number;selectedId:string|null;onSeek:(ms:number)=>void;onClip:(clip:Clip)=>void}) {
  if(!durationMs || (!clips.length&&!stats.length))return null
  const percent=(ms:number)=>Math.max(0,Math.min(100,ms/durationMs*100))
  const events=[...clips.map(c=>({id:c.id,at:c.start_time_ms,label:c.title,clip:c})),...stats.map(s=>({id:s.id,at:s.video_time_ms,label:`${s.player_name} · ${s.stat_type}`,clip:null}))].sort((a,b)=>a.at-b.at)
  return <section aria-label="Film event timeline" className="mt-3 border border-white/10 rounded-md bg-[#20211e] p-3">
    <div className="flex justify-between text-xs text-white/65 mb-2"><span>Film timeline · {clips.length} clips · {stats.length} stats</span><span>{time(durationMs)}</span></div>
    <div className="relative h-16 bg-black/25 rounded">
      {clips.map(c=><button key={c.id} onClick={()=>onClip(c)} aria-label={`Timeline clip: ${c.title} at ${time(c.start_time_ms)}`} title={c.title} className="absolute top-1 h-6 min-w-2 rounded-sm border focus-visible:outline-2 focus-visible:outline-white" style={{left:`${percent(c.start_time_ms)}%`,width:`${Math.max(.5,percent(c.end_time_ms)-percent(c.start_time_ms))}%`,maxWidth:`${100-percent(c.start_time_ms)}%`,background:c.id===selectedId?'#e49b73':'#c66a3e',borderColor:c.id===selectedId?'#eee9df':'transparent'}}/>)}
      {stats.map(s=><button key={s.id} onClick={()=>onSeek(s.video_time_ms)} aria-label={`Timeline stat: ${s.player_name} ${s.stat_type} at ${time(s.video_time_ms)}`} title={`${s.player_name} · ${s.stat_type}`} className="absolute bottom-1 h-6 w-3 -translate-x-1/2 border-x-4 border-transparent bg-clip-padding bg-[#eee9df]/65 hover:bg-[#eee9df]" style={{left:`${Math.max(1,Math.min(99,percent(s.video_time_ms)))}%`}}/>)}
      <div aria-hidden className="absolute inset-y-0 w-px bg-white pointer-events-none" style={{left:`${percent(currentMs)}%`}}/>
    </div>
    <details className="mt-2 text-xs"><summary className="cursor-pointer py-2 text-white/65">Browse all timeline events</summary><div className="max-h-40 overflow-y-auto">{events.map(e=><button key={e.id} onClick={()=>e.clip?onClip(e.clip):onSeek(e.at)} className="flex w-full gap-3 py-3 px-2 text-left hover:bg-white/5"><span className="tabular-nums text-[#e79568]">{time(e.at)}</span><span>{e.label}</span></button>)}</div></details>
  </section>
}
