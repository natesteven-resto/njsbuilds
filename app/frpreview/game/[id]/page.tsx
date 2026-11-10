'use client'
// DESIGN PREVIEW — mock data only, no account, no database. Lives on the filmroom-bento branch for QA; removed before merge.
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const GamePage = dynamic(() => import('@/app/filmroom/game/[id]/page'), { ssr: false })

const TEAM = 't-preview'
const PLAYERS = [
  { id: 'p3',  team_id: TEAM, name: 'Noah Steven',   number: 3,  position: 'G', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p5',  team_id: TEAM, name: 'Mason Reyes',   number: 5,  position: 'G', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p12', team_id: TEAM, name: 'Nathan Steven', number: 12, position: 'F', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p15', team_id: TEAM, name: 'Eli Brooks',    number: 15, position: 'F', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p23', team_id: TEAM, name: 'Ace Carter',    number: 23, position: 'G', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p24', team_id: TEAM, name: 'Duke Hale',     number: 24, position: 'C', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p30', team_id: TEAM, name: 'Sage Monroe',   number: 30, position: 'F', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'p33', team_id: TEAM, name: 'Owen Price',    number: 33, position: 'C', parent_email: null, created_at: '2026-01-01T00:00:00Z' },
]
const pj = (id: string) => { const p = PLAYERS.find(x => x.id === id)!; return { id: p.id, name: p.name, number: p.number } }
const stat = (id: string, player_id: string | null, stat_type: string, sec: number, shot?: [number, number]) => ({
  id, player_id, stat_type, video_time_ms: sec * 1000, game_id: 'preview', created_at: '2026-11-08T00:00:00Z',
  players: player_id ? pj(player_id) : null, shot_x: shot ? shot[0] : null, shot_y: shot ? shot[1] : null,
})
let STATS = [
  stat('s1', 'p23', '3M', 4,  [0.09, 0.07]), stat('s2', 'p12', '2M', 7, [0.5, 0.13]), stat('s3', 'p3', '2X', 9, [0.34, 0.3]),
  stat('s4', 'p24', 'DREB', 9.5), stat('s5', 'p23', 'AST', 11), stat('s6', 'p30', '3X', 12, [0.86, 0.42]),
  stat('s7', null, '2M', 14, [0.5, 0.11]), stat('s8', 'p5', 'STL', 15), stat('s9', 'p5', '2M', 16, [0.42, 0.09]),
  stat('s10', 'p12', 'FTM', 18), stat('s11', 'p12', 'FTX', 18.5), stat('s12', 'p15', '3M', 20, [0.5, 0.58]),
  stat('s13', 'p24', 'BLK', 21), stat('s14', 'p3', 'TO', 22), stat('s15', 'p23', '2M', 24, [0.62, 0.2]),
  stat('s16', 'p30', 'OREB', 25), stat('s17', 'p30', '2X', 25.5, [0.56, 0.1]), stat('s18', 'p33', 'FOUL', 27),
  stat('s19', null, '3M', 28, [0.14, 0.46]), stat('s20', 'p23', '3X', 30, [0.9, 0.08]),
]
let CLIPS = [
  { id: 'c1', game_id: 'preview', team_id: TEAM, start_time_ms: 3000, end_time_ms: 11000, title: 'Corner 3 off the flare screen', tags: ['Screening', 'spacing'], category: 'offense', is_highlight: true, drawing_data: null, created_at: '2026-11-08T00:00:00Z', parent_shared: true, play_type: 'Screening', players: [PLAYERS[4]] },
  { id: 'c2', game_id: 'preview', team_id: TEAM, start_time_ms: 13000, end_time_ms: 19000, title: 'Late closeout — fix the stance', tags: ['Closeout', 'Needs work'], category: 'defense', is_highlight: false, drawing_data: null, created_at: '2026-11-08T00:00:00Z', parent_shared: false, play_type: 'Closeout', coaching_note: 'Chop the feet, high hand.', players: [PLAYERS[0], PLAYERS[2]] },
  { id: 'c3', game_id: 'preview', team_id: TEAM, start_time_ms: 22000, end_time_ms: 29000, title: 'Push after the rebound', tags: ['Transition'], category: 'transition', is_highlight: false, drawing_data: null, created_at: '2026-11-08T00:00:00Z', parent_shared: true, play_type: 'Transition', players: [] },
]
const GAME = {
  id: 'preview', team_id: TEAM, opponent: 'Lincoln Prep', game_date: '2026-11-07', location: 'Home', video_url: 'preview-video', video_id: null,
  thumbnail_url: null, notes: null, created_at: '2026-11-07T00:00:00Z', resume_position_ms: 0, season_label: 'Winter 2026', session_type: 'game',
  review_meta: { bookmarks: [{ id: 'b1', label: 'Zone look', period: 'Q2', clock: '4:12', position_ms: 12000 }] },
}

