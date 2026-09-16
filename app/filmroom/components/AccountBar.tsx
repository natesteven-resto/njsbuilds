 'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {UserRound,Settings,HelpCircle} from 'lucide-react'
import {getSupabaseBrowser} from '@/lib/filmroom-supabase-browser'
import {LogoutButton} from './LogoutButton'
export function AccountBar(){
 const [email,setEmail]=useState('');const [name,setName]=useState('');const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{let active=true;getSupabaseBrowser().auth.getSession().then(({data})=>{if(active)setEmail(data.session?.user.email||'')});fetch('/api/filmroom/profile').then(r=>r.ok?r.json():null).then(d=>{if(active&&d)setName(d.name)}).catch(()=>{});return()=>{active=false}},[])
 useEffect(()=>{const refresh=()=>{fetch('/api/filmroom/profile').then(r=>r.ok?r.json():null).then(d=>{if(d)setName(d.name)}).catch(()=>{})};window.addEventListener('filmroom-profile-updated',refresh);return()=>window.removeEventListener('filmroom-profile-updated',refresh)},[])
 useEffect(()=>{if(!open)return;const click=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);ref.current?.querySelector('button')?.focus()}};document.addEventListener('pointerdown',click);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',click);document.removeEventListener('keydown',key)}},[open])
 if(!email)return null
 const initials=(name||email).split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()
 return <div ref={ref} className="relative ml-2 shrink-0"><button aria-label="Open profile and settings" aria-expanded={open} onClick={()=>setOpen(!open)} className="flex min-h-11 items-center gap-2 rounded-full border border-[#eee9df]/20 px-3 text-sm text-[#eee9df]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c66a3e]/20 text-xs font-bold text-[#e49269]">{initials}</span><span className="hidden sm:inline">Profile</span></button>{open&&<div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-[#eee9df]/20 bg-[#20211e] p-3 text-[#eee9df] shadow-xl"><p className="truncate font-semibold">{name||'Coach'}</p><p className="mb-3 truncate text-xs text-[#c9c3b8]">{email}</p><Link href="/filmroom/settings" className="flex min-h-11 items-center gap-2"><UserRound size={16}/>Profile & settings</Link><Link href="/filmroom/settings#team" className="flex min-h-11 items-center gap-2"><Settings size={16}/>Team settings</Link><Link href="/filmroom/settings#help" className="flex min-h-11 items-center gap-2"><HelpCircle size={16}/>Help & shortcuts</Link><div className="mt-2 border-t border-white/10 pt-3"><LogoutButton/></div></div>}</div>
}
