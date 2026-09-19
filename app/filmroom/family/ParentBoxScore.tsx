'use client'
import {useState} from 'react'
import {boxScore,boxGroups,type BoxPlayer} from '@/lib/filmroom-box-score'
import {STAT_NAMES,type FilmStat} from '@/lib/filmroom-events'
export function ParentBoxScore({entries,players,playerId,canPlay,onSeek}:{entries:FilmStat[];players:BoxPlayer[];playerId:string;canPlay:boolean;onSeek:(ms:number)=>void}){
 const [group,setGroup]=useState<keyof typeof boxGroups>('Overview'),[expanded,setExpanded]=useState<string|null>(null)
 const own=entries.filter(e=>e.player_id&&e.player_id!=='__opp__'),opponent=entries.filter(e=>!e.player_id||e.player_id==='__opp__')
 const roster=[...players]
 for(const e of own)if(!roster.some(p=>p.id===e.player_id))roster.push({id:e.player_id,name:e.player_name,number:e.player_number??null})
 const rows=[...roster.filter(p=>playerId==='all'||p.id===playerId).map(p=>({id:p.id,label:`${p.number?'#'+p.number+' ':''}${p.name}`,entries:own.filter(e=>e.player_id===p.id)})),{id:'team',label:'TEAM',entries:own},...(opponent.length?[{id:'opponent',label:'OPPONENT',entries:opponent}]:[])]
 return <section aria-label="Box score" className="space-y-3">
  <h2 className="text-lg font-semibold">Box score</h2>
  <p className="text-xs text-[#c9c3b8]">Recorded by your coach. Select a player for all stats and their plays.</p>
  <div aria-label="Box score columns" className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1">{Object.keys(boxGroups).map(key=><button key={key} aria-pressed={group===key} onClick={()=>setGroup(key as keyof typeof boxGroups)} className={'min-h-11 rounded text-xs '+(group===key?'bg-[#c66a3e] font-semibold text-white':'text-[#c9c3b8] hover:bg-white/10')}>{key}</button>)}</div>
  {!entries.length&&<p className="text-sm text-[#c9c3b8]">No stats recorded yet. Totals will update when your coach tags plays.</p>}
  <div role="table" aria-label={`${group} box score`} className="text-xs">
   <div role="row" className="grid grid-cols-6 gap-1 border-b border-white/15 py-2 text-center text-[#c9c3b8]">{boxGroups[group].map(key=><span role="columnheader" key={key}>{key}</span>)}</div>
   {rows.map(row=>{const stats=boxScore(row.entries);return <div key={row.id} role="rowgroup" className={'border-b border-white/10 '+(row.id==='team'?'bg-[#c66a3e]/10':'')}>
    <button aria-expanded={expanded===row.id} aria-label={`Show box score details for ${row.label}`} onClick={()=>setExpanded(expanded===row.id?null:row.id)} className="min-h-11 w-full break-words px-2 pt-2 text-left font-semibold hover:text-[#e49269]">{expanded===row.id?'▾':'▸'} {row.label}</button>
    <div role="row" className="grid grid-cols-6 gap-1 px-1 pb-3 text-center tabular-nums">{boxGroups[group].map(key=><span role="cell" key={key} className={key==='PTS'?'font-bold text-[#e49269]':''}>{stats[key]}</span>)}</div>
    {expanded===row.id&&<div className="space-y-3 border-t border-white/10 p-3"><dl className="grid grid-cols-3 gap-3">{Object.entries(stats).map(([key,value])=><div key={key}><dt className="text-[10px] text-[#c9c3b8]">{key}</dt><dd className="text-sm font-semibold">{value}</dd></div>)}</dl><h3 className="font-semibold">{canPlay?'Watch recorded plays':'Recorded plays'}</h3>{!row.entries.length&&<p className="text-[#c9c3b8]">No recorded plays.</p>}{row.entries.map(e=><button key={e.id} disabled={!canPlay} onClick={()=>onSeek(e.video_time_ms-5000)} className="block min-h-11 w-full rounded border border-white/10 px-2 text-left disabled:opacity-60">{Math.floor(e.video_time_ms/60000)}:{String(Math.floor(e.video_time_ms/1000)%60).padStart(2,'0')} · {STAT_NAMES[e.stat_type]||e.stat_type}</button>)}</div>}
   </div>})}
  </div>
 </section>
}
