'use client'
import type {Player} from '@/types/filmroom'
export function QuickTagDock({players,selectedPlayer,onPlayer,stats,onTag,busy,canUndo,canRedo,onUndo,onRedo,onClose,onDetails,message,error,fullscreen}:{
 players:Player[];selectedPlayer:string;onPlayer:(id:string)=>void;stats:{key:string;label:string;col:string}[];
 onTag:(stat:string)=>void;busy:boolean;canUndo:boolean;canRedo:boolean;onUndo:()=>void;onRedo:()=>void;onClose:()=>void;onDetails:()=>void;message:string;error:string|null;fullscreen:boolean
}){
 const player=selectedPlayer==='__opp__'?'Opponent':players.find(p=>p.id===selectedPlayer)
 const name=typeof player==='string'?player:player?`${player.number!==null?'#'+player.number+' ':''}${player.name}`:''
 return <section aria-label="Quick stat tagging" className={`shrink-0 border-t border-white/15 bg-[#20211e] px-4 py-3 ${fullscreen?'max-h-[34dvh]':'max-h-80'} overflow-y-auto`}>
  <div className="flex flex-wrap items-center gap-2 mb-2">
   <h2 className="text-sm font-semibold mr-1">Quick stats</h2>
   <select aria-label="Player to tag" value={selectedPlayer} onChange={e=>onPlayer(e.target.value)} disabled={busy} className="min-h-10 max-w-full rounded border border-white/20 bg-[#181917] px-2 text-sm disabled:opacity-50">
    <option value="">Choose a player</option>{players.map(p=><option key={p.id} value={p.id}>{p.number!==null?'#'+p.number+' ':''}{p.name}</option>)}<option value="__opp__">Opponent</option>
   </select>
   <button disabled={!canUndo||busy} onClick={onUndo} className="min-h-10 rounded border border-white/20 px-3 text-xs disabled:opacity-35">Undo last stat</button>
   <button disabled={!canRedo||busy} onClick={onRedo} className="min-h-10 rounded border border-white/20 px-3 text-xs disabled:opacity-35">Redo</button>
   <button disabled={busy} onClick={onDetails} className="min-h-10 px-2 text-xs text-white/65 disabled:opacity-35">Shot location / details</button>
   <button onClick={onClose} aria-label="Close quick stats" className="ml-auto min-h-10 px-3 text-xs text-white/70">Close</button>
  </div>
  <div className="flex flex-wrap gap-1.5">{stats.map(stat=><button key={stat.key} disabled={!name||busy} onClick={e=>{onTag(stat.key);if(e.detail>0)e.currentTarget.blur()}} aria-label={`Record ${stat.label}${name?' for '+name:''}`} className={`min-h-10 rounded-md border px-3 text-xs font-medium disabled:opacity-35 ${stat.col==='made'?'border-[#c66a3e]/50 bg-[#c66a3e]/15 text-[#f1b18c]':stat.col==='miss'?'border-white/15 text-white/65':'border-white/25 text-white/90 hover:bg-white/10'}`}>{stat.label}</button>)}</div>
  <p role={error?'alert':'status'} className={`mt-2 min-h-4 text-xs ${error?'text-red-300':'text-white/60'}`}>{error||(busy?'Saving…':message)||'Choose a player, then tap stats while watching. Tags save 2 seconds earlier.'}</p>
 </section>
}