function installMock() {
  const w = window as unknown as { __frMock?: boolean }
  if (w.__frMock) return
  w.__frMock = true
  const real = window.fetch.bind(window)
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  let seq = 100
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!url.startsWith('/api/filmroom/')) return real(input, init)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    const path = url.split('?')[0]
    await new Promise(r => setTimeout(r, 120)) // feel like a network
    if (path.startsWith('/api/filmroom/games/')) return method === 'GET' ? json(GAME) : json({ ok: true })
    if (path === '/api/filmroom/clips' && method === 'GET') return json(CLIPS)
    if (path === '/api/filmroom/clips' && method === 'POST') {
      const clip = { id: 'c' + (++seq), ...body, players: PLAYERS.filter(p => (body.player_ids ?? []).includes(p.id)), created_at: new Date().toISOString() }
      CLIPS = [...CLIPS, clip]; return json(clip)
    }
    if (path.startsWith('/api/filmroom/clips/')) {
      const id = path.split('/').pop()!
      if (method === 'DELETE') { CLIPS = CLIPS.filter(c => c.id !== id); return json({ ok: true }) }
      if (method === 'PATCH') { CLIPS = CLIPS.map(c => c.id === id ? { ...c, ...body } : c); return json(CLIPS.find(c => c.id === id)) }
    }
    if (path === '/api/filmroom/players') return json(PLAYERS)
    if (path === '/api/filmroom/stat-entries') {
      if (method === 'GET') return json(STATS)
      if (method === 'POST') {
        const e = stat('s' + (++seq), body.player_id ?? null, body.stat_type, body.video_time_ms / 1000, body.shot_x != null ? [body.shot_x, body.shot_y] : undefined)
        STATS = [...STATS, e]; return json(e)
      }
      if (method === 'DELETE') { const id = new URL(url, location.origin).searchParams.get('id'); STATS = STATS.filter(s => s.id !== id); return json({ ok: true }) }
    }
    if (path === '/api/filmroom/video-token') return json({ type: 'r2-session', src: '/filmroom-transition.mp4', refreshAfterSeconds: 3600, sourceVersion: 'preview-1' })
    if (path === '/api/filmroom/playback') return json({ enabled: false, state: 'none', progress: 0 })
    if (path === '/api/filmroom/playlists') return json([{ id: 'pl1', name: 'Defense teaching tape', clip_count: 4 }])
    if (path === '/api/filmroom/comments') return json([])
    if (path === '/api/filmroom/profile') return json({ error: 'preview' }, 404)
    return json({ error: 'preview: unmocked ' + method + ' ' + path }, 404)
  }
}

// ?auto=stat1|stat2|stat3|clip|save drives the UI into a state for screenshots (QA only).
function runAuto(auto: string, isCancelled: () => boolean) {
  const key = (k: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
  const byText = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('button')).find(el => el.textContent?.trim() === text)
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const waitFor = async (fn: () => boolean, ms = 8000) => { const t0 = Date.now(); while (!fn()) { if (isCancelled() || Date.now() - t0 > ms) throw new Error('timeout'); await sleep(100) } }
  return (async () => {
    await waitFor(() => !!document.querySelector('video'))
    const video = document.querySelector('video')!
    await waitFor(() => video.readyState >= 1)
    await sleep(300)
    if (auto.startsWith('stat')) {
      key('t'); await sleep(350)
      if (auto === 'stat2' || auto === 'stat3') { byText('3PT Made')?.click(); await sleep(300) }
      if (auto === 'stat3') { document.querySelector<HTMLElement>('button[aria-label="#23 Ace Carter"]')?.click(); await sleep(300) }
    } else if (auto === 'clip' || auto === 'save') {
      video.currentTime = 0.8; await sleep(250); key('i'); await sleep(250)
      video.currentTime = 3.4; await sleep(250); key('o'); await sleep(250)
      if (auto === 'save') { key('s'); await sleep(300) }
    }
  })()
}

export default function PreviewGame() {
  const [ready, setReady] = useState(false)
  useEffect(() => { installMock(); const t = setTimeout(() => setReady(true), 0); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (!ready) return
    const auto = new URLSearchParams(location.search).get('auto')
    if (!auto) return
    let cancelled = false
    runAuto(auto, () => cancelled).catch(() => {})
    return () => { cancelled = true }
  }, [ready])
  if (!ready) return null
  return (
    <>
      <div className="fixed bottom-2 right-2 z-[100] rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: 'rgba(198,106,62,0.9)', color: '#181917' }}>DESIGN PREVIEW · mock data</div>
      <GamePage />
    </>
  )
}
