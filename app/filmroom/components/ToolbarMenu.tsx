'use client'
import {useEffect,useRef,type ReactNode} from 'react'
export function ToolbarMenu({label,children,startOnSmall=false}:{label:string;children:ReactNode;startOnSmall?:boolean}){
 const ref=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))ref.current?.removeAttribute('open')};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[])
 return <details ref={ref} className="relative" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();ref.current?.removeAttribute('open');ref.current?.querySelector('summary')?.focus()}}}>
  <summary className="list-none cursor-pointer select-none min-h-9 flex items-center gap-1 rounded-lg border border-white/15 px-2 py-2 text-xs text-white/80 hover:bg-white/10">{label}<span aria-hidden>⌄</span></summary>
  <div className={`absolute bottom-full ${startOnSmall?'left-0 sm:left-auto sm:right-0':'right-0'} mb-2 z-50 w-64 max-w-[85vw] max-h-[60vh] overflow-y-auto rounded-xl border border-white/20 bg-[#20211e] p-3 shadow-xl space-y-3 text-xs text-white/80`} role="group" aria-label={label}>{children}</div>
 </details>
}
