'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Film, Plus, Search, ArrowUpRight, Play, ListVideo, Loader2, Trash2, X, RefreshCw } from 'lucide-react'
import { AccountBar } from './components/AccountBar'
import { CsHeader, VideoThumbnail, gameSeason, formatGameDate } from './components/cs-shared'
import { GameMetadata } from './components/GameMetadata'
import {shouldOpenFamily,selectOwnedTeam,savedCoachTeam,rememberCoachTeam} from '@/lib/filmroom-navigation'
import type { Game } from '@/types/filmroom'

type LibraryGame = Game & { clip_count: number | null; highlight_count: number; resume_position_ms?: number }
type LibraryPlaylist = { id: string; name: string; clip_count: number }
const control = 'min-h-11 rounded-md border border-[#eee9df]/15 bg-[#20211e] px-3 text-sm text-[#eee9df] focus:outline-2 focus:outline-[#e49269]'
const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#c66a3e] px-4 text-sm font-bold text-[#181917] hover:bg-[#df885c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e49269] disabled:opacity-50'
function time(ms: number) { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

function AddGame({ teamId, close, created }: { teamId: string; close: () => void; created: (g: Game) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState({ opponent: '', game_date: new Date().toLocaleDateString('en-CA'), location: '', notes: '', session_type: 'game', season_label: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await fetch('/api/filmroom/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, opponent: form.opponent.trim(), game_date: form.game_date, location: form.location.trim() || null, notes: form.notes.trim() || null, session_type: form.session_type, season_label: form.season_label.trim() }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to add game. Please try again.')
      created(data); close()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add game.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} onCancel={close} aria-labelledby="new-game-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#eee9df]/20 bg-[#20211e] p-6 text-[#eee9df] backdrop:bg-black/75">
    <div className="mb-5 flex items-center justify-between"><h2 id="new-game-title" className="text-3xl font-bold uppercase" style={{ fontFamily: 'var(--font-bc)' }}>Add game</h2><button type="button" onClick={close} aria-label="Close add game" className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" /></button></div>
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="opponent" className="mb-1 block text-sm text-[#c9c3b8]">Opponent or session name</label><input autoFocus id="opponent" required maxLength={160} value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="Opponent, practice, or tryouts" className={`${control} w-full`} /></div>
      <div><label htmlFor="game_date" className="mb-1 block text-sm text-[#c9c3b8]">Game date</label><input id="game_date" type="date" required value={form.game_date} onChange={e => setForm({ ...form, game_date: e.target.value })} className={`${control} w-full [color-scheme:dark]`} /></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Film type<select className={`${control} mt-1 w-full`} value={form.session_type} onChange={e=>setForm({...form,session_type:e.target.value})}><option value="game">Game</option><option value="practice">Practice</option><option value="scouting">Opponent scouting</option></select></label><label className="text-sm">Season<input maxLength={60} placeholder="e.g. Summer 2026" className={`${control} mt-1 w-full`} value={form.season_label} onChange={e=>setForm({...form,season_label:e.target.value})}/></label></div>
      <div><label htmlFor="location" className="mb-1 block text-sm text-[#c9c3b8]">Location <span className="text-[#aaa89f]">(optional)</span></label><input id="location" maxLength={200} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={`${control} w-full`} /></div>
      <div><label htmlFor="notes" className="mb-1 block text-sm text-[#c9c3b8]">Notes <span className="text-[#aaa89f]">(optional)</span></label><textarea id="notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${control} w-full py-2`} /></div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <p className="text-xs text-[#aaa89f]">Your game is private. Add its video on the next screen.</p>
      <button disabled={busy} className={`${action} w-full`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add game</button>
    </form>
  </dialog>
}

function GameCard({ game, removed }: { game: LibraryGame; removed: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (!window.confirm(`Delete ${game.opponent} and its clips and stats? This cannot be undone.`)) return
    setBusy(true); setError('')
    try {
      const r = await fetch(`/api/filmroom/games/${game.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Could not delete game. Please try again.')
      removed(game.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); setBusy(false) }
  }
  return <article className="group relative overflow-hidden rounded-md border border-[#eee9df]/10 bg-[#1e1f1d] transition-colors hover:border-[#c66a3e]/65">
    <Link href={`/filmroom/game/${game.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e49269]">
      {game.video_url ? <VideoThumbnail gameId={game.id} className="aspect-video" /> : <div className="flex aspect-video items-center justify-center gap-2 bg-[#131411] text-sm text-[#aaa89f]"><Film className="h-5 w-5" />Awaiting film</div>}
      <div className="p-4">{game.is_demo&&<p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#e49269]">Demo · Practice the tools</p>}
        <h3 className="pr-8 text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-bc)' }}>{game.opponent}</h3>
        <p className="mt-1 text-xs text-[#aaa89f]">{formatGameDate(game.game_date)}{game.location ? ` · ${game.location}` : ''}</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#eee9df]/10 pt-3 text-xs text-[#c9c3b8]">
          <span>{game.clip_count === null ? 'Clip count unavailable' : `${game.clip_count} ${game.clip_count === 1 ? 'clip' : 'clips'}`}</span>
          <span className="flex items-center gap-1 text-[#e49269]">{(game.resume_position_ms || 0) > 0 ? `Resume ${time(game.resume_position_ms!)}` : game.video_url ? 'Review film' : 'Add video'}<ArrowUpRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </Link>
    {!game.is_demo&&<button aria-label={`Delete game vs ${game.opponent}`} onClick={remove} disabled={busy} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-md bg-[#181917]/85 text-[#c9c3b8] hover:bg-red-950 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-[#e49269]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}
    <GameMetadata game={game}/>
    {error && <p role="alert" className="px-4 pb-3 text-xs text-red-300">{error}</p>}
  </article>
}

export default function FilmRoomLibrary() {
  const router = useRouter()
  const [allGames, setGames] = useState<LibraryGame[]>([])
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([])
  const [playlistError, setPlaylistError] = useState(false)
  const [teams,setTeams]=useState<{id:string;name:string}[]>([])
  const [hasFamily,setHasFamily]=useState(false)
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [season, setSeason] = useState('all')
  const [filter, setFilter] = useState('all')
  const [filmType,setFilmType]=useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [billing,setBilling]=useState<{enabled:boolean;canUpload?:boolean;gameCount?:number;usedBytes?:number}|null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    const json = async (path: string, options?: RequestInit) => {
      const r = await fetch(path, { ...options, signal: abort.signal })
      if (r.status === 401) { router.replace('/filmroom/login'); throw new Error('Please sign in.') }
      if (!r.ok) throw new Error('Could not load your library. Please try again.')
      return r.json()
    }
    const load = async () => {
      setLoading(true); setError(''); setGames([]); setTeam(null); setPlaylists([])
      try {
        const [g, teams, plan, family] = await Promise.all([json('/api/filmroom/games'), json('/api/filmroom/teams'),json('/api/filmroom/billing'),json('/api/filmroom/family')])
        if (!Array.isArray(g) || !Array.isArray(teams)) throw new Error('Unexpected library response.')
        const invited=family.invitations?.length>0||family.games?.length>0
        setHasFamily(invited)
        if(shouldOpenFamily(invited,g.some((game:Game)=>!game.is_demo),new URLSearchParams(location.search).get('view')==='coach',!!plan.canUpload)){router.replace('/filmroom/family');return}
        setBilling(plan)
        if (!Array.isArray(g) || !Array.isArray(teams)) throw new Error('Unexpected library response.')
        const ownTeam = selectOwnedTeam(teams,savedCoachTeam()) || await json('/api/filmroom/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'My Team', season: gameSeason(new Date().toLocaleDateString('en-CA')), sport: 'basketball' }) })
        const loaded: LibraryGame[] = g.map((game: LibraryGame) => ({...game,clip_count:game.clip_count ?? null,highlight_count:game.highlight_count ?? 0}))
        if (abort.signal.aborted) return
        setTeams(teams.length?teams:[ownTeam]);setTeam(ownTeam); setGames(loaded)
        try {
          const p = await json('/api/filmroom/playlists')
          if (!abort.signal.aborted) { setPlaylists(Array.isArray(p) ? p : []); setPlaylistError(false) }
        } catch { if (!abort.signal.aborted) setPlaylistError(true) }
      } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load your library.') }
      finally { if (!abort.signal.aborted) setLoading(false) }
    }
    load()
    return () => abort.abort()
  }, [router, reload])
  const removed = useCallback((id: string) => { setGames(g => g.filter(x => x.id !== id)); setReload(n => n + 1) }, [])
  const games=allGames.filter(g=>g.team_id===team?.id)
  const seasons = [...new Set(games.map(g => (g.season_label || gameSeason(g.game_date))))].sort().reverse()
  const filtered = games.filter(g => (filmType==='all'||g.session_type===filmType) && (season === 'all' || (g.season_label || gameSeason(g.game_date)) === season) && (!search || g.opponent.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || (filter === 'film' ? !!g.video_url : !g.video_url)))
  const resume = [...games].sort((a,b)=>(b.last_watched_at||'').localeCompare(a.last_watched_at||'')).find(g => g.video_url && (g.resume_position_ms || 0) > 0)
  const featured = resume || games.find(g => g.video_url)
  const clipCount = games.every(g => g.clip_count !== null) ? games.reduce((n, g) => n + (g.clip_count || 0), 0) : null
  return <div className="cs min-h-screen bg-[#181917] text-[#eee9df]">
    <CsHeader active="library" right={<AccountBar />} />
    <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-7 sm:px-8 sm:pt-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-[#c9c3b8]">Your private film library</p><h1 className="text-5xl font-black uppercase leading-none sm:text-6xl" style={{ fontFamily: 'var(--font-bc)' }}>{team?.name || 'Film Room'}</h1><label className="mt-4 block text-sm text-[#c9c3b8]">Coach team<select aria-label="Switch coach team" value={team?.id||''} onChange={e=>{setTeam(selectOwnedTeam(teams,e.target.value));rememberCoachTeam(e.target.value);setSearch('');setSeason('all');setFilter('all');setFilmType('all')}} className={control+" ml-3"}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><Link href="/filmroom/settings#team" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#e49269]">Edit team ↗</Link></div>
        {billing?.enabled&&!billing.canUpload?<Link href="/filmroom/billing" className={action}>Subscribe · $25/month</Link>:<button onClick={() => setShowAdd(true)} disabled={!team || loading || !!(billing?.enabled&&(billing.gameCount||0)>=50)} className={action}><Plus className="h-4 w-4" />Add game</button>}
      </div>
      {hasFamily&&<Link href="/filmroom/family" className="mb-5 inline-flex min-h-11 items-center rounded border border-[#e49269]/40 px-4 text-[#e49269]">Parent view · Games shared with me →</Link>}
      {billing?.enabled&&<p className="mb-5 text-sm text-[#c9c3b8]">{billing.canUpload?`${billing.gameCount} / 50 games · ${((billing.usedBytes||0)/1e9).toFixed(1)} / 500 GB`:'Explore your demo game. Subscribe to add your own film.'} <Link href="/filmroom/billing" className="ml-2 text-[#e49269] underline">Plan & billing</Link></p>}
      {loading ? <div role="status" className="flex items-center gap-3 py-16 text-[#c9c3b8]"><Loader2 className="h-5 w-5 animate-spin" />Loading your library…</div> : error ? <div role="alert" className="rounded-md border border-red-300/30 p-6"><p className="text-red-200">{error}</p><button onClick={() => setReload(n => n + 1)} className={`${control} mt-4 inline-flex items-center gap-2`}><RefreshCw className="h-4 w-4" />Try again</button></div> : <>
        <div className="mb-7 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#eee9df]/10 py-3 text-xs uppercase tracking-wider text-[#aaa89f]">
          <span><b className="mr-2 text-base text-[#eee9df]">{games.length}</b>{games.length===1?'Game':'Games'}</span><span><b className="mr-2 text-base text-[#eee9df]">{games.filter(g => g.video_url).length}</b>With film</span><span><b className="mr-2 text-base text-[#eee9df]">{clipCount ?? '—'}</b>{clipCount===1?'Clip':'Clips'}</span><span><b className="mr-2 text-base text-[#eee9df]">{games.reduce((n, g) => n + g.highlight_count, 0)}</b>Highlights</span>
        </div>
        <div className="mb-9 grid gap-6 lg:grid-cols-[minmax(0,2.4fr)_minmax(240px,1fr)]">
          {featured ? <section className="overflow-hidden rounded-md border border-[#eee9df]/10 bg-[#20211e]">
            <div className="flex items-center justify-between px-5 py-3 text-xs uppercase tracking-wider text-[#c9c3b8]"><h2>{resume ? 'Continue watching' : 'Ready for review'}</h2><span>{featured.season_label || gameSeason(featured.game_date)}</span></div>
            <Link href={`/filmroom/game/${featured.id}`} className="group grid focus-visible:outline-2 focus-visible:outline-[#e49269] sm:grid-cols-[1.55fr_1fr]">
              <VideoThumbnail gameId={featured.id} className="aspect-video h-full min-h-[200px]" />
              <div className="flex flex-col justify-center p-5 sm:p-7"><p className="mb-2 text-xs text-[#aaa89f]">{formatGameDate(featured.game_date)}</p><h3 className="text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: 'var(--font-bc)' }}>{featured.opponent}</h3>
                <span className={`${action} mt-5 self-start`}><Play className="h-4 w-4" />{resume ? `Resume at ${time(featured.resume_position_ms || 0)}` : 'Review film'}</span><p className="mt-3 text-xs text-[#aaa89f]">{featured.clip_count === null ? 'Your game film' : `${featured.clip_count} saved ${featured.clip_count === 1 ? 'clip' : 'clips'}`}</p>
              </div>
            </Link>
          </section> : <section className="flex min-h-[230px] flex-col items-start justify-center rounded-md border border-dashed border-[#eee9df]/25 p-7"><Film className="mb-4 h-7 w-7 text-[#c66a3e]" /><h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-bc)' }}>Your next film session starts here.</h2><p className="mt-2 max-w-md text-sm text-[#c9c3b8]">Add a game or practice, upload the film, and turn the moments that matter into teaching clips.</p></section>}
          <section className="flex flex-col border-y border-[#eee9df]/10 py-4 lg:border-y-0 lg:border-l lg:pl-6">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[.15em] text-[#c9c3b8]">Playlists · all teams</h2><Link href="/filmroom/playlists" aria-label="View all playlists" className="flex h-11 w-11 items-center justify-center text-[#e49269]"><ArrowUpRight className="h-5 w-5" /></Link></div>
            {playlistError ? <p className="text-sm text-[#c9c3b8]">Playlists could not be loaded. Open Playlists to try again.</p> : playlists.length ? <div className="divide-y divide-[#eee9df]/10">{playlists.slice(0, 3).map(p => <Link key={p.id} href={`/filmroom/playlists/${p.id}`} className="flex min-h-[65px] items-center gap-3 py-3"><ListVideo className="h-5 w-5 shrink-0 text-[#c66a3e]" /><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{p.name}</h3><p className="mt-1 text-xs text-[#aaa89f]">{p.clip_count} {p.clip_count === 1 ? 'clip' : 'clips'}</p></div></Link>)}</div> : <><ListVideo className="mb-3 h-6 w-6 text-[#c66a3e]" /><p className="text-lg font-semibold">Build your next film session.</p><p className="mt-2 text-sm leading-relaxed text-[#aaa89f]">Collect clips across games, put them in order, and teach one point at a time.</p><Link href="/filmroom/playlists" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#e49269]">Create a playlist<ArrowUpRight className="h-4 w-4" /></Link></>}
          </section>
        </div>
        <section aria-labelledby="games-title"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="games-title" className="text-3xl font-bold uppercase" style={{ fontFamily: 'var(--font-bc)' }}>Game film <span className="ml-2 text-xl text-[#aaa89f]">{filtered.length}</span></h2><div className="flex w-full flex-wrap gap-2 sm:w-auto"><label className={`${control} flex min-w-0 flex-1 items-center gap-2`}><Search className="h-4 w-4 shrink-0 text-[#aaa89f]" /><input aria-label="Search games" type="search" placeholder="Search games" value={search} onChange={e => setSearch(e.target.value)} className="w-full min-w-0 bg-transparent py-2 outline-none sm:w-40" /></label><select aria-label="Filter by film type" value={filmType} onChange={e=>setFilmType(e.target.value)} className={control}><option value="all">All film types</option><option value="game">Games</option><option value="practice">Practices</option><option value="scouting">Opponent scouting</option></select><select aria-label="Filter by season" value={season} onChange={e => setSeason(e.target.value)} className={control}><option value="all">All seasons</option>{seasons.map(s => <option key={s}>{s}</option>)}</select><select aria-label="Filter by video availability" value={filter} onChange={e => setFilter(e.target.value)} className={control}><option value="all">All games</option><option value="film">With film</option><option value="empty">No film</option></select></div></div>
          {filtered.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(g => <GameCard key={g.id} game={g} removed={removed} />)}</div> : <p className="border-t border-[#eee9df]/10 py-10 text-sm text-[#aaa89f]">{games.length ? 'No games match these filters.' : 'Your library is ready for its first game.'}</p>}
        </section>
      </>}
    </main>
    {showAdd && team && <AddGame teamId={team.id} close={() => setShowAdd(false)} created={g => router.push(`/filmroom/game/${g.id}`)} />}
  </div>
}
